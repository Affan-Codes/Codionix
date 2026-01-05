import {
  applicationApi,
  type CreateApplicationInput,
} from "@/api/application.api";
import { useMutationFactory } from "../useMutationFactory";
import { queryKeys } from "@/utils/queryKeys";
import type { Application } from "@/types";

/**
 * Create application mutation
 */
export function useCreateApplicationMutation() {
  return useMutationFactory({
    mutationFn: (data: CreateApplicationInput) =>
      applicationApi.createApplication(data),

    successMessage: "Application submitted successfully!",

    invalidateKeys: [
      queryKeys.applications.lists(),
      queryKeys.applications.myApplications(),
    ],

    // Custom error handling for better UX
    getErrorMessage: (error: any) => {
      const status = error?.response?.status;
      const message = error?.response?.data?.error?.message;

      // Handle specific error cases with actionable guidance
      if (status === 409) {
        return "You've already applied to this project. Check 'My Applications' to track its status.";
      }

      if (status === 400) {
        // Validation errors (project full, unpublished, etc.)
        return message || "Cannot apply to this project at this time.";
      }

      if (status === 404) {
        return "This project no longer exists or has been removed.";
      }

      // Network/server errors
      if (error?.isNetworkError) {
        return "Network error. Please check your connection and try again.";
      }

      if (status >= 500) {
        return "Server error. Please try again in a moment.";
      }

      // Fallback to generic or API message
      return message || "Failed to submit application. Please try again.";
    },

    // Also invalidate the specific project (currentApplicants changed)
    // This is handled after mutation completes
  });
}

/**
 * Update application status mutation with optimistic updates
 */
export function useUpdateApplicationStatusMutation() {
  return useMutationFactory({
    mutationFn: ({
      id,
      status,
      rejectionReason,
    }: {
      id: string;
      status: string;
      rejectionReason?: string;
    }) => applicationApi.updateApplicationStatus(id, status, rejectionReason),

    successMessage: (updatedApplication) => {
      const statusText =
        {
          PENDING: "pending",
          UNDER_REVIEW: "under review",
          ACCEPTED: "accepted",
          REJECTED: "rejected",
        }[updatedApplication.status] || updatedApplication.status;

      return `Application marked as ${statusText}`;
    },

    invalidateKeys: [queryKeys.applications.lists()],

    // Custom error handling with actionable guidance
    getErrorMessage: (error: any) => {
      const status = error?.response?.status;
      const message = error?.response?.data?.error?.message;

      if (status === 403) {
        return "You don't have permission to update this application.";
      }

      if (status === 404) {
        return "Application not found. It may have been deleted.";
      }

      if (status === 400) {
        // Validation error (e.g., missing rejection reason)
        return message || "Invalid status update request.";
      }

      // Network/server errors
      if (error?.isNetworkError) {
        return "Network error. Please check your connection and try again.";
      }

      if (status >= 500) {
        return "Server error. Please try again in a moment.";
      }

      return message || "Failed to update application status.";
    },

    // Optimistic update
    onOptimistic: ({ id, status, rejectionReason }, qc) => {
      const previousApplication = qc.getQueryData<Application>(
        queryKeys.applications.detail(id)
      );

      if (previousApplication) {
        qc.setQueryData<Application>(queryKeys.applications.detail(id), {
          ...previousApplication,
          status: status as any,
          rejectionReason:
            rejectionReason || previousApplication.rejectionReason,
          reviewedAt: new Date().toISOString(),
        });
      }

      return { previousApplication, id };
    },

    // Rollback on error
    onRollback: (context: any, qc) => {
      if (context?.previousApplication) {
        qc.setQueryData(
          queryKeys.applications.detail(context.id),
          context.previousApplication
        );
      }
    },
  });
}
