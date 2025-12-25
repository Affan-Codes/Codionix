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
import { CheckCircleIcon, Loader2Icon, XCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

type VerificationState = "verifying" | "success" | "error";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<VerificationState>("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setState("error");
      setMessage("Invalid verification link. Token is missing.");
      return;
    }

    const verify = async () => {
      try {
        const response = await authApi.verifyEmail(token);
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
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            {state === "verifying" && (
              <div className="bg-blue-100 rounded-full p-4">
                <Loader2Icon className="size-12 text-blue-600 animate-spin" />
              </div>
            )}
            {state === "success" && (
              <div className="bg-green-100 rounded-full p-4">
                <CheckCircleIcon className="size-12 text-green-600" />
              </div>
            )}
            {state === "error" && (
              <div className="bg-red-100 rounded-full p-4">
                <XCircleIcon className="size-12 text-red-600" />
              </div>
            )}
          </div>

          <CardTitle className="text-2xl font-bold">
            {state === "verifying" && "Verifying Your Email..."}
            {state === "success" && "Email Verified!"}
            {state === "error" && "Verification Failed"}
          </CardTitle>

          <CardDescription className="text-base">{message}</CardDescription>
        </CardHeader>

        <CardContent>
          {state !== "verifying" && (
            <div className="space-y-3">
              <Button onClick={handleContinue} className="w-full">
                {state === "success" ? "Continue to Login" : "Back to Register"}
              </Button>
              {state === "error" && (
                <p className="text-sm text-muted-foreground">
                  Need help? Contact support or try registering again.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
