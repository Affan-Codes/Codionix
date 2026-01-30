import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/constants";
import { useForgotPassword } from "@/hooks/mutations/useAuthMutations";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, CheckCircleIcon, MailIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { z } from "zod";
import { AuthLayout } from "@/components/layout/AuthLayout";

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

  const isLoading = isValidating || forgotPassword.isPending;

  if (emailSent) {
    return (
      <AuthLayout variant="centered">
        <div className="space-y-8 text-center">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="size-20 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <CheckCircleIcon className="size-10 text-green-600 dark:text-green-500" />
            </div>
          </div>

          {/* Success Message */}
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight">
              Check Your Email
            </h1>
            <p className="text-sm text-muted-foreground">
              We've sent a password reset link to{" "}
              <span className="font-medium text-foreground">
                {submittedEmail}
              </span>
            </p>
          </div>

          {/* Instructions */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3 text-left">
            <p className="text-sm font-medium text-foreground">What's next:</p>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Check your inbox for the reset email</li>
              <li>Click the reset link in the email</li>
              <li>Create a new password</li>
              <li>Sign in with your new password</li>
            </ol>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Didn't receive the email?
            </p>
            <Button
              onClick={() => setEmailSent(false)}
              variant="outline"
              className="w-full h-11 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <MailIcon className="size-4" />
              Try Again
            </Button>
          </div>

          {/* Back to Login */}
          <div className="pt-4 border-t border-border">
            <Link
              to={ROUTES.LOGIN}
              className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline transition-colors"
            >
              <ArrowLeftIcon className="size-4" />
              Back to Login
            </Link>
          </div>

          <p className="text-xs text-muted-foreground">
            Check your spam folder if you don't see the email within a few
            minutes.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout variant="centered">
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Forgot Password?
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              disabled={isLoading}
              aria-invalid={!!errors.email}
              {...register("email")}
              className="h-11 transition-all duration-200 focus:scale-[1.01]"
            />
            {errors.email && (
              <p className="text-xs text-destructive" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>

        {/* Back to Login */}
        <div className="text-center">
          <Link
            to={ROUTES.LOGIN}
            className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline transition-colors"
          >
            <ArrowLeftIcon className="size-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
