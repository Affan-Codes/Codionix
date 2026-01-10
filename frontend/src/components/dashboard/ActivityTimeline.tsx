import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2Icon,
  XCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  ChevronRightIcon,
} from "lucide-react";
import { Link } from "react-router";

type ActivityStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "ACCEPTED"
  | "REJECTED"
  | "NEW";

interface Activity {
  id: string;
  type:
    | "application_submitted"
    | "application_reviewed"
    | "application_accepted"
    | "application_rejected"
    | "new_project";
  projectTitle: string;
  projectType: "INTERNSHIP" | "PROJECT";
  timestamp: Date;
  status?: ActivityStatus;
  rejectionReason?: string;
  skills?: string[];
}

interface ActivityTimelineProps {
  activities: Activity[];
  viewAllLink?: string;
}

export function ActivityTimeline({
  activities,
  viewAllLink = "/applications",
}: ActivityTimelineProps) {
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "just now";
  };

  const getStatusConfig = (status?: ActivityStatus) => {
    switch (status) {
      case "ACCEPTED":
        return {
          color: "bg-primary",
          icon: CheckCircle2Icon,
          iconColor: "text-primary",
        };
      case "REJECTED":
        return {
          color: "bg-destructive",
          icon: XCircleIcon,
          iconColor: "text-destructive",
        };
      case "UNDER_REVIEW":
        return {
          color: "bg-achievement",
          icon: AlertCircleIcon,
          iconColor: "text-achievement",
        };
      case "PENDING":
        return {
          color: "bg-muted-foreground",
          icon: ClockIcon,
          iconColor: "text-muted-foreground",
        };
      default:
        return {
          color: "bg-primary/60",
          icon: ClockIcon,
          iconColor: "text-primary/60",
        };
    }
  };

  const getActivityText = (activity: Activity) => {
    switch (activity.type) {
      case "application_submitted":
        return "Applied to";
      case "application_reviewed":
        return "Under review:";
      case "application_accepted":
        return "Accepted for";
      case "application_rejected":
        return "Not selected for";
      case "new_project":
        return "New opportunity:";
      default:
        return "";
    }
  };

  if (activities.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Recent Activity
          </h2>
        </div>
        <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Recent Activity
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Last {activities.length} updates
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-1 text-xs h-7 -mr-2 hidden sm:flex"
        >
          <Link to={viewAllLink}>
            View All
            <ChevronRightIcon className="size-3" />
          </Link>
        </Button>
      </div>

      {/* Timeline - Responsive */}
      <div className="space-y-0">
        {activities.map((activity, index) => {
          const isLast = index === activities.length - 1;
          const config = getStatusConfig(activity.status);
          const StatusIcon = config.icon;

          return (
            <div key={activity.id} className="flex gap-3 sm:gap-4 group">
              {/* Timeline Spine */}
              <div className="flex flex-col items-center shrink-0 pt-2">
                <div
                  className={`size-2.5 sm:size-2 rounded-full ${config.color} shadow-sm`}
                />
                {!isLast && (
                  <div className="w-px h-full min-h-16 sm:min-h-14 bg-border mt-2" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-8 sm:pb-6">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base text-foreground leading-tight">
                      {getActivityText(activity)}{" "}
                      <span className="font-semibold">
                        {activity.projectTitle}
                      </span>
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(activity.timestamp)}
                      </span>
                      <span className="text-xs text-border">•</span>
                      <Badge
                        variant="outline"
                        className="text-xs h-4 px-1.5 py-0"
                      >
                        {activity.projectType}
                      </Badge>
                    </div>
                  </div>

                  {activity.status && (
                    <StatusIcon
                      className={`size-4 sm:size-5 shrink-0 ${config.iconColor}`}
                    />
                  )}
                </div>

                {/* Rejection Reason - Better mobile spacing */}
                {activity.rejectionReason && (
                  <div className="mt-3 p-3 rounded-lg bg-destructive/5 border-l-2 border-l-destructive">
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {activity.rejectionReason}
                    </p>
                  </div>
                )}

                {/* New Project Skills - Responsive */}
                {activity.skills && activity.skills.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                    {activity.skills.map((skill) => (
                      <span
                        key={skill}
                        className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
