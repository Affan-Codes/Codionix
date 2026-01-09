import type { Application } from "@/types";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import {
  BriefcaseIcon,
  CalendarIcon,
  CheckCircle2Icon,
  Clock,
  ClockIcon,
  FileTextIcon,
  Search,
  XCircleIcon,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "../ui/button";
import { Link } from "react-router";

interface ApplicationCardProps {
  application: Application;
}

export function ApplicationCard({ application }: ApplicationCardProps) {
  const statusConfig = {
    PENDING: {
      label: "Pending Review",
      icon: Clock,
      gradient: "from-yellow-500 to-amber-500",
      bgClass: "bg-yellow-50 dark:bg-yellow-950/20",
      borderClass: "border-yellow-300 dark:border-yellow-800/30",
      textClass: "text-yellow-800 dark:text-yellow-200",
      iconClass: "text-yellow-700 dark:text-yellow-300",
    },
    UNDER_REVIEW: {
      label: "Under Review",
      icon: Search,
      gradient: "from-blue-500 to-indigo-500",
      bgClass: "bg-blue-50 dark:bg-blue-950/20",
      borderClass: "border-blue-200 dark:border-blue-900/30",
      textClass: "text-blue-700 dark:text-blue-300",
      iconClass: "text-blue-600 dark:text-blue-400 animate-spin",
    },
    ACCEPTED: {
      label: "Accepted",
      icon: CheckCircle2Icon,
      gradient: "from-green-500 to-emerald-500",
      bgClass: "bg-green-50 dark:bg-green-950/20",
      borderClass: "border-green-200 dark:border-green-900/30",
      textClass: "text-green-700 dark:text-green-300",
      iconClass: "text-green-600 dark:text-green-400",
    },
    REJECTED: {
      label: "Not Selected",
      icon: XCircleIcon,
      gradient: "from-red-500 to-rose-500",
      bgClass: "bg-red-50 dark:bg-red-950/20",
      borderClass: "border-red-200 dark:border-red-900/30",
      textClass: "text-red-700 dark:text-red-300",
      iconClass: "text-red-600 dark:text-red-400",
    },
  };

  const config = statusConfig[application.status];
  const StatusIcon = config.icon;

  return (
    <Card className="h-full flex flex-col hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group border-2">
      <CardHeader className="space-y-4 pb-4">
        {/* Status Badge (Visual Priority) */}
        <div className="flex items-center justify-between">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${config.bgClass} ${config.borderClass} shadow-sm`}
          >
            <StatusIcon className={`size-4 ${config.iconClass}`} />
            <span className={`text-sm font-semibold ${config.textClass}`}>
              {config.label}
            </span>
          </div>

          {/* Project Type Badge */}
          {application.project?.projectType && (
            <Badge
              variant="outline"
              className="text-xs font-medium border-2 bg-background/50"
            >
              {application.project.projectType}
            </Badge>
          )}
        </div>

        {/* Project Title (Primary Focus) */}
        <div>
          <CardTitle className="text-xl font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {application.project?.title}
          </CardTitle>
          {application.project?.companyName && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <BriefcaseIcon className="size-4" />
              <span className="truncate">
                {application.project.companyName}
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4 pb-4">
        {/* Timeline Information */}
        <div className="space-y-3">
          {/* Applied Date */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center justify-center size-8 rounded-lg bg-muted">
              <CalendarIcon className="size-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-medium">
                Applied
              </p>
              <p className="text-sm text-foreground">
                {formatDistanceToNow(new Date(application.appliedAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>

          {/* Review Date (if available) */}
          {application.reviewedAt && (
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center justify-center size-8 rounded-lg bg-muted">
                <ClockIcon className="size-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium">
                  Reviewed
                </p>
                <p className="text-sm text-foreground">
                  {format(new Date(application.reviewedAt), "MMM dd, yyyy")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Cover Letter Preview */}
        <div className="pt-3 border-t">
          <div className="flex items-center gap-2 mb-2">
            <FileTextIcon className="size-4 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Cover Letter
            </p>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
            {application.coverLetter}
          </p>
        </div>

        {/* Success Message (Accepted) */}
        {application.status === "ACCEPTED" && (
          <div className="pt-3 border-t">
            <div className="rounded-lg bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-900/30 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2Icon className="size-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-green-800 dark:text-green-200 leading-relaxed">
                  🎉 Congratulations! Your application has been accepted. The
                  team will reach out to you soon.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Reason (Rejected) */}
        {application.status === "REJECTED" && application.rejectionReason && (
          <div className="pt-3 border-t">
            <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-900/30 p-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-red-800 dark:text-red-300 uppercase tracking-wide">
                  Feedback
                </p>
                <p className="text-sm text-red-700 dark:text-red-200 leading-relaxed">
                  {application.rejectionReason}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2 pt-4 border-t">
        <Button asChild variant="outline" className="flex-1">
          <Link to={`/projects/${application.project?.id}`}>
            <FileTextIcon className="size-4" />
            View Project
          </Link>
        </Button>
        {application.resumeUrl && (
          <Button asChild variant="secondary" className="flex-1">
            <a
              href={application.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Resume
            </a>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
