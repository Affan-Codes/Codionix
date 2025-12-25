import { authApi } from "@/api/auth.api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/constants";
import { useAuth } from "@/context/AuthContext";
import { Loader2Icon, MailIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

const VerificationPending = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isResending, setIsResending] = useState(false);

  // Redirect if user is already verified
  if (user?.isEmailVerified) {
    navigate(ROUTES.DASHBOARD);
    return null;
  }

  const handleResend = async () => {
    setIsResending(true);
    try {
      const response = await authApi.resendVerificationEmail();
      toast.success("Verification email sent!", {
        description:
          response.message || "Check your inbox for the verification link.",
      });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message ||
        "Failed to resend verification email";
      toast.error("Resend failed", {
        description: errorMessage,
      });
    } finally {
      setIsResending(false);
    }
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
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="bg-blue-100 rounded-full p-4">
              <MailIcon className="size-12 text-blue-600" />
            </div>
          </div>

          <CardTitle className="text-2xl font-bold">
            Verify Your Email
          </CardTitle>

          <CardDescription className="text-base">
            We've sent a verification link to{" "}
            <span className="font-medium text-gray-900">{user?.email}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-left space-y-3 bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-700 font-medium">
              What to do next:
            </p>
            <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
              <li>Check your inbox for the verification email</li>
              <li>Click the verification link in the email</li>
              <li>Return here and log in to access your account</li>
            </ol>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Didn't receive the email?
            </p>
            <Button
              onClick={handleResend}
              disabled={isResending}
              variant="outline"
              className="w-full"
            >
              {isResending ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Resend Verification Email"
              )}
            </Button>
          </div>

          <div className="pt-4 border-t">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full"
              size="sm"
            >
              Log out
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Check your spam folder if you don't see the email within a few
            minutes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerificationPending;
