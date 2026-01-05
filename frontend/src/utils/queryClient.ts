import { QueryClient } from "@tanstack/react-query";

/**
 * Production-ready QueryClient configuration for TanStack Query
 *
 * CRITICAL DECISIONS EXPLAINED:
 *
 * 1. staleTime: 5 minutes
 *    - Data is "fresh" for 5min after fetch
 *    - No refetches during this window (even on component remount)
 *    - WHY: Prevents unnecessary API calls on navigation
 *    - ADJUST: Set to 0 for real-time data (e.g., chat, live scores)
 *
 * 2. gcTime: 10 minutes (RENAMED from cacheTime in v5)
 *    - Unused data stays in memory for 10min
 *    - WHY: User navigates back to cached page = instant load
 *    - ADJUST: Increase for slow connections, decrease if memory constrained
 *
 * 3. refetchOnWindowFocus: true
 *    - Refetch when user returns to tab (e.g., from checking email)
 *    - WHY: Ensures user sees latest data after being away
 *    - DISABLE: For admin dashboards where users keep tab open all day
 *
 * 4. refetchOnReconnect: true
 *    - Refetch when network connection restored
 *    - WHY: User's phone reconnects to WiFi = fresh data
 *
 * 5. retry: 1
 *    - Retry failed requests once before showing error
 *    - WHY: Handles transient network issues gracefully
 *    - ADJUST: Increase to 3 for flaky networks, 0 for instant feedback
 *
 * 6. retryDelay: exponential backoff
 *    - 1st retry: 1s, 2nd retry: 2s, 3rd retry: 4s
 *    - WHY: Gives server time to recover without hammering it
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // How long data is considered "fresh" (won't refetch)
      staleTime: 5 * 60 * 1000, // 5 minutes

      // How long inactive data stays in cache (v5 renamed from cacheTime)
      gcTime: 10 * 60 * 1000, // 10 minutes

      // Refetch when user returns to window/tab
      refetchOnWindowFocus: (query) => {
        // Skip refetch for fresh data
        const dataUpdatedAt = query.state.dataUpdatedAt;
        const now = Date.now();
        const age = now - dataUpdatedAt;
        const isStale = age >= 5 * 60 * 1000; // 5 minutes

        return isStale;
      },

      // Refetch when user reconnects to internet
      refetchOnReconnect: true,

      // Retry failed requests (1 retry = 2 total attempts)
      retry: 1,

      // Exponential backoff: 1s → 2s → 4s → 8s (max 30s)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Don't retry mutations by default (could cause duplicates)
      retry: 0,

      // Mutations have their own error handling in useMutation hooks
    },
  },
});
