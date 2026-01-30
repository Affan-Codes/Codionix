import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants";
import { useVerifyEmail } from "@/hooks/mutations/useAuthMutations";
import { CheckCircleIcon, Loader2Icon, XCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { AuthLayout } from "@/components/layout/AuthLayout";

type VerificationState = "verifying" | "success" | "error";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<VerificationState>("verifying");
  const [message, setMessage] = useState("");

  const verifyEmail = useVerifyEmail();

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setState("error");
      setMessage("Invalid verification link. Token is missing.");
      return;
    }

    const verify = async () => {
      try {
        const response = await verifyEmail.handleSubmit(token);
        setState("success");
        setMessage(response.message || "Email verified successfully!");
      } catch (error: any) {
        setState("error");
        const errorMessage =
          error.response?.data?.error?.message ||
          "Verification failed. The link may be invalid or expired.";
        setMessage(errorMessage);
      }
    };

    verify();
  }, []);

  const handleContinue = () => {
    if (state === "success") {
      navigate(ROUTES.LOGIN);
    } else {
      navigate(ROUTES.REGISTER);
    }
  };

  return (
    <AuthLayout variant="centered">
      <div className="space-y-8 text-center">
        {/* State Icon */}
        <div className="flex justify-center">
          {state === "verifying" && (
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

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">
            {state === "verifying" && "Verifying Your Email..."}
            {state === "success" && "Email Verified!"}
            {state === "error" && "Verification Failed"}
          </h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>

        {/* Actions */}
        {state !== "verifying" && (
          <div className="space-y-3">
            <Button
              onClick={handleContinue}
              className="w-full h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
            >
              {state === "success" ? "Continue to Login" : "Back to Register"}
            </Button>
            {state === "error" && (
              <p className="text-xs text-muted-foreground">
                Need help? Contact support or try registering again.
              </p>
            )}
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
