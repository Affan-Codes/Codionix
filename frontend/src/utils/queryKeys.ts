/**
 * Query Key Factory Pattern
 *
 * PROBLEM: Hardcoded query keys lead to bugs
 * Bad: useQuery({ queryKey: ["projects"] })
 * Bug: Can't invalidate specific project after update
 *
 * SOLUTION: Centralized key factory with hierarchy
 * Good: queryKeys.projects.detail(id) → ["projects", "detail", id]
 *
 * HIERARCHY:
 * - projects               → All project queries
 * - projects.lists()       → All project lists
 * - projects.list(filters) → Specific filtered list
 * - projects.details()     → All project details
 * - projects.detail(id)    → Specific project detail
 *
 * BENEFITS:
 * 1. Type-safe invalidation (TypeScript catches typos)
 * 2. Granular cache control (invalidate list ≠ invalidate details)
 * 3. Centralized cache structure (easy to audit)
 * 4. No hardcoded strings scattered across codebase
 */

import type { ListProjectsParams } from "@/api/project.api";

export const queryKeys = {
  // ===================================
  // PROJECTS
  // ===================================
  projects: {
    // Invalidate ALL project-related queries
    all: ["projects"] as const,

    // All project lists (with any filters)
    lists: () => [...queryKeys.projects.all, "list"] as const,

    // Specific filtered list
    list: (filters?: ListProjectsParams) =>
      [...queryKeys.projects.lists(), filters] as const,

    // All project details (any ID)
    details: () => [...queryKeys.projects.all, "detail"] as const,

    // Specific project detail
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,

    // Current user's projects
    myProjects: () => [...queryKeys.projects.all, "my-projects"] as const,

    // Project applicants
    applicants: (projectId: string) =>
      [...queryKeys.projects.detail(projectId), "applicants"] as const,
  },

  // ===================================
  // APPLICATIONS
  // ===================================
  applications: {
    all: ["applications"] as const,

    lists: () => [...queryKeys.applications.all, "list"] as const,

    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.applications.lists(), filters] as const,

    details: () => [...queryKeys.applications.all, "detail"] as const,

    detail: (id: string) => [...queryKeys.applications.details(), id] as const,

    myApplications: () =>
      [...queryKeys.applications.all, "my-applications"] as const,
  },

  // ===================================
  // USER
  // ===================================
  user: {
    all: ["user"] as const,

    current: () => [...queryKeys.user.all, "current"] as const,

    profile: (id?: string) =>
      id
        ? ([...queryKeys.user.all, "profile", id] as const)
        : ([...queryKeys.user.all, "profile"] as const),
  },

  // ===================================
  // AUTH
  // ===================================
  auth: {
    all: ["auth"] as const,

    session: () => [...queryKeys.auth.all, "session"] as const,
  },
} as const;
