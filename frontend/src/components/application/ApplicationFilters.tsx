import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ClockIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
  XCircleIcon,
  TrendingUpIcon,
  XIcon,
} from "lucide-react";
import type { StatusFilter } from "@/pages/applications/MyApplications";

interface ApplicationFiltersProps {
  stats: {
    total: number;
    active: number;
    pending: number;
    review: number;
    accepted: number;
    rejected: number;
    urgent: number;
    responseRate: number;
  };
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
  onClearFilters: () => void;
}

export function ApplicationFilters({
  stats,
  statusFilter,
  onStatusFilterChange,
  onClearFilters,
}: ApplicationFiltersProps) {
  const hasFilters = statusFilter !== "all";

  const filterOptions = [
    {
      value: "all" as const,
      label: "All Applications",
      count: stats.total,
      icon: null,
      color: null,
    },
    {
      value: "active" as const,
      label: "Active",
      count: stats.active,
      icon: TrendingUpIcon,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      value: "pending" as const,
      label: "Pending Review",
      count: stats.pending,
      icon: ClockIcon,
      color: "text-yellow-600 dark:text-yellow-400",
    },
    {
      value: "review" as const,
      label: "Under Review",
      count: stats.review,
      icon: AlertCircleIcon,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      value: "accepted" as const,
      label: "Accepted",
      count: stats.accepted,
      icon: CheckCircle2Icon,
      color: "text-green-600 dark:text-green-400",
    },
    {
      value: "rejected" as const,
      label: "Rejected",
      count: stats.rejected,
      icon: XCircleIcon,
      color: "text-red-600 dark:text-red-400",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Filters
          </h2>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-7 gap-1.5 -mr-2"
            >
              <XIcon className="size-3" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Filter Options */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-6 space-y-1">
          {filterOptions.map((option) => {
            const Icon = option.icon;
            const isActive = statusFilter === option.value;

            return (
              <Button
                key={option.value}
                variant="ghost"
                onClick={() => onStatusFilterChange(option.value)}
                className={`w-full flex items-center justify-between gap-3 h-auto py-2.5 px-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary hover:bg-primary/15"
                    : "hover:bg-muted/50 text-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {Icon && (
                    <Icon
                      className={`size-4 shrink-0 ${
                        isActive ? "text-primary" : option.color
                      }`}
                    />
                  )}
                  <span
                    className={`text-sm font-medium truncate ${
                      isActive ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {option.label}
                  </span>
                </div>
                <span
                  className={`text-sm font-semibold tabular-nums shrink-0 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {option.count}
                </span>
              </Button>
            );
          })}
        </div>

        <Separator className="my-6" />

        {/* Performance Metrics */}
        <div className="px-6 pb-6 space-y-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            Performance
          </div>
          <div className="space-y-3">
            <MetricCard
              label="Response Rate"
              value={`${stats.responseRate}%`}
              subtext={`${stats.accepted + stats.rejected} of ${
                stats.total
              } responded`}
            />
            {stats.urgent > 0 && (
              <MetricCard
                label="Urgent Deadlines"
                value={stats.urgent}
                subtext="Closing within 7 days"
                variant="warning"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  variant = "default",
}: {
  label: string;
  value: string | number;
  subtext: string;
  variant?: "default" | "warning";
}) {
  return (
    <div
      className={`p-4 rounded-lg border ${
        variant === "warning"
          ? "border-yellow-200 dark:border-yellow-900/30 bg-yellow-50 dark:bg-yellow-950/20"
          : "border-border bg-background"
      }`}
    >
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div
        className={`text-2xl font-bold tabular-nums ${
          variant === "warning"
            ? "text-yellow-800 dark:text-yellow-200"
            : "text-foreground"
        }`}
      >
        {value}
      </div>
      <div
        className={`text-xs mt-1 ${
          variant === "warning"
            ? "text-yellow-700 dark:text-yellow-300"
            : "text-muted-foreground"
        }`}
      >
        {subtext}
      </div>
    </div>
  );
}
