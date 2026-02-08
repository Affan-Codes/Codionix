import { API_BASE_URL, API_TIMEOUT } from "@/constants";
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

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// ===================================
// CSRF TOKEN MANAGEMENT
// ===================================

/**
 * Get CSRF token from cookie
 * Frontend reads this token and sends it in X-CSRF-Token header
 */
function getCsrfToken(): string | null {
  const match = document.cookie.match(/csrf_token=([^;]+)/);
  return match ? match[1] : null;
}

// ===================================
// REFRESH TOKEN MANAGEMENT
// ===================================

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
    // Add CSRF token to non-GET requests
    if (
      !["GET", "HEAD", "OPTIONS"].includes(config.method?.toUpperCase() || "")
    ) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        config.headers["X-CSRF-Token"] = csrfToken;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// ===================================
// RESPONSE INTERCEPTOR
// ===================================

apiClient.interceptors.response.use(
  (response) => response,
  async (error: any) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;

    // Network error handling
    if (!error.response && error.code === "ERR_NETWORK") {
      return Promise.reject({
        ...error,
        userMessage:
          "Network error. Check your internet connection and try again.",
        isNetworkError: true,
      });
    }

    // Rate limit handling
    if (error.response?.status === 429) {
      const resetTime = error.response.headers["ratelimit-reset"];
      let retryAfterMinutes: number | null = null;

      if (resetTime) {
        const now = Math.floor(Date.now() / 1000);
        const resetTimestamp = parseInt(resetTime, 10);
        const secondsLeft = Math.max(0, resetTimestamp - now);
        retryAfterMinutes = Math.ceil(secondsLeft / 60);
      }

      return Promise.reject({
        ...error,
        userMessage: retryAfterMinutes
          ? `Too many requests. Try again in ${retryAfterMinutes} minute${retryAfterMinutes === 1 ? "" : "s"}.`
          : "Too many requests. Please try again later.",
        isRateLimitError: true,
        retryAfterMinutes,
      });
    }

    // Server error handling (no auto-retry - let backend infrastructure handle retries)
    const isServerError =
      error.response?.status >= 500 && error.response?.status < 600;

    if (isServerError) {
      return Promise.reject({
        ...error,
        userMessage:
          "Server is temporarily unavailable. Please try again in a moment.",
        isServerError: true,
      });
    }

    // Timeout handling
    if (error.code === "ECONNABORTED" || error.code === "ERR_TIMEOUT") {
      return Promise.reject({
        ...error,
        userMessage:
          "Request timed out. Check your connection or try again later.",
        isTimeout: true,
      });
    }

    // 401 Unauthorized - Token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
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

      try {
        console.info("Refreshing access token...");

        // Call refresh endpoint - new cookies will be set automatically
        const { authApi } = await import("@/api/auth.api");
        await authApi.refreshToken();

        // Process queued requests
        processQueue(null, "cookie");
        isRefreshing = false;

        // Retry original request (new cookies already set)
        return apiClient(originalRequest);
      } catch (refreshError: any) {
        processQueue(refreshError, null);
        isRefreshing = false;

        //  Clear stale cookies before any redirect
        const clearCookie = (name: string) => {
          document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
        };

        // If refresh failed with 401, force logout
        if (refreshError.response?.status === 401) {
          clearCookie("refresh_token");
          clearCookie("access_token");
          clearCookie("csrf_token");

          window.location.href = "/login";
          return Promise.reject(refreshError);
        }

        // Network/server error during refresh - keep old token, user can retry
        if (!refreshError.response || refreshError.response?.status >= 500) {
          console.warn(
            "Token refresh failed due to network/server error. Keeping old token for retry.",
          );

          // Return enriched error for UI handling
          return Promise.reject({
            ...refreshError,
            userMessage:
              "Connection issue while refreshing session. Please try again.",
            isRefreshNetworkError: true,
          });
        }

        // Other refresh errors - force logout
        clearCookie("refresh_token");
        clearCookie("access_token");
        clearCookie("csrf_token");

        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
