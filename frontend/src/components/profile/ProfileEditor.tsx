import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateProfileMutation } from "@/hooks/mutations/useUserMutations";
import { useAuth } from "@/context/AuthContext";
import type { User } from "@/types";
import {
  MailIcon,
  PhoneIcon,
  LinkedinIcon,
  GithubIcon,
  Loader2Icon,
  CheckCircle2Icon,
  AlertCircleIcon,
  Sparkles,
} from "lucide-react";
import { useMemo } from "react";

const profileSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  bio: z.string().max(500, "Bio must not exceed 500 characters").optional(),
  linkedinUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  githubUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileEditorProps {
  user: User;
}

export function ProfileEditor({ user }: ProfileEditorProps) {
  const { updateUser } = useAuth();
  const updateProfile = useUpdateProfileMutation();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || "",
      bio: user.bio || "",
      linkedinUrl: user.linkedinUrl || "",
      githubUrl: user.githubUrl || "",
    },
    mode: "onBlur",
  });

  const bioValue = watch("bio");
  const phoneValue = watch("phone");
  const linkedinValue = watch("linkedinUrl");
  const githubValue = watch("githubUrl");
  const bioLength = bioValue?.length || 0;

  // Calculate form completion in real-time
  const formStrength = useMemo(() => {
    const fields = {
      bio: !!bioValue && bioValue.length >= 50,
      phone: !!phoneValue,
      linkedin: !!linkedinValue,
      github: !!githubValue,
    };

    const completed = Object.values(fields).filter(Boolean).length;
    const total = Object.values(fields).length;
    const percentage = Math.round((completed / total) * 100);

    return {
      percentage,
      completed,
      total,
      level:
        percentage >= 75
          ? "Strong"
          : percentage >= 50
          ? "Good"
          : percentage >= 25
          ? "Fair"
          : "Weak",
    };
  }, [bioValue, phoneValue, linkedinValue, githubValue]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const updatedUser = await updateProfile.handleSubmit({
        fullName: data.fullName,
        phone: data.phone || undefined,
        bio: data.bio || undefined,
        linkedinUrl: data.linkedinUrl || undefined,
        githubUrl: data.githubUrl || undefined,
      });

      updateUser(updatedUser);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isLoading = isSubmitting || updateProfile.isPending;

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Intelligent Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-foreground">
                Profile Editor
              </h1>
              {isDirty && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-achievement/10 border border-achievement/20">
                  <div className="size-1.5 rounded-full bg-achievement animate-pulse" />
                  <span className="text-xs font-medium text-achievement">
                    Unsaved
                  </span>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {formStrength.completed}/{formStrength.total} sections complete •{" "}
              {formStrength.level} profile
            </p>
          </div>

          {!isDirty && updateProfile.isSuccess && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <CheckCircle2Icon className="size-4 text-primary" />
              <span className="text-xs font-medium text-primary">Saved</span>
            </div>
          )}
        </div>

        {/* Live Form Strength Indicator */}
        {isDirty && (
          <div className="p-5 rounded-xl border-2 border-primary/20 bg-primary/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <span className="text-xs text-primary uppercase tracking-wider font-semibold">
                  Form Completion
                </span>
              </div>
              <span className="text-lg font-bold text-primary tabular-nums">
                {formStrength.percentage}%
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${formStrength.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Identity Section */}
        <div className="space-y-6 p-6 rounded-xl border-2 border-border bg-card">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="size-2 rounded-full bg-primary" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Identity
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="fullName" className="text-sm font-medium">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fullName"
                {...register("fullName")}
                disabled={isLoading}
                aria-invalid={!!errors.fullName}
                className="h-10"
              />
              {errors.fullName && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircleIcon className="size-3" />
                  {errors.fullName.message}
                </p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <div className="relative">
                <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  {...register("email")}
                  disabled
                  className="h-10 pl-10 opacity-60 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Email cannot be changed after registration
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Phone Number
                </Label>
                {!phoneValue && (
                  <span className="text-xs text-achievement font-medium">
                    +10 points
                  </span>
                )}
              </div>
              <div className="relative">
                <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="phone"
                  type="tel"
                  {...register("phone")}
                  placeholder="+1 (555) 000-0000"
                  disabled={isLoading}
                  className="h-10 pl-10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div className="space-y-6 p-6 rounded-xl border-2 border-border bg-card">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="size-2 rounded-full bg-primary" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Professional Bio
              </h2>
            </div>
            {!bioValue && (
              <span className="text-xs text-achievement font-medium">
                +20 points
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="bio" className="text-sm font-medium">
                About You
              </Label>
              <span
                className={`text-xs tabular-nums ${
                  bioLength > 450
                    ? "text-destructive"
                    : bioLength > 400
                    ? "text-achievement"
                    : bioLength >= 50
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {bioLength} / 500
                {bioLength >= 50 && bioLength < 100 && (
                  <span className="ml-1 text-primary">• Good</span>
                )}
                {bioLength >= 100 && (
                  <span className="ml-1 text-primary">• Excellent</span>
                )}
              </span>
            </div>
            <textarea
              id="bio"
              {...register("bio")}
              placeholder="Tell employers what makes you unique...

Example: Full-stack developer with 3 years building EdTech platforms. Passionate about accessible learning tools and open-source contributions. Strong in React, Node.js, and cloud architecture."
              className="w-full min-h-32 rounded-lg border border-border bg-background px-4 py-3 text-sm leading-relaxed ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              disabled={isLoading}
            />
            {errors.bio && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircleIcon className="size-3" />
                {errors.bio.message}
              </p>
            )}
            {bioLength > 0 && bioLength < 50 && (
              <p className="text-xs text-achievement">
                Write {50 - bioLength} more characters for optimal impact
              </p>
            )}
            {bioLength >= 50 && (
              <p className="text-xs text-primary flex items-center gap-1">
                <CheckCircle2Icon className="size-3" />
                Strong bio length — profiles with detailed bios get 40% more
                views
              </p>
            )}
          </div>
        </div>

        {/* Social Links Section */}
        <div className="space-y-6 p-6 rounded-xl border-2 border-border bg-card">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="size-2 rounded-full bg-primary" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Professional Links
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="linkedinUrl" className="text-sm font-medium">
                  LinkedIn Profile
                </Label>
                {!linkedinValue && (
                  <span className="text-xs text-achievement font-medium">
                    +15 points
                  </span>
                )}
              </div>
              <div className="relative">
                <LinkedinIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="linkedinUrl"
                  type="url"
                  {...register("linkedinUrl")}
                  placeholder="https://linkedin.com/in/yourname"
                  disabled={isLoading}
                  aria-invalid={!!errors.linkedinUrl}
                  className="h-10 pl-10"
                />
              </div>
              {errors.linkedinUrl && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircleIcon className="size-3" />
                  {errors.linkedinUrl.message}
                </p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="githubUrl" className="text-sm font-medium">
                  GitHub Profile
                </Label>
                {!githubValue && user.role === "STUDENT" && (
                  <span className="text-xs text-achievement font-medium">
                    +15 points
                  </span>
                )}
              </div>
              <div className="relative">
                <GithubIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="githubUrl"
                  type="url"
                  {...register("githubUrl")}
                  placeholder="https://github.com/yourname"
                  disabled={isLoading}
                  aria-invalid={!!errors.githubUrl}
                  className="h-10 pl-10"
                />
              </div>
              {errors.githubUrl && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircleIcon className="size-3" />
                  {errors.githubUrl.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div
          className={`flex items-center justify-between pt-6 border-t border-border ${
            isDirty ? "sticky bottom-0 bg-background pb-4 -mb-4" : ""
          }`}
        >
          <div className="text-xs text-muted-foreground">
            {isDirty ? "You have unsaved changes" : "All changes saved"}
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={!isDirty || isLoading}
              onClick={() => window.location.reload()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isDirty || isLoading}
              className="gap-2 min-w-32"
            >
              {isLoading ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2Icon className="size-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
