import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants";
import { useMyApplications } from "@/hooks/queries/useQueries";
import {
  Loader2Icon,
  SearchIcon,
  TargetIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ApplicationTable } from "@/components/application/ApplicationTable";
import { ApplicationDetailPanel } from "@/components/application/ApplicationDetailPanel";
import { ApplicationFilters } from "@/components/application/ApplicationFilters";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import type { Application } from "@/types";

export type SortKey = "applied" | "status" | "urgency" | "company";
export type SortDir = "asc" | "desc";
export type StatusFilter =
  | "all"
  | "active"
  | "pending"
  | "review"
  | "accepted"
  | "rejected";

export default function MyApplications() {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>("applied");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const {
    data: applications = [],
    isLoading,
    isError,
    error,
  } = useMyApplications();

  // Filter applications
  const filtered = useMemo(() => {
    let result = applications;

    switch (statusFilter) {
      case "active":
        result = result.filter(
          (a) => a.status === "PENDING" || a.status === "UNDER_REVIEW"
        );
        break;
      case "pending":
        result = result.filter((a) => a.status === "PENDING");
        break;
      case "review":
        result = result.filter((a) => a.status === "UNDER_REVIEW");
        break;
      case "accepted":
        result = result.filter((a) => a.status === "ACCEPTED");
        break;
      case "rejected":
        result = result.filter((a) => a.status === "REJECTED");
        break;
    }

    return result;
  }, [applications, statusFilter]);

  // Sort applications
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let result = 0;

      switch (sortKey) {
        case "applied":
          result =
            new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime();
          break;
        case "status": {
          const order = {
            PENDING: 0,
            UNDER_REVIEW: 1,
            ACCEPTED: 2,
            REJECTED: 3,
          };
          result =
            order[a.status as keyof typeof order] -
            order[b.status as keyof typeof order];
          break;
        }
        case "urgency": {
          const getUrgency = (app: Application) => {
            if (!app.project?.deadline) return 999;
            const days =
              (new Date(app.project.deadline).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24);
            return days;
          };
          result = getUrgency(a) - getUrgency(b);
          break;
        }
        case "company": {
          const nameA = a.project?.companyName || a.project?.title || "";
          const nameB = b.project?.companyName || b.project?.title || "";
          result = nameA.localeCompare(nameB);
          break;
        }
      }

      return sortDir === "asc" ? result : -result;
    });

    return arr;
  }, [filtered, sortKey, sortDir]);

  const selected = useMemo(
    () => sorted.find((a) => a.id === selectedId),
    [sorted, selectedId]
  );

  // Stats
  const stats = useMemo(() => {
    const byStatus = {
      pending: applications.filter((a) => a.status === "PENDING").length,
      review: applications.filter((a) => a.status === "UNDER_REVIEW").length,
      accepted: applications.filter((a) => a.status === "ACCEPTED").length,
      rejected: applications.filter((a) => a.status === "REJECTED").length,
    };

    const active = byStatus.pending + byStatus.review;
    const closed = byStatus.accepted + byStatus.rejected;

    const urgent = applications.filter((a) => {
      if (!a.project?.deadline) return false;
      const days =
        (new Date(a.project.deadline).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24);
      return days <= 7 && days > 0;
    }).length;

    const responseRate =
      applications.length > 0
        ? Math.round((closed / applications.length) * 100)
        : 0;

    return {
      ...byStatus,
      active,
      closed,
      urgent,
      responseRate,
      total: applications.length,
    };
  }, [applications]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const handleClearFilters = () => {
    setStatusFilter("all");
  };

  if (isError) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="inline-flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
              <TargetIcon className="size-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Failed to load applications
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

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <Loader2Icon className="size-10 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">
              Loading applications...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout maxWidth="full">
      <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
        {/* Command Bar */}
        <div className="shrink-0 border-b border-border bg-background">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 gap-4">
            <div className="flex items-center gap-4 sm:gap-6 min-w-0 flex-1">
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">
                  Applications
                </h1>
                <div className="text-xs text-muted-foreground tabular-nums">
                  {sorted.length} of {stats.total}
                </div>
              </div>

              {/* Desktop Stats */}
              <div className="hidden lg:flex items-center gap-3 pl-6 border-l border-border">
                <Stat label="Active" value={stats.active} color="blue" />
                <Stat label="Pending" value={stats.pending} color="yellow" />
                <Stat label="Accepted" value={stats.accepted} color="green" />
                {stats.urgent > 0 && (
                  <Stat label="Urgent" value={stats.urgent} color="red" />
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Mobile Filters */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFiltersOpen(true)}
                className="lg:hidden"
              >
                <SlidersHorizontalIcon className="size-4" />
              </Button>

              <Button
                onClick={() => navigate(ROUTES.PROJECTS)}
                size="sm"
                className="gap-2"
              >
                <SearchIcon className="size-4" />
                <span className="hidden sm:inline">Browse</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Main Workspace */}
        <div className="flex-1 flex overflow-hidden">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:flex flex-col w-72 border-r border-border bg-muted/20">
            <ApplicationFilters
              stats={stats}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              onClearFilters={handleClearFilters}
            />
          </aside>

          {/* Table */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <ApplicationTable
              applications={sorted}
              selectedId={selectedId}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              onSelect={setSelectedId}
            />
          </div>

          {/* Desktop Detail Panel */}
          <div className="hidden xl:block w-105 2xl:w-120 overflow-y-auto scrollbar-thin bg-muted/10 border-l">
            {selected ? (
              <ApplicationDetailPanel application={selected} />
            ) : (
              <div className="flex items-center justify-center h-full px-6">
                <div className="text-center space-y-3">
                  <div className="inline-flex size-16 items-center justify-center rounded-2xl bg-muted">
                    <TargetIcon className="size-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Select an application
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Detail Sheet */}
        <Sheet
          open={!!selected && window.innerWidth < 1280}
          onOpenChange={(open) => !open && setSelectedId(null)}
        >
          <SheetContent side="bottom" className="h-[85vh] p-0">
            <VisuallyHidden>
              <SheetTitle>Application Details</SheetTitle>
              <SheetDescription>
                Application Details such as status, project info, etc.
              </SheetDescription>
            </VisuallyHidden>
            <div className="overflow-y-auto h-[calc(85vh-4rem)]">
              {selected && <ApplicationDetailPanel application={selected} />}
            </div>
          </SheetContent>
        </Sheet>

        {/* Mobile Filters Sheet */}
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetContent side="left" className="w-80 p-0">
            <VisuallyHidden>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>
                Filter applications stats, status, etc
              </SheetDescription>
            </VisuallyHidden>
            <div className="p-6">
              <ApplicationFilters
                stats={stats}
                statusFilter={statusFilter}
                onStatusFilterChange={(value) => {
                  setStatusFilter(value);
                  setFiltersOpen(false);
                }}
                onClearFilters={() => {
                  handleClearFilters();
                  setFiltersOpen(false);
                }}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </Layout>
  );
}

// Quick Stat Component
function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "yellow" | "blue" | "green" | "red";
}) {
  const colors = {
    yellow: "text-yellow-700 dark:text-yellow-300",
    blue: "text-blue-700 dark:text-blue-300",
    green: "text-green-700 dark:text-green-300",
    red: "text-red-700 dark:text-red-300",
  };

  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`text-base font-bold tabular-nums ${colors[color]}`}>
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
