import { applicationApi } from "@/api/application.api";
import type { Application } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
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
import { CheckCircleIcon, Loader2Icon, XCircleIcon } from "lucide-react";

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
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
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
      await applicationApi.updateApplicationStatus(
        application.id,
        data.status,
        data.rejectionReason?.trim() || undefined
      );

      toast.success("Application reviewed!", {
        description: `Application has been marked as ${data.status
          .toLowerCase()
          .replace("_", " ")}.`,
      });

      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || "Failed to update application";
      toast.error("Review failed", {
        description: errorMessage,
      });
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  if (!application) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-150">
        <DialogHeader>
          <DialogTitle>Review Application</DialogTitle>
          <DialogDescription>
            Review {application.student?.fullName}'s application
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Applicant Info */}
          <div className="rounded-lg border bg-gray-50 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white font-semibold text-lg">
                {application.student?.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {application.student?.fullName}
                </p>
                <p className="text-sm text-gray-600">
                  {application.student?.email}
                </p>
              </div>
            </div>

            {/* Skills */}
            {application.student?.skills &&
              application.student.skills.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Skills:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {application.student.skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="text-xs"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* Cover Letter */}
          <div>
            <Label className="text-base">Cover Letter</Label>
            <div className="mt-2 rounded-lg border bg-white p-4 max-h-50 overflow-y-auto">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {application.coverLetter}
              </p>
            </div>
          </div>

          {/* Resume Link */}
          {application.resumeUrl && (
            <div>
              <Label className="text-base">Resume</Label>
              <div className="mt-2">
                <Button asChild variant="outline" size="sm">
                  <a
                    href={application.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Resume
                  </a>
                </Button>
              </div>
            </div>
          )}

          {/* Review Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 pt-4 border-t"
          >
            {/* Decision */}
            <div className="space-y-2">
              <Label htmlFor="status">
                Decision <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select decision" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UNDER_REVIEW">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                          Mark as Under Review
                        </div>
                      </SelectItem>
                      <SelectItem value="ACCEPTED">
                        <div className="flex items-center gap-2">
                          <CheckCircleIcon className="h-4 w-4 text-green-600" />
                          Accept Application
                        </div>
                      </SelectItem>
                      <SelectItem value="REJECTED">
                        <div className="flex items-center gap-2">
                          <XCircleIcon className="h-4 w-4 text-red-600" />
                          Reject Application
                        </div>
                      </SelectItem>
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
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">
                  Rejection Reason <span className="text-destructive">*</span>
                </Label>
                <textarea
                  id="rejectionReason"
                  {...register("rejectionReason")}
                  placeholder="Provide constructive feedback on why the application was rejected..."
                  className="w-full min-h-25 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSubmitting}
                />
                {errors.rejectionReason && (
                  <p className="text-sm text-destructive">
                    {errors.rejectionReason.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  This will be visible to the applicant
                </p>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <Loader2Icon className="h-4 w-4 animate-spin" />
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
