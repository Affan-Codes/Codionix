import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants";
import { useAuth } from "@/context/AuthContext";
import { useResendVerification } from "@/hooks/mutations/useAuthMutations";
import { Loader2Icon, MailIcon } from "lucide-react";
import { useNavigate } from "react-router";
import { AuthLayout } from "@/components/layout/AuthLayout";

export default function VerificationPending() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const resendVerification = useResendVerification();

  // Auto-redirect if already verified
  if (user?.isEmailVerified) {
    navigate(ROUTES.DASHBOARD);
    return null;
  }

  const handleResend = async () => {
    await resendVerification.handleSubmit();
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate(ROUTES.LOGIN);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthLayout variant="centered">
      <div className="space-y-8 text-center">
        {/* Mail Icon */}
        <div className="flex justify-center">
          <div className="size-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <MailIcon className="size-10 text-primary" />
          </div>
        </div>

        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">
            Verify Your Email
          </h1>
          <p className="text-sm text-muted-foreground">
            We've sent a verification link to{" "}
            <span className="font-medium text-foreground">{user?.email}</span>
          </p>
        </div>

        {/* Instructions */}
        <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3 text-left">
          <p className="text-sm font-medium text-foreground">
            What to do next:
          </p>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Check your inbox for the verification email</li>
            <li>Click the verification link in the email</li>
            <li>Return here and log in to access your account</li>
          </ol>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Didn't receive the email?
          </p>
          <Button
            onClick={handleResend}
            disabled={resendVerification.isPending}
            variant="outline"
            className="w-full h-11 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            {resendVerification.isPending ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <MailIcon className="size-4" />
                Resend Verification Email
              </>
            )}
          </Button>
        </div>

        {/* Logout */}
        <div className="pt-4 border-t border-border">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full transition-colors"
            size="sm"
          >
            Log out
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Check your spam folder if you don't see the email within a few
          minutes.
        </p>
      </div>
    </AuthLayout>
  );
}
