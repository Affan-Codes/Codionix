import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  applicationApi,
  type CreateApplicationInput,
} from "@/api/application.api";
import { queryKeys } from "@/utils/queryKeys";
import { toast } from "sonner";
import type { Application } from "@/types";

/**
 * ===================================
 * QUERY HOOKS (Read Operations)
 * ===================================
 */

/**
 * Fetch current user's applications (students only)
 */
export function useMyApplications() {
  return useQuery({
    queryKey: queryKeys.applications.myApplications(),
    queryFn: () => applicationApi.getMyApplications(),
    staleTime: 2 * 60 * 1000, // 2min - more volatile than projects
  });
}

/**
 * Fetch single application by ID
 */
export function useApplication(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.applications.detail(id),
    queryFn: () => applicationApi.getApplicationById(id),
    enabled: options?.enabled ?? !!id,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * ===================================
 * MUTATION HOOKS (Write Operations)
 * ===================================
 */

/**
 * Create new application
 *
 * AUTOMATIC CACHE INVALIDATION:
 * - Invalidates application lists (new application added)
 * - Invalidates SPECIFIC project detail (currentApplicants count changed)
 */
export function useCreateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateApplicationInput) =>
      applicationApi.createApplication(data),

    onSuccess: (_newApplication, variables) => {
      // Invalidate application lists
      queryClient.invalidateQueries({
        queryKey: queryKeys.applications.lists(),
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.applications.myApplications(),
      });

      // CRITICAL: Invalidate SPECIFIC project detail (currentApplicants changed)
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });

      // Invalidate project applicants list (if viewing applicants page)
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.applicants(variables.projectId),
      });

      toast.success("Application submitted!", {
        description: "You'll be notified when the project owner reviews it.",
      });
    },

    onError: (error: any) => {
      toast.error("Failed to submit application", {
        description:
          error.response?.data?.error?.message || "Please try again later",
      });
    },
  });
}

/**
 * Update application status (project owner only)
 *
 * AUTOMATIC CACHE INVALIDATION:
 * - Invalidates THIS application's detail page
 * - Invalidates all application lists
 * - Invalidates project applicants list
 *
 * OPTIMISTIC UPDATE:
 * - Immediately updates status in UI
 * - Rolls back on error
 */
export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      rejectionReason,
    }: {
      id: string;
      status: string;
      rejectionReason?: string;
    }) => applicationApi.updateApplicationStatus(id, status, rejectionReason),

    // OPTIMISTIC UPDATE: Update status immediately
    onMutate: async ({ id, status, rejectionReason }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.applications.detail(id),
      });

      // Snapshot previous value
      const previousApplication = queryClient.getQueryData<Application>(
        queryKeys.applications.detail(id)
      );

      // Optimistically update cache
      if (previousApplication) {
        queryClient.setQueryData<Application>(
          queryKeys.applications.detail(id),
          {
            ...previousApplication,
            status: status as any,
            rejectionReason:
              rejectionReason || previousApplication.rejectionReason,
            reviewedAt: new Date().toISOString(),
          }
        );
      }

      return { previousApplication };
    },

    onSuccess: (updatedApplication) => {
      // Update detail cache with server response
      queryClient.setQueryData(
        queryKeys.applications.detail(updatedApplication.id),
        updatedApplication
      );

      // Invalidate all application lists
      queryClient.invalidateQueries({
        queryKey: queryKeys.applications.lists(),
      });

      // Invalidate project applicants list
      if (updatedApplication.project?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.applicants(
            updatedApplication.project.id
          ),
        });
      }

      const statusText =
        {
          PENDING: "pending",
          UNDER_REVIEW: "under review",
          ACCEPTED: "accepted",
          REJECTED: "rejected",
        }[updatedApplication.status] || updatedApplication.status;

      toast.success("Application reviewed!", {
        description: `Application has been marked as ${statusText}.`,
      });
    },

    // Rollback on error
    onError: (error: any, { id }, context) => {
      // Restore previous value
      if (context?.previousApplication) {
        queryClient.setQueryData(
          queryKeys.applications.detail(id),
          context.previousApplication
        );
      }

      toast.error("Failed to update application", {
        description:
          error.response?.data?.error?.message || "Changes were not saved",
      });
    },
  });
}
