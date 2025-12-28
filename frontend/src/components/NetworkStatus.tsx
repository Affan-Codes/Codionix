import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { WifiOffIcon } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Global network status banner
 *
 * Shows persistent banner when user goes offline
 * Shows toast notification when user comes back online
 *
 * CRITICAL: Must be mounted at app root level (in main.tsx)
 * so it persists across all routes
 *
 * UX Behavior:
 * - Offline: Shows sticky banner at top (doesn't auto-hide)
 * - Back online: Shows success toast (auto-hides after 3s) + removes banner
 */
export function NetworkStatus() {
  const { isOnline, isBackOnline } = useNetworkStatus();

  // Show toast when coming back online
  useEffect(() => {
    if (isBackOnline) {
      toast.success("You're back online", {
        description: "Connection restored. You can continue working.",
      });
    }
  }, [isBackOnline]);

  // Don't render anything if online
  if (isOnline) {
    return null;
  }

  // Show offline banner (sticky at top)
  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white px-4 py-3 shadow-lg"
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
        <WifiOffIcon className="h-5 w-5 shrink-0" />
        <p className="text-sm font-medium">
          You're offline. Check your internet connection.
        </p>
      </div>
    </div>
  );
}
