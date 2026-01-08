import { useAuth } from "@/context/AuthContext";
import { Link, useNavigate } from "react-router";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ROUTES } from "@/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldCheckIcon, SparklesIcon } from "lucide-react";

const loginSchema = z.object({
  email: z.email("Invalid email address").min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
      navigate(ROUTES.DASHBOARD);
    } catch (error) {
      // Error already handled by mutation
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg">
            <SparklesIcon className="size-8 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Welcome Back
            </h1>
            <p className="text-muted-foreground">
              Continue your learning journey with Codionix
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border-2">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl text-center font-semibold">
              Sign In
            </CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  disabled={isLoading}
                  aria-invalid={!!errors.email}
                  {...register("email")}
                  className="h-11"
                />
                {errors.email && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <Link
                    to={ROUTES.FORGOT_PASSWORD}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  disabled={isLoading}
                  aria-invalid={!!errors.password}
                  {...register("password")}
                  className="h-11"
                />
                {errors.password && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>

              {/* Trust Signal */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
                <ShieldCheckIcon className="size-3.5" />
                <span>Your data is secure and encrypted</span>
              </div>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  New to Codionix?
                </span>
              </div>
            </div>

            {/* Register Link */}
            <div className="text-center">
              <Link
                to={ROUTES.REGISTER}
                className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1"
              >
                Create an account
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer Text */}
        <p className="text-center text-xs text-muted-foreground">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
