import { Badge } from "@/components/ui/badge";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  CalendarIcon,
  AlertCircleIcon,
} from "lucide-react";

interface Metric {
  label: string;
  value: number | string;
  change?: number;
  format?: "number" | "percentage" | "currency";
}

interface Deadline {
  id: string;
  title: string;
  type: "submission" | "application" | "review";
  date: Date;
  urgent: boolean;
}

interface MetricsPanelProps {
  weeklyMetrics: Metric[];
  upcomingDeadlines: Deadline[];
}

export function MetricsPanel({
  weeklyMetrics,
  upcomingDeadlines,
}: MetricsPanelProps) {
  const formatDeadline = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    if (days < 7) return `${days} days`;
    if (days < 30) return `${Math.floor(days / 7)} weeks`;
    return `${Math.floor(days / 30)} months`;
  };

  const formatMetricValue = (
    value: number | string,
    format?: "number" | "percentage" | "currency"
  ) => {
    if (typeof value === "string") return value;

    switch (format) {
      case "percentage":
        return `${value}%`;
      case "currency":
        return `$${value.toLocaleString()}`;
      default:
        return value.toLocaleString();
    }
  };

  const getDeadlineIcon = (type: string) => {
    switch (type) {
      case "submission":
        return CalendarIcon;
      case "application":
        return CalendarIcon;
      case "review":
        return AlertCircleIcon;
      default:
        return CalendarIcon;
    }
  };

  return (
    <div className="space-y-8">
      {/* Weekly Performance */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            This Week
          </h3>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            Performance metrics
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
          {weeklyMetrics.map((metric, index) => {
            const hasPositiveChange =
              metric.change !== undefined && metric.change > 0;
            const hasNegativeChange =
              metric.change !== undefined && metric.change < 0;

            return (
              <div
                key={index}
                className="p-4 rounded-xl border border-border bg-card hover:bg-accent/30 hover:border-primary/20 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">
                    {metric.label}
                  </span>
                  {metric.change !== undefined && (
                    <div
                      className={`flex items-center gap-0.5 text-xs font-medium ${
                        hasPositiveChange
                          ? "text-primary"
                          : hasNegativeChange
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      {hasPositiveChange ? (
                        <TrendingUpIcon className="size-3" />
                      ) : hasNegativeChange ? (
                        <TrendingDownIcon className="size-3" />
                      ) : null}
                      <span>
                        {hasPositiveChange ? "+" : ""}
                        {metric.change}%
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-foreground tabular-nums">
                  {formatMetricValue(metric.value, metric.format)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Deadlines
            </h3>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              {upcomingDeadlines.length} upcoming
            </p>
          </div>
          {upcomingDeadlines.some((d) => d.urgent) && (
            <Badge variant="destructive" className="text-xs h-5 px-2">
              Urgent
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
          {upcomingDeadlines.map((deadline) => {
            const DeadlineIcon = getDeadlineIcon(deadline.type);

            return (
              <div
                key={deadline.id}
                className={`p-4 rounded-xl border transition-all duration-200 ${
                  deadline.urgent
                    ? "border-destructive/40 bg-destructive/5 hover:bg-destructive/10 hover:border-destructive/50"
                    : "border-border bg-card hover:bg-accent/30 hover:border-primary/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  <DeadlineIcon
                    className={`size-4 shrink-0 mt-0.5 ${
                      deadline.urgent
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground font-semibold leading-tight mb-1.5">
                      {deadline.title}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground capitalize">
                        {deadline.type}
                      </span>
                      <span className="text-xs text-border">•</span>
                      <span
                        className={`text-xs font-medium tabular-nums ${
                          deadline.urgent
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formatDeadline(deadline.date)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
