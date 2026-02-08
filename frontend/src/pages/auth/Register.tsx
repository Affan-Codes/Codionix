import { useAuth } from "@/context/AuthContext";
import { Link, useNavigate } from "react-router";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ROUTES, USER_ROLES } from "@/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import {
  CheckCircle2Icon,
  SparklesIcon,
  CodeIcon,
  AwardIcon,
  Loader2Icon,
} from "lucide-react";
import { useOAuthRegisterInit } from "@/hooks/mutations/useAuthMutations";

const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name too long"),
    email: z.email("Invalid email address").min(1, "Email is required"),
    role: z.enum(["STUDENT", "MENTOR", "EMPLOYER"], {
      message: "Please select a role",
    }),
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

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const { register: registerUser, isLoading } = useAuth(); // For email/password registration
  const navigate = useNavigate();
  const oauthRegister = useOAuthRegisterInit(); // For OAuth initialization

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "STUDENT",
    },
    mode: "onBlur",
  });

  // Email/Password Registration Handler
  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        role: data.role,
      });
      navigate(ROUTES.DASHBOARD);
    } catch (error) {
      // Error handled by mutation
    }
  };

  // OAuth Registration Handler
  const handleOAuthClick = async (
    provider: "google" | "github",
    role?: "STUDENT" | "MENTOR" | "EMPLOYER",
  ) => {
    if (!role) {
      console.error("Role is required for OAuth registration");
      return;
    }

    try {
      const { authUrl, expiresIn } = await oauthRegister.handleSubmit({
        provider,
        role,
      });

      const expiresAt = Date.now() + expiresIn * 1000;

      sessionStorage.setItem("oauth_expires_at", String(expiresAt));

      window.location.href = authUrl;
    } catch (error) {
      // Error handled by mutation (toast notification)
    }
  };

  const password = watch("password");
  const confirmPassword = watch("confirmPassword");

  return (
    <AuthLayout
      variant="split"
      brandContent={{
        hero: "Join the Builders",
        subhero:
          "Start your journey from learning to earning. Build real projects, get mentored by experts, and land your dream job.",
        features: [
          {
            icon: <SparklesIcon className="size-5 text-primary" />,
            text: "Work on production-ready projects from real companies",
          },
          {
            icon: <CodeIcon className="size-5 text-primary" />,
            text: "Get personalized feedback from experienced developers",
          },
          {
            icon: <AwardIcon className="size-5 text-primary" />,
            text: "Build a portfolio that proves you can ship real products",
          },
        ],
      }}
    >
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Create Account</h1>
          <p className="text-sm text-muted-foreground">
            Start building your future today
          </p>
        </div>

        {/* OAuth */}
        <OAuthButtons flow="register" onOAuthClick={handleOAuthClick} />

        {/* Divider */}
        <div className="relative">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
            or register with email
          </span>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              disabled={isLoading}
              aria-invalid={!!errors.fullName}
              {...register("fullName")}
              className="h-11 transition-all duration-200 focus:scale-[1.01]"
            />
            {errors.fullName && (
              <p className="text-xs text-destructive" role="alert">
                {errors.fullName.message}
              </p>
            )}
          </div>

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

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role">I am a</Label>
            <Select
              defaultValue="STUDENT"
              onValueChange={(value) =>
                setValue("role", value as "STUDENT" | "MENTOR" | "EMPLOYER")
              }
              disabled={isLoading}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={USER_ROLES.STUDENT}>Student</SelectItem>
                <SelectItem value={USER_ROLES.MENTOR}>Mentor</SelectItem>
                <SelectItem value={USER_ROLES.EMPLOYER}>Employer</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-xs text-destructive" role="alert">
                {errors.role.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
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
              <div
                className={`flex items-center gap-1.5 text-xs transition-colors duration-200 ${
                  confirmPassword === password
                    ? "text-green-600 dark:text-green-500"
                    : "text-destructive"
                }`}
              >
                <CheckCircle2Icon className="size-3" />
                <span>
                  {confirmPassword === password
                    ? "✓ Passwords match"
                    : "✗ Passwords do not match"}
                </span>
              </div>
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
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        {/* Login Link */}
        <div className="text-center text-sm">
          <span className="text-muted-foreground">
            Already have an account?{" "}
          </span>
          <Link
            to={ROUTES.LOGIN}
            className="text-primary font-semibold hover:underline transition-colors"
          >
            Sign in →
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
