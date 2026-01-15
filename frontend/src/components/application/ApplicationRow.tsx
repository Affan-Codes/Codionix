import {
  CheckCircle2Icon,
  XCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  ChevronRightIcon,
  BriefcaseIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Application } from "@/types";
import { formatDistanceToNow } from "date-fns";

interface ApplicationRowProps {
  application: Application;
  selected: boolean;
  onClick: () => void;
}

export function ApplicationRow({
  application,
  selected,
  onClick,
}: ApplicationRowProps) {
  const daysLeft = application.project?.deadline
    ? Math.ceil(
        (new Date(application.project.deadline).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const statusConfig = {
    PENDING: {
      icon: ClockIcon,
      label: "Pending",
      color: "text-yellow-700 dark:text-yellow-300",
      bg: "bg-yellow-50 dark:bg-yellow-950/20",
      border: "border-yellow-200 dark:border-yellow-900/30",
    },
    UNDER_REVIEW: {
      icon: AlertCircleIcon,
      label: "Review",
      color: "text-blue-700 dark:text-blue-300",
      bg: "bg-blue-50 dark:bg-blue-950/20",
      border: "border-blue-200 dark:border-blue-900/30",
    },
    ACCEPTED: {
      icon: CheckCircle2Icon,
      label: "Accepted",
      color: "text-green-700 dark:text-green-300",
      bg: "bg-green-50 dark:bg-green-950/20",
      border: "border-green-200 dark:border-green-900/30",
    },
    REJECTED: {
      icon: XCircleIcon,
      label: "Rejected",
      color: "text-red-700 dark:text-red-300",
      bg: "bg-red-50 dark:bg-red-950/20",
      border: "border-red-200 dark:border-red-900/30",
    },
  };

  const config = statusConfig[application.status as keyof typeof statusConfig];
  const StatusIcon = config.icon;

  return (
    <>
      {/* Desktop Row */}
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        className={`hidden md:grid w-full min-w-0 box-border grid-cols-[minmax(200px,1fr)_140px_110px_100px] gap-4 px-6 py-4 text-left transition-colors h-auto rounded-none hover:bg-accent/50 ${
          selected
            ? "bg-primary/5 border-l-2 border-l-primary"
            : "border-l-2 border-l-transparent"
        }`}
      >
        {/* Project */}
        <div className="min-w-0 overflow-hidden">
          <div className="font-medium text-foreground truncate mb-1">
            {application.project?.title}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
            {application.project?.companyName && (
              <>
                <BriefcaseIcon className="size-3 shrink-0" />
                <span className="truncate">
                  {application.project.companyName}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-md border ${config.border} ${config.bg}`}
          >
            <StatusIcon className={`size-3.5 shrink-0 ${config.color}`} />
            <span className={`text-sm font-medium ${config.color}`}>
              {config.label}
            </span>
          </div>
        </div>

        {/* Urgency */}
        <div className="flex items-center">
          {daysLeft !== null && daysLeft > 0 ? (
            <div
              className={`text-sm font-medium tabular-nums ${
                daysLeft <= 3
                  ? "text-red-700 dark:text-red-300"
                  : daysLeft <= 7
                  ? "text-yellow-700 dark:text-yellow-300"
                  : "text-muted-foreground"
              }`}
            >
              {daysLeft}d left
            </div>
          ) : daysLeft !== null && daysLeft <= 0 ? (
            <div className="text-sm text-muted-foreground">Closed</div>
          ) : (
            <div className="text-sm text-muted-foreground">—</div>
          )}
        </div>

        {/* Applied */}
        <div className="flex items-center text-sm text-muted-foreground tabular-nums">
          {formatDistanceToNow(new Date(application.appliedAt), {
            addSuffix: false,
          })}
        </div>
      </div>

      {/* Mobile Row */}
      <Button
        variant="ghost"
        onClick={onClick}
        className={`md:hidden flex items-center gap-3 w-full min-w-0 box-border px-4 py-4 text-left transition-colors h-auto rounded-none hover:bg-accent/50 ${
          selected
            ? "bg-primary/5 border-l-2 border-l-primary"
            : "border-l-2 border-l-transparent"
        }`}
      >
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title */}
          <div className="font-medium text-foreground truncate">
            {application.project?.title}
          </div>

          {/* Company + Date */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {application.project?.companyName && (
              <>
                <div className="flex items-center gap-1 truncate">
                  <BriefcaseIcon className="size-3 shrink-0" />
                  <span className="truncate">
                    {application.project.companyName}
                  </span>
                </div>
                <span className="text-border">•</span>
              </>
            )}
            <span className="tabular-nums shrink-0">
              {formatDistanceToNow(new Date(application.appliedAt), {
                addSuffix: false,
              })}
            </span>
          </div>
        </div>

        {/* Status Badge + Arrow */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${config.border} ${config.bg}`}
          >
            <StatusIcon className={`size-3.5 ${config.color}`} />
            <span className={`text-xs font-medium ${config.color}`}>
              {config.label}
            </span>
          </div>
          <ChevronRightIcon className="size-4 text-muted-foreground" />
        </div>
      </Button>
    </>
  );
}
