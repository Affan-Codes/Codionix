import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ROUTES } from "@/constants";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { CheckCircleIcon, Loader2Icon, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { setAccessToken } from "@/api/axios";
import { setCachedUser, setRefreshToken } from "@/utils/tokenManager";

type CallbackState = "processing" | "success" | "error";

export default function OAuthCallback() {
  const [state, setState] = useState<CallbackState>("processing");
  const [message, setMessage] = useState("Processing authentication...");
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Extract tokens from URL hash
        const hash = window.location.hash.substring(1); // Remove '#'
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const userDataStr = params.get("user");

        if (!accessToken || !refreshToken) {
          setState("error");
          setMessage("Missing authentication data. Please try again.");
          return;
        }

        // Store tokens
        setAccessToken(accessToken); // Memory only
        setRefreshToken(refreshToken); // sessionStorage

        // If user data provided, store it
        if (userDataStr) {
          try {
            const userData = JSON.parse(decodeURIComponent(userDataStr));
            setCachedUser(JSON.stringify(userData));
            updateUser(userData);
          } catch (error) {
            console.warn("Failed to parse user data from URL");
          }
        }

        // Clear URL hash (security)
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );

        setState("success");
        setMessage("Authentication successful! Redirecting...");

        // Redirect after 1 second
        setTimeout(() => {
          navigate(ROUTES.DASHBOARD, { replace: true });
        }, 1000);
      } catch (error) {
        console.error("OAuth callback error:", error);
        setState("error");
        setMessage("Authentication failed. Please try again.");
      }
    };

    processCallback();
  }, [updateUser, navigate]);

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
              onClick={() => navigate(ROUTES.LOGIN)}
              className="w-full h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
            >
              Back to Login
            </Button>
            <Button
              onClick={() => navigate(ROUTES.LOGIN)}
              variant={"outline"}
              className="w-full h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
            >
              Create Account Instead
            </Button>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
