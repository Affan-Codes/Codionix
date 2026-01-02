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
