import { API_BASE_URL, API_TIMEOUT, STORAGE_KEYS } from "@/constants";
import axios, { type InternalAxiosRequestConfig } from "axios";

// ===================================
// TYPE EXTENSIONS
// ===================================

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _retryCount?: number;
}

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
  (response) => response,
  async (error: any) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;

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
