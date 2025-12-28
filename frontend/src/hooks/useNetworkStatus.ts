import { useEffect, useState } from "react";

export interface NetworkStatus {
  isOnline: boolean;
  isBackOnline: boolean; // True briefly when reconnecting (for toast notification)
}

/**
 * Hook to detect network connectivity changes
 *
 * Features:
 * - Detects online/offline via navigator.onLine
 * - Listens to online/offline events
 * - Provides isBackOnline flag for showing "reconnected" notifications
 *
 * Browser support: 98%+ (all modern browsers)
 *
 * Limitations:
 * - navigator.onLine can give false positives (connected to WiFi but no internet)
 * - Does NOT detect if API server is down (only client network status)
 * - For server status, use separate health check polling
 *
 * @returns {NetworkStatus} Current network status
 */

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isBackOnline, setIsBackOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsBackOnline(true);

      // Clear isBackOnline after 3 seconds (enough time to show toast)
      setTimeout(() => {
        setIsBackOnline(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsBackOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline, isBackOnline };
}
