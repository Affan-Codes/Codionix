import { useAuth } from "@/context/AuthContext";
import { Link, useNavigate } from "react-router";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ROUTES } from "@/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { RocketIcon, UsersIcon, TrophyIcon } from "lucide-react";
import { useOAuthLoginInit } from "@/hooks/mutations/useAuthMutations";

const loginSchema = z.object({
  email: z.email("Invalid email address").min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const { login, isLoading } = useAuth(); // For email/password login
  const navigate = useNavigate();
  const oauthLogin = useOAuthLoginInit(); // For OAuth initialization

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  // Email/Password Login Handler
  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
      navigate(ROUTES.DASHBOARD);
    } catch (error) {
      // Error handled by mutation
    }
  };

  // OAuth Login Handler
  const handleOAuthClick = async (provider: "google" | "github") => {
    try {
      const { authUrl, expiresIn } = await oauthLogin.handleSubmit(provider);

      const expiresAt = Date.now() + expiresIn * 1000;

      sessionStorage.setItem("oauth_expires_at", String(expiresAt));

      window.location.href = authUrl;
    } catch (error) {
      // Error handled by mutation (toast notification)
    }
  };

  return (
    <AuthLayout
      variant="split"
      brandContent={{
        hero: "Build Real Projects",
        subhero:
          "Join thousands of builders turning ideas into shipped products. Learn by doing, get mentored, get hired.",
        features: [
          {
            icon: <RocketIcon className="size-5 text-primary" />,
            text: "Ship production-ready projects with guidance from industry experts",
          },
          {
            icon: <UsersIcon className="size-5 text-primary" />,
            text: "Connect with mentors who've built at top tech companies",
          },
          {
            icon: <TrophyIcon className="size-5 text-primary" />,
            text: "Build your portfolio and get hired based on what you can build",
          },
        ],
      }}
    >
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to continue building
          </p>
        </div>

        {/* OAuth */}
        <OAuthButtons flow="login" onOAuthClick={handleOAuthClick} />

        {/* Divider */}
        <div className="relative">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
            or continue with email
          </span>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
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

          {/* Password */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                to={ROUTES.FORGOT_PASSWORD}
                className="text-xs text-primary hover:underline font-medium transition-colors"
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
              className="h-11 transition-all duration-200 focus:scale-[1.01]"
            />
            {errors.password && (
              <p className="text-xs text-destructive" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        {/* Register Link */}
        <div className="text-center text-sm">
          <span className="text-muted-foreground">Don't have an account? </span>
          <Link
            to={ROUTES.REGISTER}
            className="text-primary font-semibold hover:underline transition-colors"
          >
            Create account →
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
