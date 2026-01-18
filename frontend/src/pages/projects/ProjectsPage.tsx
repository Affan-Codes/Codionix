import { Layout } from "@/components/layout/Layout";
import { ProjectCard } from "@/components/project/ProjectCard";
import { ProjectsFilters } from "@/components/project/ProjectsFilters";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { ROUTES } from "@/constants";
import { useAuth } from "@/context/AuthContext";
import { useProjects } from "@/hooks/queries/useQueries";
import type { Project } from "@/types";
import { queryClient } from "@/utils/queryClient";
import { queryKeys } from "@/utils/queryKeys";
import {
  Loader2Icon,
  PlusCircleIcon,
  SlidersHorizontalIcon,
  GridIcon,
  ListIcon,
  SparklesIcon,
  TrendingUpIcon,
  ClockIcon,
  FlameIcon,
  TargetIcon,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

type ViewMode = "grid" | "list";
type SortMode = "recent" | "urgent" | "popular" | "relevant";

export interface FilterState {
  search: string;
  projectType: string;
  difficultyLevel: string;
  status: string;
}

export default function ProjectsPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortMode, setSortMode] = useState<SortMode>("relevant");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    projectType: "",
    difficultyLevel: "",
    status: "PUBLISHED",
  });

  const hasActiveFilters =
    filters.search !== "" ||
    filters.projectType !== "" ||
    filters.difficultyLevel !== "" ||
    filters.status !== "PUBLISHED";

  // API filters
  const apiFilters = {
    search: filters.search || undefined,
    projectType:
      filters.projectType && filters.projectType !== "all"
        ? (filters.projectType as "PROJECT" | "INTERNSHIP")
        : undefined,
    difficultyLevel:
      filters.difficultyLevel && filters.difficultyLevel !== "all"
        ? (filters.difficultyLevel as "BEGINNER" | "INTERMEDIATE" | "ADVANCED")
        : undefined,
    status:
      filters.status && filters.status !== "all"
        ? (filters.status as "DRAFT" | "PUBLISHED" | "CLOSED")
        : undefined,
  };

  const queryParams = {
    page: currentPage,
    limit: 24,
    ...apiFilters,
  };

  const { data, isLoading, isError, error } = useProjects(queryParams);

  const projects = data?.data || [];
  const pagination = data?.pagination;

  // Client-side sorting
  const sortedProjects = useMemo(() => {
    const sorted = [...projects];

    switch (sortMode) {
      case "urgent": {
        return sorted.sort((a, b) => {
          const daysA =
            (new Date(a.deadline).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24);
          const daysB =
            (new Date(b.deadline).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24);
          return daysA - daysB;
        });
      }
      case "popular": {
        return sorted.sort((a, b) => b.currentApplicants - a.currentApplicants);
      }
      case "recent": {
        return sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      default:
        return sorted;
    }
  }, [projects, sortMode]);

  // Stats calculation
  const stats = useMemo(() => {
    const urgent = sortedProjects.filter((p) => {
      const days =
        (new Date(p.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return days <= 7;
    }).length;

    const hot = sortedProjects.filter((p) => p.currentApplicants > 10).length;

    return {
      total: pagination?.total || 0,
      showing: sortedProjects.length,
      urgent,
      hot,
    };
  }, [sortedProjects, pagination]);

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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      search: "",
      projectType: "",
      difficultyLevel: "",
      status: "PUBLISHED",
    });
    setCurrentPage(1);
  };

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
    navigate(`/projects/${projectId}`);
  };

  const handleEdit = (projectId: string) => {
    navigate(`/projects/${projectId}/edit`);
  };

  const canEditProject = (project: Project): boolean => {
    return isAuthenticated && user?.id === project.createdBy.id;
  };

  const isCreator =
    isAuthenticated && (user?.role === "MENTOR" || user?.role === "EMPLOYER");

  if (isError) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="inline-flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
              <TargetIcon className="size-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Failed to load projects
            </h3>
            <p className="text-sm text-muted-foreground">
              {(error as any)?.response?.data?.error?.message ||
                "Please try again"}
            </p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout maxWidth="full">
      <div className="flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="px-4 sm:px-6 py-4 space-y-4">
            {/* Top Row: Title + Actions */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                  Discover Projects
                </h1>
                <div className="flex flex-col items-start sm:items-center gap-3 mt-1 sm:flex-row">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold tabular-nums text-foreground">
                      {stats.showing}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold tabular-nums text-foreground">
                      {stats.total}
                    </span>{" "}
                    opportunities
                  </p>
                  <div className="flex items-center gap-1.5">
                    {stats.urgent > 0 && (
                      <Badge variant="destructive" className="gap-1 h-5">
                        <FlameIcon className="size-3" />
                        {stats.urgent} urgent
                      </Badge>
                    )}
                    {stats.hot > 0 && (
                      <Badge className="gap-1 h-5 bg-primary/10 text-primary border-primary/20">
                        <TrendingUpIcon className="size-3" />
                        {stats.hot} hot
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Filters (Mobile) */}
                <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 lg:hidden relative"
                    >
                      <SlidersHorizontalIcon className="size-4" />
                      Filters
                      {hasActiveFilters && (
                        <Badge className="absolute -top-1 -right-1 size-5 p-0 flex items-center justify-center rounded-full text-[10px] bg-primary">
                          !
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-70 p-6">
                    <VisuallyHidden>
                      <SheetTitle>Project Filters</SheetTitle>
                      <SheetDescription>
                        Filter projects by search, type, difficulty and status.
                      </SheetDescription>
                    </VisuallyHidden>
                    <div className="mt-6">
                      <ProjectsFilters
                        filters={filters}
                        onFilterChange={(newFilters) => {
                          handleFilterChange(newFilters);
                          setFiltersOpen(false);
                        }}
                        onClearFilters={() => {
                          handleClearFilters();
                          setFiltersOpen(false);
                        }}
                        hasActiveFilters={hasActiveFilters}
                      />
                    </div>
                  </SheetContent>
                </Sheet>

                {/* View Toggle */}
                <div className="hidden sm:flex items-center gap-1 bg-muted rounded-lg p-1">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="h-7 w-7 p-0"
                  >
                    <GridIcon className="size-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="h-7 w-7 p-0"
                  >
                    <ListIcon className="size-4" />
                  </Button>
                </div>

                {/* Create (Desktop) */}
                {isCreator && (
                  <Button
                    size="sm"
                    onClick={() => navigate(ROUTES.CREATE_PROJECT)}
                    className="gap-2 hidden sm:flex"
                  >
                    <PlusCircleIcon className="size-4" />
                    Create
                  </Button>
                )}
              </div>
            </div>

            {/* Bottom Row: Sort Tabs */}
            <Tabs
              value={sortMode}
              onValueChange={(v) => setSortMode(v as SortMode)}
            >
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="relevant" className="gap-1.5">
                  <SparklesIcon className="size-3.5" />
                  Relevant
                </TabsTrigger>
                <TabsTrigger value="urgent" className="gap-1.5">
                  <ClockIcon className="size-3.5" />
                  Urgent
                </TabsTrigger>
                <TabsTrigger value="popular" className="gap-1.5">
                  <TrendingUpIcon className="size-3.5" />
                  Popular
                </TabsTrigger>
                <TabsTrigger value="recent" className="gap-1.5">
                  Recent
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Filters Sidebar (Desktop) */}
          <aside className="hidden lg:block w-72 border-r border-border bg-muted/20 overflow-y-auto scrollbar-hide">
            <div className="p-6">
              <ProjectsFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                hasActiveFilters={hasActiveFilters}
              />
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto scrollbar-hide">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3">
                  <Loader2Icon className="size-10 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Loading projects...
                  </p>
                </div>
              </div>
            ) : sortedProjects.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4 max-w-sm px-4">
                  <TargetIcon className="size-12 text-muted-foreground mx-auto" />
                  <h3 className="text-lg font-semibold text-foreground">
                    No projects found
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {hasActiveFilters
                      ? "Try adjusting your filters"
                      : "Check back soon for new opportunities"}
                  </p>
                  {hasActiveFilters && (
                    <Button variant="outline" onClick={handleClearFilters}>
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-6 space-y-6">
                {/* Grid View */}
                {viewMode === "grid" && (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {sortedProjects.map((project) => {
                      const canEdit = canEditProject(project);
                      const canApply =
                        isAuthenticated && user?.role === "STUDENT" && !canEdit;

                      return (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          viewMode="grid"
                          onApply={canApply ? handleApply : undefined}
                          onEdit={canEdit ? handleEdit : undefined}
                        />
                      );
                    })}
                  </div>
                )}

                {/* List View */}
                {viewMode === "list" && (
                  <div className="space-y-3">
                    {sortedProjects.map((project) => {
                      const canEdit = canEditProject(project);
                      const canApply =
                        isAuthenticated && user?.role === "STUDENT" && !canEdit;

                      return (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          viewMode="list"
                          onApply={canApply ? handleApply : undefined}
                          onEdit={canEdit ? handleEdit : undefined}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex justify-center pt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() =>
                              pagination.hasPrevPage &&
                              handlePageChange(currentPage - 1)
                            }
                            onMouseEnter={() =>
                              pagination.hasPrevPage &&
                              prefetchPage(currentPage - 1)
                            }
                            className={
                              !pagination.hasPrevPage
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>

                        {Array.from(
                          { length: Math.min(pagination.totalPages, 7) },
                          (_, i) => {
                            let pageNum: number;
                            if (pagination.totalPages <= 7) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              if (i < 5) pageNum = i + 1;
                              else if (i === 5)
                                return (
                                  <PaginationItem key="ellipsis-end">
                                    <PaginationEllipsis />
                                  </PaginationItem>
                                );
                              else pageNum = pagination.totalPages;
                            } else if (
                              currentPage >=
                              pagination.totalPages - 2
                            ) {
                              if (i === 0) pageNum = 1;
                              else if (i === 1)
                                return (
                                  <PaginationItem key="ellipsis-start">
                                    <PaginationEllipsis />
                                  </PaginationItem>
                                );
                              else pageNum = pagination.totalPages - 6 + i;
                            } else {
                              if (i === 0) pageNum = 1;
                              else if (i === 1)
                                return (
                                  <PaginationItem key="ellipsis-start">
                                    <PaginationEllipsis />
                                  </PaginationItem>
                                );
                              else if (i === 5)
                                return (
                                  <PaginationItem key="ellipsis-end">
                                    <PaginationEllipsis />
                                  </PaginationItem>
                                );
                              else if (i === 6) pageNum = pagination.totalPages;
                              else pageNum = currentPage + i - 3;
                            }

                            return (
                              <PaginationItem key={pageNum}>
                                <PaginationLink
                                  onClick={() => handlePageChange(pageNum)}
                                  isActive={pageNum === currentPage}
                                  onMouseEnter={() => prefetchPage(pageNum)}
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
                            onMouseEnter={() =>
                              pagination.hasNextPage &&
                              prefetchPage(currentPage + 1)
                            }
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
              </div>
            )}
          </main>
        </div>

        {/* Mobile FAB */}
        {isCreator && (
          <Button
            size="lg"
            onClick={() => navigate(ROUTES.CREATE_PROJECT)}
            className="sm:hidden fixed bottom-6 right-6 size-14 rounded-full shadow-lg gap-0 p-0 z-50"
          >
            <PlusCircleIcon className="size-6" />
          </Button>
        )}
      </div>
    </Layout>
  );
}
