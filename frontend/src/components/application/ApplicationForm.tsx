import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Lightbulb,
} from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateApplicationMutation } from "@/hooks/mutations/useApplicationMutations";
import { queryKeys } from "@/utils/queryKeys";
import { useState, useEffect, useMemo } from "react";

interface ApplicationFormProps {
  projectId: string;
  onSuccess: () => void;
  skillMatch?: number;
  missingSkills?: string[];
  competitionLevel?: "low" | "moderate" | "high" | "critical";
}

const applicationSchema = z.object({
  coverLetter: z
    .string()
    .min(50, "Cover letter must be at least 50 characters")
    .max(1000, "Cover letter must not exceed 1000 characters")
    .trim(),
  resumeUrl: z.url("Invalid URL format").optional().or(z.literal("")),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

export function ApplicationForm({
  projectId,
  onSuccess,
  skillMatch = 0,
  missingSkills = [],
  competitionLevel = "moderate",
}: ApplicationFormProps) {
  const queryClient = useQueryClient();
  const createApplication = useCreateApplicationMutation();
  const [focusTime, setFocusTime] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting: isValidating },
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      coverLetter: "",
      resumeUrl: "",
    },
    mode: "onBlur",
  });

  const coverLetterValue = watch("coverLetter");
  const resumeUrl = watch("resumeUrl");

  // Track time spent on cover letter
  useEffect(() => {
    if (coverLetterValue && coverLetterValue.length > 10) {
      const interval = setInterval(() => {
        setFocusTime((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [coverLetterValue]);

  // Application Strength Analysis
  const strength = useMemo(() => {
    const length = coverLetterValue?.length || 0;
    const hasResume = !!resumeUrl && resumeUrl.length > 0;
    const wordCount = coverLetterValue
      ? coverLetterValue.trim().split(/\s+/).length
      : 0;

    // Quality signals
    const hasSkillMentions = missingSkills.some((skill) =>
      coverLetterValue?.toLowerCase().includes(skill.toLowerCase())
    );
    const hasNumbers = /\d+/.test(coverLetterValue || "");
    const avgWordLength = wordCount > 0 ? length / wordCount : 0;
    const hasParagraphs = (coverLetterValue?.split("\n\n") || []).length > 1;

    // Calculate strength score (0-100)
    let score = 0;

    // Length bonus (0-30 points)
    if (length >= 800) score += 30;
    else if (length >= 600) score += 25;
    else if (length >= 400) score += 20;
    else if (length >= 200) score += 15;
    else if (length >= 100) score += 10;
    else if (length >= 50) score += 5;

    // Quality bonuses
    if (hasResume) score += 15;
    if (hasSkillMentions) score += 15;
    if (hasNumbers) score += 10;
    if (avgWordLength > 4.5) score += 10;
    if (hasParagraphs) score += 10;
    if (wordCount > 50) score += 10;

    // Penalties
    if (focusTime < 60 && length > 200) score -= 10;

    score = Math.max(0, Math.min(100, score));

    return {
      score,
      level:
        score >= 80
          ? "strong"
          : score >= 60
          ? "good"
          : score >= 40
          ? "fair"
          : "weak",
      signals: {
        hasResume,
        hasSkillMentions,
        hasNumbers,
        hasParagraphs,
        wordCount,
        length,
        focusTime,
      },
    };
  }, [coverLetterValue, resumeUrl, missingSkills, focusTime]);

  // Smart suggestions
  const suggestions = useMemo(() => {
    const tips = [];

    if (!strength.signals.hasResume && competitionLevel !== "low") {
      tips.push("Add resume link to strengthen application");
    }

    if (missingSkills.length > 0 && !strength.signals.hasSkillMentions) {
      tips.push(`Address ${missingSkills[0]} gap with transferable experience`);
    }

    if (strength.signals.wordCount < 50 && strength.signals.length > 100) {
      tips.push("Break into shorter sentences for clarity");
    }

    if (!strength.signals.hasParagraphs && strength.signals.length > 200) {
      tips.push("Add paragraph breaks to improve readability");
    }

    if (!strength.signals.hasNumbers && skillMatch >= 60) {
      tips.push("Quantify achievements (e.g., '3 years experience')");
    }

    if (competitionLevel === "critical" && strength.score < 70) {
      tips.push("High competition - strengthen with specific examples");
    }

    return tips;
  }, [strength, missingSkills, skillMatch, competitionLevel]);

  const onSubmit = async (data: ApplicationFormData) => {
    try {
      await createApplication.handleSubmit({
        projectId,
        coverLetter: data.coverLetter,
        resumeUrl: data.resumeUrl || undefined,
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });

      onSuccess();
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const isLoading = isValidating || createApplication.isPending;

  const strengthColor = {
    strong: "text-primary",
    good: "text-achievement",
    fair: "text-achievement",
    weak: "text-muted-foreground",
  }[strength.level];

  const strengthBg = {
    strong: "bg-primary",
    good: "bg-achievement",
    fair: "bg-achievement/70",
    weak: "bg-muted-foreground",
  }[strength.level];

  return (
    <div className="space-y-6">
      {/* Application Strength Meter */}
      {coverLetterValue && coverLetterValue.length > 20 && (
        <div className="p-4 rounded-lg border-2 border-border bg-background">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Application Strength
            </span>
            <div className="flex items-center gap-2">
              {strength.level === "strong" && (
                <CheckCircle2 className="size-4 text-primary" />
              )}
              {strength.level === "weak" && (
                <AlertCircle className="size-4 text-muted-foreground" />
              )}
              <span
                className={`text-lg font-bold tabular-nums ${strengthColor}`}
              >
                {strength.score}
              </span>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
            <div
              className={`h-full transition-all duration-500 ${strengthBg}`}
              style={{ width: `${strength.score}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {strength.level === "strong" && "Excellent - ready to submit"}
            {strength.level === "good" && "Good - consider adding details"}
            {strength.level === "fair" && "Fair - needs improvement"}
            {strength.level === "weak" && "Weak - add more content"}
          </div>
        </div>
      )}

      {/* Smart Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
            <Lightbulb className="size-3.5" />
            <span>Suggestions</span>
          </div>
          <div className="space-y-2">
            {suggestions.map((tip, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-foreground"
              >
                <TrendingUp className="size-4 text-primary shrink-0 mt-0.5" />
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Context Alert */}
      {competitionLevel === "critical" && (
        <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-destructive mb-1">
                High Competition
              </div>
              <div className="text-foreground">
                This project is filling fast. Make your application stand out
                with specific examples and quantified achievements.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Cover Letter */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="coverLetter" className="text-sm font-medium">
              Cover Letter <span className="text-destructive">*</span>
            </Label>
            <span
              className={`text-xs tabular-nums ${
                (coverLetterValue?.length || 0) < 50
                  ? "text-destructive"
                  : (coverLetterValue?.length || 0) > 900
                  ? "text-achievement"
                  : "text-muted-foreground"
              }`}
            >
              {coverLetterValue?.length || 0} / 1000
            </span>
          </div>
          <textarea
            id="coverLetter"
            {...register("coverLetter")}
            placeholder="Why are you the right fit for this project? What specific value will you bring?

• Highlight relevant experience with concrete examples
• Address any skill gaps with transferable knowledge
• Explain your motivation and what you'll gain
• Be specific - avoid generic statements"
            className="w-full min-h-64 rounded-lg border border-border bg-background px-4 py-3 text-sm leading-relaxed ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none font-mono"
            disabled={isLoading}
            aria-invalid={!!errors.coverLetter}
          />
          {errors.coverLetter && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <AlertCircle className="size-3.5" />
              {errors.coverLetter.message}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{strength.signals.wordCount} words</span>
            {focusTime > 30 && (
              <span className="text-primary">
                {Math.floor(focusTime / 60)}m {focusTime % 60}s spent
              </span>
            )}
          </div>
        </div>

        {/* Resume URL */}
        <div className="space-y-3">
          <Label htmlFor="resumeUrl" className="text-sm font-medium">
            Resume URL{" "}
            <span className="text-muted-foreground text-xs">(Optional)</span>
          </Label>
          <Input
            id="resumeUrl"
            type="url"
            {...register("resumeUrl")}
            placeholder="https://drive.google.com/... or https://linkedin.com/in/..."
            aria-invalid={!!errors.resumeUrl}
            disabled={isLoading}
          />
          {errors.resumeUrl ? (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <AlertCircle className="size-3.5" />
              {errors.resumeUrl.message}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Google Drive, Dropbox, LinkedIn, or personal website
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button
            type="submit"
            disabled={isLoading || strength.score < 40}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Application"
            )}
          </Button>
        </div>

        {strength.score < 40 && !isLoading && (
          <p className="text-xs text-center text-muted-foreground">
            Application strength too low - add more detail to enable submission
          </p>
        )}
      </form>
    </div>
  );
}
