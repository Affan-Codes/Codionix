import { applicationApi } from "@/api/application.api";
import { projectApi, type ListProjectsParams } from "@/api/project.api";
import { userApi } from "@/api/user.api";
import { queryKeys } from "@/utils/queryKeys";
import { useQuery } from "@tanstack/react-query";

// ===================================
// PROJECT QUERIES
// ===================================

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

// ===================================
// APPLICATION QUERIES
// ===================================

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

// ===================================
// USER QUERIES
// ===================================

/**
 * Fetch current user profile
 *
 * CRITICAL: This syncs with AuthContext
 * When user data updates here, AuthContext must also update
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.user.current(),
    queryFn: () => userApi.getCurrentUser(),
    staleTime: 10 * 60 * 1000, // 10min - user data rarely changes
    // Only fetch if user is authenticated
    enabled: !!localStorage.getItem("accessToken"),
  });
}
