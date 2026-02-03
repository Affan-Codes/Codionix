import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ROUTES } from "@/constants";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { CheckCircleIcon, Loader2Icon, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { setAccessToken } from "@/api/axios";
import { setCachedUser, setRefreshToken } from "@/utils/tokenManager";
import { authApi } from "@/api/auth.api";

type CallbackState = "processing" | "success" | "error";

/**
 * OAuth Callback Handler
 *
 * ARCHITECTURE:
 * 1. Backend redirects here with authorization code in query params
 * 2. Frontend exchanges code for JWT tokens via API call
 * 3. Tokens stored (access in memory, refresh in sessionStorage)
 * 4. User redirected to dashboard
 *
 * SECURITY:
 * - Authorization code is single-use (backend enforces)
 * - Code expires in 5 minutes (backend enforces)
 * - Idempotency guard prevents double-exchange
 * - URL cleaned after exchange to prevent refresh attacks
 *
 * EDGE CASES HANDLED:
 * - React Strict Mode double execution
 * - Page refresh after exchange
 * - Network errors during exchange
 * - Missing/invalid authorization code
 * - Backend rejection (code already used)
 */
export default function OAuthCallback() {
  const [state, setState] = useState<CallbackState>("processing");
  const [message, setMessage] = useState("Processing authentication...");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updateUser } = useAuth();

  // ===================================
  // IDEMPOTENCY GUARD
  // ===================================

  /**
   * Prevents double execution in React Strict Mode
   * CRITICAL: Must be ref (not state) to survive re-renders
   */
  const hasProcessedRef = useRef(false);

  /**
   * Track which code we've processed to prevent replay
   * Stored in sessionStorage to persist across re-renders
   */
  const getProcessedCode = (): string | null => {
    try {
      return sessionStorage.getItem("oauth_processed_code");
    } catch {
      return null;
    }
  };

  const markCodeAsProcessed = (code: string): void => {
    try {
      sessionStorage.setItem("oauth_processed_code", code);
    } catch (error) {
      console.error("Failed to mark code as processed:", error);
    }
  };

  const clearProcessedCode = (): void => {
    try {
      sessionStorage.removeItem("oauth_processed_code");
    } catch (error) {
      console.error("Failed to clear processed code:", error);
    }
  };

  // ===================================
  // OAUTH EXCHANGE LOGIC
  // ===================================

  useEffect(() => {
    // ===================================
    // STEP 1: IDEMPOTENCY CHECK
    // ===================================

    if (hasProcessedRef.current) {
      console.info(
        "[OAuth] Callback already processed in this component lifecycle, skipping",
      );
      return;
    }

    const authCode = searchParams.get("code");

    // Missing code — user manually navigated here or URL was cleared
    if (!authCode) {
      // Check if we successfully processed a code earlier
      const processedCode = getProcessedCode();

      if (processedCode) {
        // Code was already processed successfully
        console.info(
          "[OAuth] No code in URL, but found processed code in session. Redirecting to dashboard.",
        );
        setState("success");
        setMessage("Authentication successful! Redirecting...");

        // Clean up and redirect
        clearProcessedCode();
        setTimeout(() => {
          navigate(ROUTES.DASHBOARD, { replace: true });
        }, 500);
        return;
      }

      // No code and no previous success — error state
      console.error(
        "[OAuth] No authorization code in URL and no processed code in session",
      );
      setState("error");
      setMessage("Missing authorization code. Please try signing in again.");
      return;
    }

    // ===================================
    // STEP 2: CHECK IF CODE ALREADY PROCESSED
    // ===================================

    const processedCode = getProcessedCode();

    if (processedCode === authCode) {
      console.info(
        "[OAuth] Authorization code already processed, redirecting to dashboard",
      );
      setState("success");
      setMessage("Authentication successful! Redirecting...");

      // Clean URL and redirect
      window.history.replaceState({}, document.title, ROUTES.OAUTH_CALLBACK);
      setTimeout(() => {
        navigate(ROUTES.DASHBOARD, { replace: true });
      }, 500);
      return;
    }

    // ===================================
    // STEP 3: MARK AS PROCESSING
    // ===================================

    hasProcessedRef.current = true;

    console.info("[OAuth] Starting authorization code exchange", {
      codePreview: authCode.substring(0, 8) + "...",
    });

    // ===================================
    // STEP 4: EXCHANGE CODE FOR TOKENS
    // ===================================

    const processCallback = async () => {
      try {
        setState("processing");
        setMessage("Exchanging authorization code...");

        // Exchange code for tokens
        const response = await authApi.exchangeAuthCode(authCode);

        console.info("[OAuth] Token exchange successful", {
          userId: response.user.id,
          email: response.user.email,
        });

        // ===================================
        // STEP 5: STORE TOKENS & USER
        // ===================================

        // Store access token in memory (axios interceptor reads this)
        setAccessToken(response.tokens.accessToken);

        // Store refresh token in sessionStorage (survives page refresh)
        setRefreshToken(response.tokens.refreshToken);

        // Cache user data in sessionStorage
        setCachedUser(JSON.stringify(response.user));

        // Update AuthContext (triggers re-render of protected routes)
        updateUser(response.user);

        console.info("[OAuth] Tokens and user data stored successfully");

        // ===================================
        // STEP 6: MARK CODE AS PROCESSED
        // ===================================

        markCodeAsProcessed(authCode);

        // ===================================
        // STEP 7: CLEAN URL & REDIRECT
        // ===================================

        // Remove code from URL to prevent refresh attacks
        window.history.replaceState({}, document.title, ROUTES.OAUTH_CALLBACK);

        setState("success");
        setMessage("Authentication successful! Redirecting...");

        // Brief success message, then redirect
        setTimeout(() => {
          navigate(ROUTES.DASHBOARD, { replace: true });
        }, 1000);
      } catch (error: any) {
        console.error("[OAuth] Token exchange failed", {
          error: error.message || "Unknown error",
          errorType: error.constructor?.name,
          status: error.response?.status,
        });

        // Clean URL even on error (prevent retry with same code)
        window.history.replaceState({}, document.title, ROUTES.OAUTH_CALLBACK);

        setState("error");

        // Extract user-friendly error message
        let errorMessage = "Authentication failed. Please try again.";

        // Rate limit error
        if (error.isRateLimitError) {
          errorMessage = error.userMessage || errorMessage;
        }
        // Invalid/expired code
        else if (error.response?.status === 401) {
          const backendMessage = error.response?.data?.error?.message;
          if (backendMessage?.includes("expired")) {
            errorMessage = "Authorization code expired. Please sign in again.";
          } else if (backendMessage?.includes("invalid")) {
            errorMessage = "Invalid authorization code. Please sign in again.";
          } else {
            errorMessage =
              backendMessage || "Authorization failed. Please sign in again.";
          }
        }
        // Code already used (replay attack or double submission)
        else if (
          error.response?.status === 400 &&
          error.response?.data?.error?.message?.includes("already used")
        ) {
          errorMessage =
            "This authorization code has already been used. Please sign in again.";
        }
        // Network error
        else if (error.isNetworkError || error.code === "ERR_NETWORK") {
          errorMessage =
            "Network error. Please check your connection and try again.";
        }
        // Backend error (500+)
        else if (error.response?.status >= 500) {
          errorMessage = "Server error. Please try again in a moment.";
        }
        // Fallback to backend message if available
        else if (error.response?.data?.error?.message) {
          errorMessage = error.response.data.error.message;
        }

        setMessage(errorMessage);
      }
    };

    processCallback();

    // NO CLEANUP FUNCTION
    // We intentionally don't abort requests because:
    // 1. Authorization codes are single-use (backend enforces)
    // 2. If exchange succeeds, we MUST store tokens
    // 3. Aborting in-flight requests causes silent failures
  }, []); // EMPTY dependency array — only run once per mount

  // ===================================
  // RENDER
  // ===================================

  return (
    <AuthLayout variant="centered">
      <div className="space-y-8 text-center">
        {/* State Icon */}
        <div className="flex justify-center">
          {state === "processing" && (
            <div className="size-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Loader2Icon className="size-10 text-primary animate-spin" />
            </div>
          )}
          {state === "success" && (
            <div className="size-20 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <CheckCircleIcon className="size-10 text-green-600 dark:text-green-500" />
            </div>
          )}
          {state === "error" && (
            <div className="size-20 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
              <XCircleIcon className="size-10 text-destructive" />
            </div>
          )}
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">
            {state === "processing" && "Authenticating..."}
            {state === "success" && "Welcome Aboard!"}
            {state === "error" && "Authentication Failed"}
          </h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>

        {/* Error Actions */}
        {state === "error" && (
          <div className="space-y-3">
            <Button
              onClick={() => {
                // Clear processed code flag on manual retry
                clearProcessedCode();
                navigate(ROUTES.LOGIN, { replace: true });
              }}
              className="w-full h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
            >
              Back to Login
            </Button>
            <Button
              onClick={() => {
                clearProcessedCode();
                navigate(ROUTES.REGISTER, { replace: true });
              }}
              variant="outline"
              className="w-full h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Create Account Instead
            </Button>
          </div>
        )}

        {/* Processing indicator */}
        {state === "processing" && (
          <p className="text-xs text-muted-foreground">
            Please wait while we complete your authentication...
          </p>
        )}

        {/* Debug info in development */}
        {import.meta.env.DEV && (
          <details className="text-left text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">
              Debug Info (Dev Only)
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
              {JSON.stringify(
                {
                  state,
                  hasCode: !!searchParams.get("code"),
                  processedCode: getProcessedCode()?.substring(0, 8) + "...",
                  url: window.location.href,
                },
                null,
                2,
              )}
            </pre>
          </details>
        )}
      </div>
    </AuthLayout>
  );
}
