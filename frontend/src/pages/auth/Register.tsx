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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROUTES, USER_ROLES } from "@/constants";
import { useAuth } from "@/context/AuthContext";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2Icon, ShieldCheckIcon, SparklesIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { z } from "zod";

const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must not exceed 100 characters"),
    email: z.email("Invalid email address").min(1, "Email is required"),
    role: z.enum(["STUDENT", "MENTOR", "EMPLOYER"], {
      error: "Please select a role",
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
  const { register: registerUser, isLoading } = useAuth();
  const navigate = useNavigate();

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
      // Error already handled by mutation
    }
  };

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br  from-indigo-50 via-white to-purple-50 p-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg">
            <SparklesIcon className="size-8 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Join Codionix
            </h1>
            <p className="text-muted-foreground">
              Start your learning journey today
            </p>
          </div>
        </div>

        {/* Register Card */}
        <Card className="shadow-xl border-2">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl text-center font-semibold">
              Create Account
            </CardTitle>
            <CardDescription className="text-center">
              Sign up to discover projects and opportunities
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  disabled={isLoading}
                  aria-invalid={!!errors.fullName}
                  {...register("fullName")}
                  className="h-11"
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              {/* Email */}
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

              {/* Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-medium">
                  I am a
                </Label>
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
                    <SelectItem value={USER_ROLES.EMPLOYER}>
                      Employer
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.role.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
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
                {password && passwordChecks && (
                  <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
                    <p className="text-xs font-medium text-muted-foreground">
                      Password must contain:
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      <div
                        className={`flex items-center gap-1.5 ${
                          passwordChecks.length
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        <CheckCircle2Icon className="size-3" />
                        <span>8+ characters</span>
                      </div>
                      <div
                        className={`flex items-center gap-1.5 ${
                          passwordChecks.uppercase
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        <CheckCircle2Icon className="size-3" />
                        <span>Uppercase</span>
                      </div>
                      <div
                        className={`flex items-center gap-1.5 ${
                          passwordChecks.lowercase
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        <CheckCircle2Icon className="size-3" />
                        <span>Lowercase</span>
                      </div>
                      <div
                        className={`flex items-center gap-1.5 ${
                          passwordChecks.number
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        <CheckCircle2Icon className="size-3" />
                        <span>Number</span>
                      </div>
                      <div
                        className={`flex items-center gap-1.5 ${
                          passwordChecks.special
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        <CheckCircle2Icon className="size-3" />
                        <span>Special char</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium"
                >
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  disabled={isLoading}
                  aria-invalid={!!errors.confirmPassword}
                  {...register("confirmPassword")}
                  className="h-11"
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.confirmPassword.message}
                  </p>
                )}
                {confirmPassword && password && (
                  <p
                    className={`text-xs flex items-center gap-1.5 ${
                      confirmPassword === password
                        ? "text-green-600"
                        : "text-destructive"
                    }`}
                  >
                    <CheckCircle2Icon className="size-3" />
                    {confirmPassword === password
                      ? "Passwords match"
                      : "Passwords do not match"}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? "Creating account..." : "Create Account"}
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
                  Already have an account?
                </span>
              </div>
            </div>

            {/* Login Link */}
            <div className="text-center">
              <Link
                to={ROUTES.LOGIN}
                className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1"
              >
                Sign in instead
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer Text */}
        <p className="text-center text-xs text-muted-foreground">
          By creating an account, you agree to our Terms of Service and Privacy
          Policy
        </p>
      </div>
    </div>
  );
}
