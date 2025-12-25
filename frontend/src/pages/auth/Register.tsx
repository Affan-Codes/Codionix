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
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
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
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
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
      toast.success("Account created!", {
        description: "Welcome to Codionix. Let's get started!",
      });
      navigate(ROUTES.DASHBOARD);
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error("Registration failed", {
          description: err.message || "Could not create account",
        });
      } else {
        toast.error("Registration failed", {
          description: "An unexpected error occurred",
        });
      }
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
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 p-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Create Account
          </CardTitle>
          <CardDescription className="text-center">
            Join Codionix today
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                disabled={isSubmitting}
                aria-invalid={!!errors.fullName}
                {...register("fullName")}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.fullName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                disabled={isSubmitting}
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">I am a</Label>
              <Select
                defaultValue="STUDENT"
                onValueChange={(value) =>
                  setValue("role", value as "STUDENT" | "MENTOR" | "EMPLOYER")
                }
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={USER_ROLES.STUDENT}>Student</SelectItem>
                  <SelectItem value={USER_ROLES.MENTOR}>Mentor</SelectItem>
                  <SelectItem value={USER_ROLES.EMPLOYER}>Employer</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.role.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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
              {isSubmitting ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              Already have an account?{" "}
            </span>
            <Link
              to={ROUTES.LOGIN}
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
