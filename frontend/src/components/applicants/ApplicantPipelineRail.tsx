import { useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2Icon,
  XCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  SparklesIcon,
  TargetIcon,
  ZapIcon,
} from "lucide-react";
import type { Application } from "@/types";
import type {
  StatusFilter,
  SortMode,
} from "@/pages/projects/ProjectApplicantsPage";

interface ApplicantPipelineRailProps {
  applications: Application[];
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
}

export function ApplicantPipelineRail({
  applications,
  statusFilter,
  onStatusFilterChange,
  sortMode,
  onSortModeChange,
}: ApplicantPipelineRailProps) {
  const stats = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter((a) => a.status === "PENDING").length;
    const review = applications.filter(
      (a) => a.status === "UNDER_REVIEW"
    ).length;
    const accepted = applications.filter((a) => a.status === "ACCEPTED").length;
    const rejected = applications.filter((a) => a.status === "REJECTED").length;
    const responded = accepted + rejected;

    return {
      total,
      pending,
      review,
      accepted,
      rejected,
      responded,
      responseRate: total > 0 ? Math.round((responded / total) * 100) : 0,
      acceptanceRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
      pendingRate:
        total > 0 ? Math.round(((pending + review) / total) * 100) : 0,
    };
  }, [applications]);

  const pipelineHealth = useMemo(() => {
    if (stats.pendingRate > 70)
      return {
        status: "critical",
        message: "High backlog",
        icon: AlertTriangleIcon,
        color: "text-destructive",
      };
    if (stats.pendingRate > 50)
      return {
        status: "warning",
        message: "Needs attention",
        icon: AlertCircleIcon,
        color: "text-yellow-600",
      };
    if (stats.responseRate > 80)
      return {
        status: "excellent",
        message: "Healthy",
        icon: SparklesIcon,
        color: "text-primary",
      };
    return {
      status: "good",
      message: "Balanced",
      icon: TargetIcon,
      color: "text-foreground",
    };
  }, [stats]);

  const HealthIcon = pipelineHealth.icon;

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-hide">
      {/* Pipeline Health */}
      <div className="p-6 space-y-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="size-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Pipeline Status
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HealthIcon className={`size-4 ${pipelineHealth.color}`} />
              <span className={`text-sm font-semibold ${pipelineHealth.color}`}>
                {pipelineHealth.message}
              </span>
            </div>
            <span className="text-2xl font-bold text-foreground tabular-nums">
              {stats.responseRate}%
            </span>
          </div>

          <Progress value={stats.responseRate} className="h-2" />

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {stats.responded} reviewed
            </span>
            <span className="text-muted-foreground">
              {stats.pending + stats.review} pending
            </span>
          </div>
        </div>
      </div>

      {/* Status Filters */}
      <div className="p-6 space-y-2 border-b border-border shrink-0">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
          Filter
        </div>
        <FilterButton
          active={statusFilter === "all"}
          onClick={() => onStatusFilterChange("all")}
          label="All"
          count={stats.total}
        />
        <FilterButton
          active={statusFilter === "pending"}
          onClick={() => onStatusFilterChange("pending")}
          label="New"
          count={stats.pending}
          icon={ClockIcon}
          color="text-yellow-600"
          pulse={stats.pending > 3}
        />
        <FilterButton
          active={statusFilter === "review"}
          onClick={() => onStatusFilterChange("review")}
          label="Review"
          count={stats.review}
          icon={AlertCircleIcon}
          color="text-blue-600"
        />
        <FilterButton
          active={statusFilter === "accepted"}
          onClick={() => onStatusFilterChange("accepted")}
          label="Accepted"
          count={stats.accepted}
          icon={CheckCircle2Icon}
          color="text-green-600"
        />
        <FilterButton
          active={statusFilter === "rejected"}
          onClick={() => onStatusFilterChange("rejected")}
          label="Rejected"
          count={stats.rejected}
          icon={XCircleIcon}
          color="text-red-600"
        />
      </div>

      {/* Sort Options */}
      <div className="p-6 space-y-2 border-b border-border shrink-0">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
          Sort
        </div>
        <SortButton
          active={sortMode === "urgent"}
          onClick={() => onSortModeChange("urgent")}
          label="Urgent First"
          icon={ZapIcon}
        />
        <SortButton
          active={sortMode === "match"}
          onClick={() => onSortModeChange("match")}
          label="Best Match"
          icon={TargetIcon}
        />
        <SortButton
          active={sortMode === "recent"}
          onClick={() => onSortModeChange("recent")}
          label="Most Recent"
          icon={ClockIcon}
        />
        <SortButton
          active={sortMode === "name"}
          onClick={() => onSortModeChange("name")}
          label="Name A→Z"
        />
      </div>

      {/* Conversion Metrics */}
      <div className="flex-1 p-6 space-y-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">
          Metrics
        </div>

        <MetricCard
          label="Response Rate"
          value={stats.responseRate}
          trend={stats.responseRate >= 60 ? "up" : "down"}
        />
        <MetricCard
          label="Acceptance Rate"
          value={stats.acceptanceRate}
          trend={stats.acceptanceRate >= 20 ? "up" : "down"}
        />

        <Separator />

        <div className="space-y-2">
          <DistBar
            label="Pending"
            value={stats.pending}
            total={stats.total}
            color="bg-yellow-500"
          />
          <DistBar
            label="Review"
            value={stats.review}
            total={stats.total}
            color="bg-blue-500"
          />
          <DistBar
            label="Accepted"
            value={stats.accepted}
            total={stats.total}
            color="bg-green-500"
          />
          <DistBar
            label="Rejected"
            value={stats.rejected}
            total={stats.total}
            color="bg-red-500"
          />
        </div>
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  label,
  count,
  icon: Icon,
  color,
  pulse,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon?: any;
  color?: string;
  pulse?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left transition-all ${
        active
          ? "bg-primary/10 text-primary"
          : "hover:bg-muted/50 text-foreground"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {Icon && (
          <Icon
            className={`size-4 shrink-0 ${
              active ? "text-primary" : color || "text-muted-foreground"
            }`}
          />
        )}
        <span
          className={`text-sm font-medium truncate ${
            active ? "text-primary" : "text-foreground"
          }`}
        >
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {pulse && !active && (
          <div className="size-1.5 rounded-full bg-destructive animate-pulse" />
        )}
        <span
          className={`text-sm font-semibold tabular-nums ${
            active ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {count}
        </span>
      </div>
    </button>
  );
}

function SortButton({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: any;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
        active
          ? "bg-primary/10 text-primary"
          : "hover:bg-muted/50 text-foreground"
      }`}
    >
      {Icon && (
        <Icon
          className={`size-4 shrink-0 ${
            active ? "text-primary" : "text-muted-foreground"
          }`}
        />
      )}
      <span
        className={`text-sm font-medium ${
          active ? "text-primary" : "text-foreground"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

function MetricCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: number;
  trend: "up" | "down";
}) {
  return (
    <div className="p-4 rounded-lg border border-border bg-background">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <TrendingUpIcon
          className={`size-3 ${
            trend === "up" ? "text-green-600" : "text-red-600 rotate-180"
          }`}
        />
      </div>
      <div className="text-2xl font-bold text-foreground tabular-nums">
        {value}%
      </div>
    </div>
  );
}

function DistBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground tabular-nums">
          {value}
        </span>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
