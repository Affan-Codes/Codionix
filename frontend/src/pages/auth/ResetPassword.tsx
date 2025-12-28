import { authApi } from "@/api/auth.api";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircleIcon, Loader2Icon, XCircleIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { z } from "zod";

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

  const passwordChecks = password
    ? {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>_]/.test(password),
      }
    : null;

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setInvalidToken(true);
      return;
    }

    try {
      await authApi.resetPassword(token, data.password);
      setResetSuccess(true);
      toast.success("Password reset successful!", {
        description: "You can now log in with your new password.",
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate(ROUTES.LOGIN);
      }, 2000);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message ||
        "Failed to reset password. The link may be invalid or expired.";
      toast.error("Reset failed", {
        description: errorMessage,
      });

      // If token is invalid/expired, show error state
      if (error.response?.status === 401) {
        setInvalidToken(true);
      }
    }
  };

  // Invalid/Missing Token State
  if (!token || invalidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
              <div className="bg-red-100 rounded-full p-4">
                <XCircleIcon className="size-12 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Invalid Link</CardTitle>
            <CardDescription className="text-base">
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Password reset links expire after 1 hour for security reasons.
            </p>
            <Button asChild className="w-full">
              <a href={ROUTES.FORGOT_PASSWORD}>Request New Reset Link</a>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <a href={ROUTES.LOGIN}>Back to Login</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success State
  if (resetSuccess) {
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
              Password Reset Successfully!
            </CardTitle>
            <CardDescription className="text-base">
              Your password has been changed. Redirecting to login...
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Button asChild className="w-full">
              <a href={ROUTES.LOGIN}>Continue to Login</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="font-bold text-2xl text-center">
            Reset Password
          </CardTitle>
          <CardDescription className="text-center">
            Create a new secure password
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                disabled={isSubmitting}
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.password.message}
                </p>
              )}
              {password && passwordChecks && (
                <div className="space-y-1 mt-2">
                  <p className="text-xs text-muted-foreground">
                    Password requirements:
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div
                      className={
                        passwordChecks.length
                          ? "text-green-600"
                          : "text-muted-foreground"
                      }
                    >
                      {passwordChecks.length ? "✓" : "○"} At least 8 characters
                    </div>
                    <div
                      className={
                        passwordChecks.uppercase
                          ? "text-green-600"
                          : "text-muted-foreground"
                      }
                    >
                      {passwordChecks.uppercase ? "✓" : "○"} Uppercase letter
                    </div>
                    <div
                      className={
                        passwordChecks.lowercase
                          ? "text-green-600"
                          : "text-muted-foreground"
                      }
                    >
                      {passwordChecks.lowercase ? "✓" : "○"} Lowercase letter
                    </div>
                    <div
                      className={
                        passwordChecks.number
                          ? "text-green-600"
                          : "text-muted-foreground"
                      }
                    >
                      {passwordChecks.number ? "✓" : "○"} Number
                    </div>
                    <div
                      className={
                        passwordChecks.special
                          ? "text-green-600"
                          : "text-muted-foreground"
                      }
                    >
                      {passwordChecks.special ? "✓" : "○"} Special character
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                disabled={isSubmitting}
                aria-invalid={!!errors.confirmPassword}
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.confirmPassword.message}
                </p>
              )}
              {confirmPassword && password && (
                <p
                  className={`text-xs ${
                    confirmPassword === password
                      ? "text-green-600"
                      : "text-destructive"
                  }`}
                >
                  {confirmPassword === password
                    ? "✓ Passwords match"
                    : "✗ Passwords do not match"}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <a
              href={ROUTES.LOGIN}
              className="text-primary hover:underline font-medium"
            >
              Back to Login
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
