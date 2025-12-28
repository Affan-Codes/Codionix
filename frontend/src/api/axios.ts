import { API_BASE_URL, API_TIMEOUT, STORAGE_KEYS } from "@/constants";
import axios, { type InternalAxiosRequestConfig } from "axios";

// ===================================
// TYPE EXTENSIONS
// ===================================

/**
 * Extend Axios config to support custom metadata
 * Used for tracking request deduplication keys and retry counts
 */
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: {
    requestKey: string;
  };
  _retry?: boolean;
  _retryCount?: number;
}

// ===================================
// REQUEST DEDUPLICATION
// ===================================

/**
 * Track in-flight requests to prevent duplicate API calls
 *
 * Problem: Without this, navigating /projects/123 → /projects → /projects/123
 * triggers duplicate GET /projects/123 calls if done quickly.
 *
 * Solution: Store pending requests by URL+method. If same request is made
 * while previous is still pending, return the same Promise.
 *
 * CRITICAL: Only dedupe GET requests. POST/PUT/DELETE must always execute.
 */
interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

const pendingRequests = new Map<string, PendingRequest>();

/**
 * Generate unique key for request deduplication
 * Format: METHOD:URL?params
 */
const getRequestKey = (config: CustomAxiosRequestConfig): string => {
  const params = config.params
    ? `?${new URLSearchParams(config.params).toString()}`
    : "";
  return `${config.method?.toUpperCase()}:${config.url}${params}`;
};

/**
 * Check if request is dedupeable (only GET requests)
 */
const isDedupeable = (config: CustomAxiosRequestConfig): boolean => {
  return config.method?.toUpperCase() === "GET";
};

/**
 * Clean up stale pending requests (older than 30 seconds)
 * Prevents memory leaks from abandoned requests
 */
const cleanupStalePendingRequests = () => {
  const now = Date.now();
  const STALE_THRESHOLD = 30000; // 30 seconds

  for (const [key, request] of pendingRequests.entries()) {
    if (now - request.timestamp > STALE_THRESHOLD) {
      pendingRequests.delete(key);
    }
  }
};

// Run cleanup every 60 seconds
setInterval(cleanupStalePendingRequests, 60000);

// ===================================
// SIMPLE CACHE
// ===================================

/**
 * In-memory cache for GET requests
 *
 * Strategy: Cache successful GET responses for 5 minutes
 * - Reduces redundant API calls for frequently accessed data
 * - Improves UX on slow connections
 * - Zero external dependencies
 *
 * Trade-offs:
 * - Data can be stale for up to 5 minutes
 * - Cache cleared on page refresh (acceptable for MVP)
 * - No cross-tab synchronization (acceptable for MVP)
 *
 * Future: Replace with React Query for sophisticated caching
 */
interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached response if valid
 */
const getCachedResponse = (key: string): any | null => {
  const entry = cache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return entry.data;
};

/**
 * Store response in cache
 */
const setCachedResponse = (key: string, data: any): void => {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
};

/**
 * Invalidate cache entries matching pattern
 *
 * Example: After creating project, invalidate GET:/projects*
 */
export const invalidateCache = (pattern?: string): void => {
  if (!pattern) {
    // Clear entire cache
    cache.clear();
    return;
  }

  // Clear matching entries
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
};

/**
 * Clean up stale cache entries (older than TTL)
 */
const cleanupStaleCache = () => {
  const now = Date.now();

  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupStaleCache, 5 * 60 * 1000);

// ===================================
// AXIOS INSTANCE
// ===================================

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

// Track if a token refresh is in progress
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

// Process all queued requests with new token
const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });

  failedQueue = [];
};

// ===================================
// REQUEST INTERCEPTOR
// ===================================

apiClient.interceptors.request.use(
  (config: CustomAxiosRequestConfig) => {
    // Add auth token
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Check cache for GET requests
    if (isDedupeable(config)) {
      const key = getRequestKey(config);

      // Check cache first
      const cachedResponse = getCachedResponse(key);
      if (cachedResponse) {
        // Return cached data wrapped in Axios response format
        return Promise.reject({
          config,
          response: {
            data: cachedResponse,
            status: 200,
            statusText: "OK",
            headers: {},
            config,
          },
          isAxiosError: false,
          isCacheHit: true, // Custom flag for debugging
        });
      }

      // Check if request already in flight
      const pending = pendingRequests.get(key);
      if (pending) {
        // Return existing promise (deduplication)
        return Promise.reject({
          config,
          isDuplicate: true, // Custom flag
          originalPromise: pending.promise,
        });
      }

      // Mark request as in-flight
      // We'll store the promise in response interceptor
      config.metadata = { requestKey: key };
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ===================================
// RESPONSE INTERCEPTOR
// ===================================

apiClient.interceptors.response.use(
  (response) => {
    const config = response.config as CustomAxiosRequestConfig;

    // Cache successful GET responses
    if (isDedupeable(config) && config.metadata?.requestKey) {
      const key = config.metadata.requestKey;
      setCachedResponse(key, response.data);
      pendingRequests.delete(key);
    }

    return response;
  },
  async (error: any) => {
    // Handle cache hits (not real errors)
    if (error.isCacheHit) {
      return Promise.resolve(error.response);
    }

    // Handle duplicates (return original promise)
    if (error.isDuplicate) {
      return error.originalPromise;
    }

    const originalRequest = error.config as CustomAxiosRequestConfig;

    // Clean up pending request on error
    if (originalRequest?.metadata?.requestKey) {
      pendingRequests.delete(originalRequest.metadata.requestKey);
    }

    // ===================================
    // NETWORK ERROR HANDLING
    // ===================================

    /**
     * Handle network errors (client offline, DNS failure, etc.)
     *
     * CRITICAL: Don't retry immediately - user might still be offline
     * Instead, reject with user-friendly error message
     */
    if (!error.response && error.code === "ERR_NETWORK") {
      return Promise.reject({
        ...error,
        userMessage:
          "Network error. Check your internet connection and try again.",
        isNetworkError: true,
      });
    }

    /**
     * Handle server errors (500, 502, 503, 504)
     *
     * Strategy: Retry once after 1 second for transient failures
     * Common causes: Server restart, deployment, database connection spike
     */
    const isServerError =
      error.response?.status >= 500 && error.response?.status < 600;
    const isRetryableMethod = ["GET", "HEAD", "OPTIONS"].includes(
      originalRequest?.method?.toUpperCase() || ""
    );

    if (isServerError && isRetryableMethod && !originalRequest._retry) {
      originalRequest._retry = true;
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

      // Only retry once to avoid infinite loops
      if (originalRequest._retryCount <= 1) {
        // Wait 1 second before retry (gives server time to recover)
        await new Promise((resolve) => setTimeout(resolve, 1000));

        return apiClient(originalRequest);
      }

      // Max retries exceeded - give up with user-friendly message
      return Promise.reject({
        ...error,
        userMessage:
          "Server is temporarily unavailable. Please try again in a moment.",
        isServerError: true,
      });
    }

    /**
     * Handle timeout errors (request took too long)
     *
     * Don't retry - if it timed out once, it'll likely timeout again
     * User might be on slow connection or server is overloaded
     */
    if (error.code === "ECONNABORTED" || error.code === "ERR_TIMEOUT") {
      return Promise.reject({
        ...error,
        userMessage:
          "Request timed out. Check your connection or try again later.",
        isTimeout: true,
      });
    }

    // If 401 and not already retried, try refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Another request is already refreshing the token
        // Queue this request until token is refreshed
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

      if (!refreshToken) {
        // No refresh token available, force logout
        isRefreshing = false;
        processQueue(new Error("No refresh token"), null);
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        // Attempt to refresh the token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } =
          response.data.data;

        // Update stored tokens
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);

        // Update authorization header for original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        // Process all queued requests
        processQueue(null, accessToken);

        isRefreshing = false;

        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, force logout
        processQueue(refreshError, null);
        isRefreshing = false;

        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
