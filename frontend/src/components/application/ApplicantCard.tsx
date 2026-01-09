import type { Application } from "@/types";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  CalendarIcon,
  FileTextIcon,
  CheckCircle2Icon,
  XCircleIcon,
  Clock,
  Search,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "../ui/button";

interface ApplicantCardProps {
  application: Application;
  onReview: (applicationId: string) => void;
}

export function ApplicantCard({ application, onReview }: ApplicantCardProps) {
  const statusConfig = {
    PENDING: {
      label: "Pending Review",
      icon: Clock,
      bgClass: "bg-yellow-50 dark:bg-yellow-950/20",
      borderClass: "border-yellow-300 dark:border-yellow-800/30",
      textClass: "text-yellow-800 dark:text-yellow-200",
      iconClass: "text-yellow-700 dark:text-yellow-300",
    },
    UNDER_REVIEW: {
      label: "Under Review",
      icon: Search,
      bgClass: "bg-blue-50 dark:bg-blue-950/20",
      borderClass: "border-blue-200 dark:border-blue-900/30",
      textClass: "text-blue-700 dark:text-blue-300",
      iconClass: "text-blue-600 dark:text-blue-400 animate-spin",
    },
    ACCEPTED: {
      label: "Accepted",
      icon: CheckCircle2Icon,
      bgClass: "bg-green-50 dark:bg-green-950/20",
      borderClass: "border-green-200 dark:border-green-900/30",
      textClass: "text-green-700 dark:text-green-300",
      iconClass: "text-green-600 dark:text-green-400",
    },
    REJECTED: {
      label: "Not Selected",
      icon: XCircleIcon,
      bgClass: "bg-red-50 dark:bg-red-950/20",
      borderClass: "border-red-200 dark:border-red-900/30",
      textClass: "text-red-700 dark:text-red-300",
      iconClass: "text-red-600 dark:text-red-400",
    },
  };

  const config = statusConfig[application.status];
  const StatusIcon = config.icon;
  const canReview =
    application.status === "PENDING" || application.status === "UNDER_REVIEW";

  return (
    <Card className="h-full flex flex-col hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group border-2">
      <CardHeader className="space-y-4 pb-4">
        {/* Status Badge */}
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${config.bgClass} ${config.borderClass} shadow-sm w-fit`}
        >
          <StatusIcon className={`size-4 ${config.iconClass}`} />
          <span className={`text-sm font-semibold ${config.textClass}`}>
            {config.label}
          </span>
        </div>

        {/* Applicant Identity */}
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="flex items-center justify-center size-14 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 text-white font-bold text-xl shadow-md shrink-0 group-hover:scale-105 transition-transform duration-200">
            {application.student?.fullName.charAt(0).toUpperCase()}
          </div>

          {/* Name & Email */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {application.student?.fullName}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {application.student?.email}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4 pb-4">
        {/* Skills */}
        {application.student?.skills &&
          application.student.skills.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Skills
              </p>
              <div className="flex flex-wrap gap-1.5">
                {application.student.skills.slice(0, 6).map((skill) => (
                  <Badge
                    key={skill}
                    variant="secondary"
                    className="text-xs font-medium"
                  >
                    {skill}
                  </Badge>
                ))}
                {application.student.skills.length > 6 && (
                  <Badge
                    variant="secondary"
                    className="text-xs font-medium bg-muted text-muted-foreground"
                  >
                    +{application.student.skills.length - 6}
                  </Badge>
                )}
              </div>
            </div>
          )}

        {/* Applied Date */}
        <div className="flex items-center gap-3 text-sm pt-2 border-t">
          <div className="flex items-center justify-center size-8 rounded-lg bg-muted shrink-0">
            <CalendarIcon className="size-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Applied</p>
            <p className="text-sm text-foreground">
              {formatDistanceToNow(new Date(application.appliedAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        </div>

        {/* Cover Letter Preview */}
        <div className="pt-3 border-t">
          <div className="flex items-center gap-2 mb-2">
            <FileTextIcon className="size-4 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Cover Letter
            </p>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed">
            {application.coverLetter}
          </p>
        </div>

        {/* Rejection Reason (if rejected) */}
        {application.status === "REJECTED" && application.rejectionReason && (
          <div className="pt-3 border-t">
            <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-900/30 p-3">
              <p className="text-xs font-semibold text-red-800 dark:text-red-300 uppercase tracking-wide mb-1">
                Rejection Reason
              </p>
              <p className="text-sm text-red-700 dark:text-red-200 leading-relaxed">
                {application.rejectionReason}
              </p>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2 pt-4 border-t">
        {application.resumeUrl && (
          <Button asChild variant="outline" className="flex-1">
            <a
              href={application.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileTextIcon className="size-4" />
              Resume
            </a>
          </Button>
        )}

        {canReview ? (
          <Button
            onClick={() => onReview(application.id)}
            className="flex-1 shadow-sm hover:shadow-md transition-all duration-200"
          >
            Review Application
          </Button>
        ) : (
          <Button variant="secondary" className="flex-1" disabled>
            {application.status === "ACCEPTED" ? "✓ Accepted" : "✗ Rejected"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
