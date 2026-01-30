import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/constants";
import { useResetPassword } from "@/hooks/mutations/useAuthMutations";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircleIcon, Loader2Icon, XCircleIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router";
import { z } from "zod";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { PasswordStrength } from "@/components/auth/PasswordStrength";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain uppercase letter")
      .regex(/[a-z]/, "Must contain lowercase letter")
      .regex(/[0-9]/, "Must contain number")
      .regex(/[!@#$%^&*(),.?":{}|<>_]/, "Must contain special character"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [resetSuccess, setResetSuccess] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);

  const token = searchParams.get("token");

  const resetPassword = useResetPassword();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onBlur",
  });

  const password = watch("password");
  const confirmPassword = watch("confirmPassword");

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setInvalidToken(true);
      return;
    }

    try {
      await resetPassword.handleSubmit({ token, password: data.password });
      setResetSuccess(true);

      // Auto-redirect after 2 seconds
      setTimeout(() => {
        navigate(ROUTES.LOGIN);
      }, 2000);
    } catch (error: any) {
      if (error.response?.status === 401) {
        setInvalidToken(true);
      }
    }
  };

  const isLoading = isSubmitting || resetPassword.isPending;

  // INVALID TOKEN STATE
  if (!token || invalidToken) {
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
            <h1 className="text-3xl font-bold tracking-tight">Invalid Link</h1>
            <p className="text-sm text-muted-foreground">
              This password reset link is invalid or has expired.
            </p>
          </div>

          {/* Info */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-left">
            <p className="text-sm text-muted-foreground">
              Password reset links expire after 1 hour for security reasons.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              asChild
              className="w-full h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
            >
              <Link to={ROUTES.FORGOT_PASSWORD}>Request New Reset Link</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full h-11 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Link to={ROUTES.LOGIN}>Back to Login</Link>
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // SUCCESS STATE
  if (resetSuccess) {
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
              Password Reset!
            </h1>
            <p className="text-sm text-muted-foreground">
              Your password has been successfully changed. Redirecting to
              login...
            </p>
          </div>

          {/* Manual Redirect */}
          <Button
            asChild
            className="w-full h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
          >
            <Link to={ROUTES.LOGIN}>Continue to Login</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  // FORM STATE
  return (
    <AuthLayout variant="centered">
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Reset Password</h1>
          <p className="text-sm text-muted-foreground">
            Create a new secure password
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              disabled={isLoading}
              aria-invalid={!!errors.password}
              {...register("password")}
              className="h-11 transition-all duration-200 focus:scale-[1.01]"
            />
            {errors.password && (
              <p className="text-xs text-destructive" role="alert">
                {errors.password.message}
              </p>
            )}
            {password && <PasswordStrength password={password} />}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              disabled={isLoading}
              aria-invalid={!!errors.confirmPassword}
              {...register("confirmPassword")}
              className="h-11 transition-all duration-200 focus:scale-[1.01]"
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive" role="alert">
                {errors.confirmPassword.message}
              </p>
            )}
            {confirmPassword && password && (
              <p
                className={`text-xs flex items-center gap-1.5 ${
                  confirmPassword === password
                    ? "text-green-500"
                    : "text-destructive"
                }`}
              >
                {confirmPassword === password
                  ? "✓ Passwords match"
                  : "✗ Passwords do not match"}
              </p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>

        {/* Back to Login */}
        <div className="text-center">
          <Link
            to={ROUTES.LOGIN}
            className="text-sm text-primary font-medium hover:underline transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
