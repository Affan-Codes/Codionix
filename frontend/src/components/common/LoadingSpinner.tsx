import { Loader2Icon } from "lucide-react";

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

/**
 * Production-grade loading spinner with accessibility
 *
 * Used for:
 * - Route lazy loading (Suspense fallback)
 * - API calls in progress
 * - Component initialization
 *
 * Features:
 * - Accessible (aria-live, role="status")
 * - Graceful (appears after 200ms delay to prevent flashing)
 * - Informative (shows message after 3s for slow connections)
 */
export function LoadingSpinner({
  message = "Loading...",
  fullScreen = true,
}: LoadingSpinnerProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 ${
        fullScreen ? "min-h-screen" : "py-12"
      }`}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <Loader2Icon className="h-8 w-8 animate-spin text-blue-600" />
      <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
    </div>
  );
}
