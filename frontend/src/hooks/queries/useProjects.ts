import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { projectApi, type ListProjectsParams } from "@/api/project.api";
import { queryKeys } from "@/utils/queryKeys";
import { toast } from "sonner";
import type { Project } from "@/types";

/**
 * ===================================
 * QUERY HOOKS (Read Operations)
 * ===================================
 */

/**
 * Fetch paginated project list with filters
 *
 * Auto-caches for 5 minutes
 * Auto-refetches on window focus
 * Auto-retries once on failure
 */
export function useProjects(params: ListProjectsParams = {}) {
  return useQuery({
    queryKey: queryKeys.projects.list(params),
    queryFn: () => projectApi.listProjects(params),
    // Don't refetch on every component mount (data is fresh for 5min)
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch single project by ID
 *
 * CRITICAL: Uses separate query key from list
 * This prevents list queries from clearing detail cache
 */
export function useProject(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.projects.detail(id),
    queryFn: () => projectApi.getProjectById(id),
    // Only fetch if ID is provided
    enabled: options?.enabled ?? !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch current user's projects
 *
 * Separate query key for user-specific data
 */
export function useMyProjects() {
  return useQuery({
    queryKey: queryKeys.projects.myProjects(),
    queryFn: () => projectApi.getMyProjects(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch project applicants (owner only)
 */
export function useProjectApplicants(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projects.applicants(projectId),
    queryFn: () => projectApi.getProjectApplications(projectId),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2min - more volatile data
  });
}

/**
 * ===================================
 * MUTATION HOOKS (Write Operations)
 * ===================================
 */

/**
 * Create new project
 *
 * AUTOMATIC CACHE INVALIDATION:
 * - Invalidates all project lists (new project added)
 * - Does NOT invalidate detail pages (unaffected)
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Project>) => projectApi.createProject(data),

    onSuccess: (newProject) => {
      // Invalidate all project lists
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.lists(),
      });

      // Invalidate user's project list
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.myProjects(),
      });

      // Optional: Prefetch the new project detail page
      queryClient.setQueryData(
        queryKeys.projects.detail(newProject.id),
        newProject
      );

      toast.success("Project created!", {
        description: `"${newProject.title}" has been created successfully.`,
      });
    },

    onError: (error: any) => {
      toast.error("Failed to create project", {
        description:
          error.response?.data?.error?.message || "Please try again later",
      });
    },
  });
}

/**
 * Update existing project
 *
 * AUTOMATIC CACHE INVALIDATION:
 * - Invalidates THIS project's detail page
 * - Invalidates all project lists (title/status may have changed)
 *
 * OPTIMISTIC UPDATE:
 * - Immediately updates UI before server responds
 * - Rolls back on error
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Project> }) =>
      projectApi.updateProject(id, data),

    // OPTIMISTIC UPDATE: Update UI immediately
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches (so they don't overwrite optimistic update)
      await queryClient.cancelQueries({
        queryKey: queryKeys.projects.detail(id),
      });

      // Snapshot previous value for rollback
      const previousProject = queryClient.getQueryData<Project>(
        queryKeys.projects.detail(id)
      );

      // Optimistically update cache
      if (previousProject) {
        queryClient.setQueryData<Project>(queryKeys.projects.detail(id), {
          ...previousProject,
          ...data,
        });
      }

      // Return context for rollback
      return { previousProject };
    },

    onSuccess: (updatedProject) => {
      // Invalidate all project lists
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.lists(),
      });

      // Invalidate user's project list
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.myProjects(),
      });

      // Update detail cache with server response
      queryClient.setQueryData(
        queryKeys.projects.detail(updatedProject.id),
        updatedProject
      );

      toast.success("Project updated!", {
        description: `"${updatedProject.title}" has been updated.`,
      });
    },

    // Rollback on error
    onError: (error: any, { id }, context) => {
      // Restore previous value
      if (context?.previousProject) {
        queryClient.setQueryData(
          queryKeys.projects.detail(id),
          context.previousProject
        );
      }

      toast.error("Failed to update project", {
        description:
          error.response?.data?.error?.message || "Changes were not saved",
      });
    },
  });
}

/**
 * Delete project
 *
 * AUTOMATIC CACHE INVALIDATION:
 * - Removes project from detail cache
 * - Invalidates all lists
 *
 * OPTIMISTIC UPDATE:
 * - Immediately removes from lists
 * - Rolls back on error
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectApi.deleteProject(id),

    // OPTIMISTIC UPDATE: Remove from lists immediately
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.projects.all,
      });

      // Snapshot previous lists for rollback
      const previousLists = queryClient.getQueriesData({
        queryKey: queryKeys.projects.lists(),
      });

      // Optimistically remove from all lists
      queryClient.setQueriesData(
        { queryKey: queryKeys.projects.lists() },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.filter((p: Project) => p.id !== id),
          };
        }
      );

      return { previousLists };
    },

    onSuccess: (_, id) => {
      // Remove from detail cache
      queryClient.removeQueries({
        queryKey: queryKeys.projects.detail(id),
      });

      // Invalidate all lists (to get correct counts, etc.)
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.lists(),
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.myProjects(),
      });

      toast.success("Project deleted", {
        description: "The project has been permanently removed.",
      });
    },

    // Rollback on error
    onError: (error: any, _, context) => {
      // Restore previous lists
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      toast.error("Failed to delete project", {
        description:
          error.response?.data?.error?.message || "Please try again later",
      });
    },
  });
}
