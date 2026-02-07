import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ROUTES } from "@/constants";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Loader2Icon, XCircleIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

/**
 * Exponential backoff retry configuration
 */
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY: 1000, // 1s
  MAX_DELAY: 8000, // 8s
};

export default function OAuthCallback() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Reset error state on retry
      setError(null);

      // Give cookies a moment to be set by browser
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Fetch current user (will use cookies automatically)
      const { userApi } = await import("@/api/user.api");
      const user = await userApi.getCurrentUser();

      // Update auth context
      updateUser(user);

      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (error: any) {
      console.error("[OAuth] Failed to fetch user after callback", error);

      // Check if error is retryable (network/server error)
      const isRetryable =
        !error.response || // Network error
        error.response?.status >= 500 || // Server error
        error.code === "ECONNABORTED" || // Timeout
        error.code === "ERR_NETWORK";

      // Retry with exponential backoff if retryable and under limit
      if (isRetryable && retryCount < RETRY_CONFIG.MAX_RETRIES) {
        const delay = Math.min(
          RETRY_CONFIG.BASE_DELAY * Math.pow(2, retryCount),
          RETRY_CONFIG.MAX_DELAY,
        );

        console.info(
          `[OAuth] Retrying callback (${retryCount + 1}/${RETRY_CONFIG.MAX_RETRIES}) in ${delay}ms...`,
        );

        setTimeout(() => {
          setRetryCount((prev) => prev + 1);
          handleCallback();
        }, delay);

        return;
      }

      // Max retries reached or non-retryable error
      const errorMessage =
        error.response?.status === 401
          ? "Authentication failed. Please try signing in again."
          : "Failed to complete sign in. Please try again.";

      setError(errorMessage);
    }
  };

  const handleRetry = () => {
    setRetryCount(0);
    handleCallback();
  };

  if (error) {
    return (
      <AuthLayout variant="centered">
        <div className="space-y-8 text-center">
          {/* Error Icon */}
          <div className="flex justify-center">
            <div className="size-20 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
              <XCircleIcon className="size-10 text-destructive" />
            </div>
          </div>

          {/* Error Message */}
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight">
              Sign In Failed
            </h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button onClick={handleRetry} className="w-full">
              Try Again
            </Button>
            <Button
              onClick={() => navigate(ROUTES.LOGIN)}
              variant="outline"
              className="w-full"
            >
              Back to Login
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout variant="centered">
      <div className="space-y-8 text-center">
        {/* Loading Icon */}
        <div className="flex justify-center">
          <div className="size-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Loader2Icon className="size-10 text-primary animate-spin" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">
            Completing Sign In...
          </h1>
          <p className="text-sm text-muted-foreground">
            {retryCount > 0
              ? `Retrying (${retryCount}/${RETRY_CONFIG.MAX_RETRIES})...`
              : "Just a moment while we set up your session"}
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
