import { Layout } from "@/components/layout/Layout";
import { ProjectCard } from "@/components/project/ProjectCard";
import {
  getApiFilters,
  ProjectsFilters,
  type FilterState,
} from "@/components/project/ProjectsFilters";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ROUTES } from "@/constants";
import { useAuth } from "@/context/AuthContext";
import { useProjects } from "@/hooks/queries/useQueries";
import type { Project } from "@/types";
import { queryClient } from "@/utils/queryClient";
import { queryKeys } from "@/utils/queryKeys";
import { Loader2Icon, PlusCircleIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

export default function ProjectsPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    projectType: "",
    difficultyLevel: "",
    status: "PUBLISHED",
  });

  // Check if filters are active (excluding default status)
  const hasActiveFilters =
    filters.search !== "" ||
    filters.projectType !== "" ||
    filters.difficultyLevel !== "" ||
    filters.status !== "PUBLISHED";

  // Build query params
  const apiFilters = getApiFilters(filters);
  const queryParams = {
    page: currentPage,
    limit: 12,
    ...(apiFilters.search && { search: apiFilters.search }),
    ...(apiFilters.projectType && {
      projectType: apiFilters.projectType as "PROJECT" | "INTERNSHIP",
    }),
    ...(apiFilters.difficultyLevel && {
      difficultyLevel: apiFilters.difficultyLevel as
        | "BEGINNER"
        | "INTERMEDIATE"
        | "ADVANCED",
    }),
    ...(apiFilters.status && {
      status: apiFilters.status as "DRAFT" | "PUBLISHED" | "CLOSED",
    }),
  };

  const { data, isLoading, isError, error } = useProjects(queryParams);

  const projects = data?.data || [];
  const pagination = data?.pagination;

  const prefetchPage = useCallback(
    (pageNumber: number) => {
      const prefetchParams = { ...queryParams, page: pageNumber };

      queryClient.ensureQueryData({
        queryKey: queryKeys.projects.list(prefetchParams),
        queryFn: async () => {
          const { projectApi } = await import("@/api/project.api");
          return projectApi.listProjects(prefetchParams);
        },
        staleTime: 5 * 60 * 1000,
      });
    },
    [queryClient, queryParams]
  );

  const handlePrefetchNext = useCallback(() => {
    if (pagination?.hasNextPage) {
      prefetchPage(currentPage + 1);
    }
  }, [pagination?.hasNextPage, currentPage, prefetchPage]);

  const handlePrefetchPrevious = useCallback(() => {
    if (pagination?.hasPrevPage) {
      prefetchPage(currentPage - 1);
    }
  }, [pagination?.hasPrevPage, currentPage, prefetchPage]);

  // Handle filter changes
  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page on filter change
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setFilters({
      search: "",
      projectType: "",
      difficultyLevel: "",
      status: "PUBLISHED",
    });
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle apply action
  const handleApply = (projectId: string) => {
    if (!isAuthenticated) {
      toast.error("Please login to apply");
      navigate(ROUTES.LOGIN);
      return;
    }

    if (user?.role !== "STUDENT") {
      toast.error("Only students can apply to projects");
      return;
    }

    // Navigate to project detail page where they can apply
    navigate(`/projects/${projectId}`);
  };

  // Handle edit action
  const handleEdit = (projectId: string) => {
    navigate(`/projects/${projectId}/edit`);
  };

  // Check if user can edit project
  const canEditProject = (project: Project): boolean => {
    return isAuthenticated && user?.id === project.createdBy.id;
  };

  if (isError) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-4">
            <PlusCircleIcon className="h-8 w-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Failed to load projects
          </h3>
          <p className="text-gray-600 mb-4">
            {(error as any)?.response?.data?.error?.message ||
              "Please try again later"}
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Browse Projects
            </h1>
            <p className="mt-2 text-gray-600">
              {pagination?.total}{" "}
              {pagination?.total === 1 ? "project" : "projects"} available
            </p>
          </div>

          {/* Create Project Button (Mentor/Employer only) */}
          {isAuthenticated &&
            (user?.role === "MENTOR" || user?.role === "EMPLOYER") && (
              <Button onClick={() => navigate(ROUTES.CREATE_PROJECT)}>
                <PlusCircleIcon /> Create Project
              </Button>
            )}
        </div>

        {/* Filters */}
        <ProjectsFilters
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2Icon className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && projects.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
              <PlusCircleIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No projects found
            </h3>
            <p className="text-gray-600 mb-4">
              {hasActiveFilters
                ? "Try adjusting your filters"
                : "Be the first to create a project!"}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        )}

        {/* Projects Grid */}
        {!isLoading && projects.length > 0 && (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => {
                const canEdit = canEditProject(project);
                const canApply =
                  isAuthenticated && user?.role === "STUDENT" && !canEdit;

                return (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    showActions={true}
                    onApply={canApply ? handleApply : undefined}
                    onEdit={canEdit ? handleEdit : undefined}
                  />
                );
              })}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-8">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() =>
                          pagination.hasPrevPage &&
                          handlePageChange(currentPage - 1)
                        }
                        onMouseEnter={handlePrefetchPrevious}
                        onFocus={handlePrefetchPrevious}
                        className={
                          !pagination.hasPrevPage
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>

                    {/* Page Numbers */}
                    {Array.from(
                      { length: Math.min(pagination.totalPages, 7) },
                      (_, i) => {
                        let pageNum: number;

                        if (pagination.totalPages <= 7) {
                          // Show all pages
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          // Near start
                          if (i < 5) {
                            pageNum = i + 1;
                          } else if (i === 5) {
                            return (
                              <PaginationItem key="ellipsis-end">
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          } else {
                            pageNum = pagination.totalPages;
                          }
                        } else if (currentPage >= pagination.totalPages - 2) {
                          // Near end
                          if (i === 0) {
                            pageNum = 1;
                          } else if (i === 1) {
                            return (
                              <PaginationItem key="ellipsis-start">
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          } else {
                            pageNum = pagination.totalPages - 6 + i;
                          }
                        } else {
                          // Middle
                          if (i === 0) {
                            pageNum = 1;
                          } else if (i === 1) {
                            return (
                              <PaginationItem key="ellipsis-start">
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          } else if (i === 5) {
                            return (
                              <PaginationItem key="ellipsis-end">
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          } else if (i === 6) {
                            pageNum = pagination.totalPages;
                          } else {
                            pageNum = currentPage + i - 3;
                          }
                        }

                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => handlePageChange(pageNum)}
                              isActive={pageNum === currentPage}
                              onMouseEnter={() => prefetchPage(pageNum)}
                              onFocus={() => prefetchPage(pageNum)}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                    )}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          pagination.hasNextPage &&
                          handlePageChange(currentPage + 1)
                        }
                        onMouseEnter={handlePrefetchNext}
                        onFocus={handlePrefetchNext}
                        className={
                          !pagination.hasNextPage
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
