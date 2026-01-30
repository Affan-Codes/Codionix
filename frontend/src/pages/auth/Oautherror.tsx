import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ROUTES } from "@/constants";
import { AlertCircleIcon } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";

export default function OAuthError() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const provider = searchParams.get("provider") || "OAuth";
  const error = searchParams.get("error") || "unknown";

  const errorMessage = useMemo(() => {
    const errorMessages: Record<string, string> = {
      // Provider authorization errors
      access_denied:
        "You cancelled the authorization. No worries, try again when ready.",

      // Validation/Request errors
      invalid_request:
        "Invalid authorization response. Please try signing in again.",
      email_not_verified: `Your ${provider} email isn't verified. Please verify it at ${provider} first.`,

      // Account state errors
      account_exists:
        "An account with this email already exists. Try logging in instead.",
      account_not_found: "No account found. Please register first.",

      // Session/State errors
      state_expired: "Your session expired. Please try signing in again.",

      // Authentication errors
      invalid_token: "Authentication failed. Please try again.",
      unauthorized: "Authentication failed. Please try again.",

      // Provider errors
      provider_error:
        "The authentication provider encountered an error. Please try again.",
      provider_unavailable:
        "The authentication provider is temporarily unavailable. Please try again later.",

      // Generic/Unknown errors
      internal_error: "An unexpected error occurred. Please try again.",
      unknown: "An unexpected error occurred. Please try again.",
    };

    return errorMessages[error] || errorMessages.unknown;
  }, [error, provider]);

  // Check if we should show email verification help section
  const showEmailVerificationHelp = error === "email_not_verified";

  // Determine primary action button based on error type
  const getPrimaryAction = () => {
    switch (error) {
      case "account_exists":
        return { label: "Go to Login", route: ROUTES.LOGIN };
      case "account_not_found":
        return { label: "Go to Register", route: ROUTES.REGISTER };
      case "state_expired":
      case "invalid_token":
      case "email_not_verified":
        return { label: "Try Again", route: ROUTES.LOGIN };
      default:
        return { label: "Try Again", route: ROUTES.LOGIN };
    }
  };

  // Determine secondary action button based on error type
  const getSecondaryAction = () => {
    switch (error) {
      case "account_exists":
        return { label: "Create New Account", route: ROUTES.REGISTER };
      case "account_not_found":
        return { label: "Use Login Instead", route: ROUTES.LOGIN };
      case "email_not_verified":
        return { label: "Use Email/Password", route: ROUTES.LOGIN };
      default:
        return { label: "Use Email Instead", route: ROUTES.LOGIN };
    }
  };

  const primaryAction = getPrimaryAction();
  const secondaryAction = getSecondaryAction();

  return (
    <AuthLayout variant="centered">
      <div className="space-y-6 text-center">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="size-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
            <AlertCircleIcon className="size-8 text-yellow-500" />
          </div>
        </div>

        {/* Header */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">
            {provider.charAt(0).toUpperCase() + provider.slice(1)} Sign-In Issue
          </h2>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        </div>

        {/* Debug Information - Only visible in development */}
        {import.meta.env.DEV && (
          <div className="text-xs text-left bg-red-500/10 border border-red-500/20 rounded-lg p-3 space-y-1">
            <p className="font-semibold text-red-600">Debug Info (Dev Only):</p>
            <p className="text-muted-foreground">
              Provider: <span className="font-mono">{provider}</span>
            </p>
            <p className="text-muted-foreground">
              Error Code: <span className="font-mono">{error}</span>
            </p>
            <p className="text-muted-foreground">
              Full URL:{" "}
              <span className="font-mono text-xs break-all">
                {window.location.href}
              </span>
            </p>
          </div>
        )}

        {/* Contextual Help for Unverified Email */}
        {showEmailVerificationHelp && (
          <div className="text-left bg-muted/50 rounded-lg p-4 border border-border/50 space-y-3">
            <p className="text-sm font-medium text-foreground">
              How to verify your email:
            </p>
            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-2">
              <li>Go to your {provider} account settings</li>
              <li>Find the email verification section</li>
              <li>Verify your email address</li>
              <li>Return here and try signing in again</li>
            </ol>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={() => navigate(primaryAction.route)}
            className="w-full"
          >
            {primaryAction.label}
          </Button>
          <Button
            onClick={() => navigate(secondaryAction.route)}
            variant="outline"
            className="w-full"
          >
            {secondaryAction.label}
          </Button>
        </div>

        {/* Support Link */}
        <p className="text-xs text-muted-foreground pt-2">
          Still having trouble?{" "}
          <button
            onClick={() => navigate("/contact")}
            className="text-primary hover:underline"
          >
            Contact support
          </button>{" "}
          for help.
        </p>
      </div>
    </AuthLayout>
  );
}
