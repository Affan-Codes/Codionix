import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/constants";
import { useForgotPassword } from "@/hooks/mutations/useAuthMutations";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, CheckCircleIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.email("Invalid email address").min(1, "Email is required"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [emailSent, setEmailSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const forgotPassword = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: isValidating },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    await forgotPassword.handleSubmit(data.email);
    setSubmittedEmail(data.email);
    setEmailSent(true);
  };

  // Combined loading state
  const isLoading = isValidating || forgotPassword.isPending;

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
              <div className="bg-green-100 rounded-full p-4">
                <CheckCircleIcon className="size-12 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              Check Your Email
            </CardTitle>
            <CardDescription className="text-base">
              We've sent a password reset link to{" "}
              <span className="font-medium text-gray-900">
                {submittedEmail}
              </span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-left bg-blue-50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">
                What to do next:
              </p>
              <ol className="text-sm text-gray-600 list-decimal list-inside space-y-2">
                <li>Check your inbox for the reset email</li>
                <li>Click the reset link in the email</li>
                <li>Create a new password</li>
                <li>Log in with your new password</li>
              </ol>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Didn't receive the email?
              </p>
              <Button
                onClick={() => setEmailSent(false)}
                variant={"outline"}
                className="w-full"
              >
                Try Again
              </Button>
            </div>

            <div className="pt-4 border-t">
              <Button asChild variant={"ghost"} className="w-full" size={"sm"}>
                <Link to={ROUTES.LOGIN}>
                  <ArrowLeftIcon className="size-4" />
                  Back to Login
                </Link>
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
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Forgot Password?
          </CardTitle>
          <CardDescription className="text-center">
            Enter your email and we'll send you a reset link
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                disabled={isLoading}
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" /> Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link
              to={ROUTES.LOGIN}
              className="text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              <ArrowLeftIcon className="size-3" />
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
