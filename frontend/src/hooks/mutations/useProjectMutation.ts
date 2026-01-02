import type { Project } from "@/types";
import { useMutationFactory } from "../useMutationFactory";
import { projectApi } from "@/api/project.api";
import { queryKeys } from "@/utils/queryKeys";

/**
 * Create project mutation
 */
export function useCreateProjectMutation() {
  return useMutationFactory({
    mutationFn: (data: Partial<Project>) => projectApi.createProject(data),

    successMessage: (data) => `Project "${data.title}" created successfully!`,

    invalidateKeys: [
      queryKeys.projects.lists(),
      queryKeys.projects.myProjects(),
    ],
  });
}

/**
 * Update project mutation with optimistic updates
 */
export function useUpdateProjectMutation() {
  return useMutationFactory({
    mutationFn: ({ id, data }: { id: string; data: Partial<Project> }) =>
      projectApi.updateProject(id, data),

    successMessage: (updatedProject) =>
      `Project "${updatedProject.title}" updated successfully!`,

    invalidateKeys: [
      queryKeys.projects.lists(),
      queryKeys.projects.myProjects(),
    ],

    // Optimistic update
    onOptimistic: ({ id, data }, qc) => {
      const previousProject = qc.getQueryData<Project>(
        queryKeys.projects.detail(id)
      );

      if (previousProject) {
        qc.setQueryData<Project>(queryKeys.projects.detail(id), {
          ...previousProject,
          ...data,
        });
      }

      return { previousProject, id };
    },

    // Rollback on error
    onRollback: (context: any, qc) => {
      if (context?.previousProject) {
        qc.setQueryData(
          queryKeys.projects.detail(context.id),
          context.previousProject
        );
      }
    },
  });
}

/**
 * Delete project mutation with optimistic updates
 */
export function useDeleteProjectMutation() {
  return useMutationFactory({
    mutationFn: (id: string) => projectApi.deleteProject(id),

    successMessage: "Project deleted successfully",

    invalidateKeys: [
      queryKeys.projects.lists(),
      queryKeys.projects.myProjects(),
    ],

    // Optimistic update - remove from lists immediately
    onOptimistic: (id, qc) => {
      const previousLists = qc.getQueriesData({
        queryKey: queryKeys.projects.lists(),
      });

      qc.setQueriesData(
        { queryKey: queryKeys.projects.lists() },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.filter((p: Project) => p.id !== id),
          };
        }
      );

      return { previousLists, id };
    },

    // Rollback on error
    onRollback: (context: any, qc) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]: any) => {
          qc.setQueryData(queryKey, data);
        });
      }
    },
  });
}
