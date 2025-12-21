import { applicationApi } from "@/api/application.api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Loader2Icon } from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";

interface ApplicationFormProps {
  projectId: string;
  projectTitle: string;
  onSuccess: () => void;
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
  projectTitle,
  onSuccess,
}: ApplicationFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      coverLetter: "",
      resumeUrl: "",
    },
  });

  const coverLetterValue = watch("coverLetter");

  const onSubmit = async (data: ApplicationFormData) => {
    try {
      await applicationApi.createApplication({
        projectId,
        coverLetter: data.coverLetter,
        resumeUrl: data.resumeUrl || undefined,
      });

      toast.success("Application submitted!", {
        description: "You'll be notified when the project owner reviews it.",
      });

      onSuccess();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || "Failed to submit application";
      toast.error("Application failed", {
        description: errorMessage,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apply to {projectTitle}</CardTitle>
        <CardDescription>
          Tell the project owner why you're a great fit for this opportunity
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Cover Letter */}
          <div className="space-y-2">
            <Label htmlFor="coverLetter">
              Cover Letter <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="coverLetter"
              {...register("coverLetter")}
              placeholder="Explain your interest, relevant skills, and what you hope to learn..."
              className="w-full min-h-50 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
            />
            {errors.coverLetter && (
              <p className="text-sm text-destructive">
                {errors.coverLetter.message}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {coverLetterValue?.length || 0}/1000 characters (minimum 50)
            </p>
          </div>

          {/* Resume URL */}
          <div className="space-y-2">
            <Label htmlFor="resumeUrl">Resume URL (Optional)</Label>
            <Input
              id="resumeUrl"
              type="url"
              {...register("resumeUrl")}
              placeholder="https://drive.google.com/..."
              disabled={isSubmitting}
            />
            {errors.resumeUrl && (
              <p className="text-sm text-destructive">
                {errors.resumeUrl.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Link to your resume (Google Drive, Dropbox, etc.)
            </p>
          </div>

          {/* Submit Button */}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2Icon className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Application"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
