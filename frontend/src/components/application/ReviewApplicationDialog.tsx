import type { Application } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  CheckCircle2Icon,
  Loader2Icon,
  XCircleIcon,
  EyeIcon,
} from "lucide-react";
import { useUpdateApplicationStatusMutation } from "@/hooks/mutations/useApplicationMutations";

interface ReviewApplicationDialogProps {
  application: Application | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const reviewSchema = z
  .object({
    status: z.enum(["ACCEPTED", "REJECTED", "UNDER_REVIEW"], {
      error: "Please select a decision",
    }),
    rejectionReason: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.status === "REJECTED" && !data.rejectionReason?.trim()) {
        return false;
      }
      return true;
    },
    {
      message: "Rejection reason is required when rejecting",
      path: ["rejectionReason"],
    }
  );

type ReviewFormData = z.infer<typeof reviewSchema>;

export function ReviewApplicationDialog({
  application,
  open,
  onOpenChange,
  onSuccess,
}: ReviewApplicationDialogProps) {
  const updateStatus = useUpdateApplicationStatusMutation();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting: isValidating },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      status: "UNDER_REVIEW",
      rejectionReason: "",
    },
  });

  const selectedStatus = watch("status");

  const onSubmit = async (data: ReviewFormData) => {
    if (!application) return;

    try {
      await updateStatus.handleSubmit({
        id: application.id,
        status: data.status,
        rejectionReason: data.rejectionReason?.trim() || undefined,
      });

      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const isLoading = isValidating || updateStatus.isPending;

  if (!application) return null;

  const statusOptions = [
    {
      value: "UNDER_REVIEW",
      label: "Mark as Under Review",
      icon: EyeIcon,
      gradient: "from-blue-500 to-indigo-500",
      description: "Still evaluating this candidate",
    },
    {
      value: "ACCEPTED",
      label: "Accept Application",
      icon: CheckCircle2Icon,
      gradient: "from-green-500 to-emerald-500",
      description: "Move forward with this candidate",
    },
    {
      value: "REJECTED",
      label: "Reject Application",
      icon: XCircleIcon,
      gradient: "from-red-500 to-rose-500",
      description: "Not a fit for this role",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-6 border-b">
          <DialogTitle className="text-2xl font-bold tracking-tight">
            Review Application
          </DialogTitle>
          <DialogDescription className="text-base">
            Evaluate {application.student?.fullName}'s application and provide
            feedback
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-6">
          {/* Applicant Profile Card */}
          <div className="rounded-xl bg-linear-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-2 border-indigo-100 dark:border-indigo-900/30 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center justify-center size-16 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 text-white font-bold text-2xl shadow-lg">
                {application.student?.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-foreground truncate">
                  {application.student?.fullName}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  {application.student?.email}
                </p>
              </div>
            </div>

            {/* Skills */}
            {application.student?.skills &&
              application.student.skills.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {application.student.skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="text-xs font-medium"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* Cover Letter */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-foreground">
              Cover Letter
            </Label>
            <div className="rounded-lg border-2 bg-muted/30 p-4 max-h-64 overflow-y-auto">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {application.coverLetter}
              </p>
            </div>
          </div>

          {/* Resume Link */}
          {application.resumeUrl && (
            <div className="space-y-3">
              <Label className="text-base font-semibold text-foreground">
                Resume
              </Label>
              <Button
                asChild
                variant="outline"
                size="default"
                className="w-full"
              >
                <a
                  href={application.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Resume
                </a>
              </Button>
            </div>
          )}

          {/* Review Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6 pt-6 border-t"
          >
            {/* Decision Selection */}
            <div className="space-y-3">
              <Label
                htmlFor="status"
                className="text-base font-semibold text-foreground"
              >
                Your Decision <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="h-auto py-8">
                      <SelectValue placeholder="Select decision" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            className="py-3"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex items-center justify-center size-10 rounded-lg bg-linear-to-br ${option.gradient} shadow-sm`}
                              >
                                <Icon className="size-5 text-white" />
                              </div>
                              <div className="text-left">
                                <p className="font-medium text-sm">
                                  {option.label}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {option.description}
                                </p>
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && (
                <p className="text-sm text-destructive">
                  {errors.status.message}
                </p>
              )}
            </div>

            {/* Rejection Reason (conditional) */}
            {selectedStatus === "REJECTED" && (
              <div className="space-y-3 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                <Label
                  htmlFor="rejectionReason"
                  className="text-base font-semibold text-foreground"
                >
                  Rejection Feedback <span className="text-destructive">*</span>
                </Label>
                <textarea
                  id="rejectionReason"
                  {...register("rejectionReason")}
                  placeholder="Provide constructive feedback to help the candidate improve..."
                  className="w-full min-h-32 rounded-lg border-2 bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  disabled={isLoading}
                />
                {errors.rejectionReason && (
                  <p className="text-sm text-destructive">
                    {errors.rejectionReason.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  This feedback will be visible to the applicant. Be
                  constructive and specific.
                </p>
              </div>
            )}

            {/* Submit Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 shadow-sm hover:shadow-md transition-all duration-200"
              >
                {isLoading ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Review"
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
