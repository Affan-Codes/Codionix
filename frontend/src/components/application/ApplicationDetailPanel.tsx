import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2Icon,
  XCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  CalendarIcon,
  TrendingUpIcon,
  BriefcaseIcon,
  MapPinIcon,
  DollarSignIcon,
  UsersIcon,
  FileTextIcon,
  ExternalLinkIcon,
} from "lucide-react";
import type { Application } from "@/types";
import { formatDistanceToNow, format } from "date-fns";
import { Link } from "react-router";
import { Separator } from "@/components/ui/separator";

interface ApplicationDetailPanelProps {
  application: Application;
}

export function ApplicationDetailPanel({
  application,
}: ApplicationDetailPanelProps) {
  const statusConfig = {
    PENDING: {
      icon: ClockIcon,
      label: "Pending Review",
      color: "text-yellow-700 dark:text-yellow-300",
      bg: "bg-yellow-50 dark:bg-yellow-950/20",
      border: "border-yellow-200 dark:border-yellow-900/30",
    },
    UNDER_REVIEW: {
      icon: AlertCircleIcon,
      label: "Under Review",
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
      label: "Not Selected",
      color: "text-red-700 dark:text-red-300",
      bg: "bg-red-50 dark:bg-red-950/20",
      border: "border-red-200 dark:border-red-900/30",
    },
  };

  const config = statusConfig[application.status as keyof typeof statusConfig];
  const StatusIcon = config.icon;

  const project = application.project;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Link to={`/projects/${project?.id}`} className="block group space-y-2">
          <h2 className="text-xl font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
            {project?.title}
          </h2>
          {project?.companyName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BriefcaseIcon className="size-4 shrink-0" />
              <span>{project.companyName}</span>
            </div>
          )}
        </Link>

        {/* Status Badge */}
        <div
          className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-lg border ${config.border} ${config.bg}`}
        >
          <StatusIcon className={`size-5 ${config.color}`} />
          <span className={`text-sm font-semibold ${config.color}`}>
            {config.label}
          </span>
        </div>
      </div>

      <Separator />

      {/* Timeline */}
      <div className="space-y-3">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">
          Timeline
        </div>
        <div className="space-y-2">
          <TimelineItem
            icon={CalendarIcon}
            label="Applied"
            value={formatDistanceToNow(new Date(application.appliedAt), {
              addSuffix: true,
            })}
            date={format(
              new Date(application.appliedAt),
              "MMM dd, yyyy · h:mm a"
            )}
          />
          {application.reviewedAt && (
            <TimelineItem
              icon={TrendingUpIcon}
              label="Reviewed"
              value={formatDistanceToNow(new Date(application.reviewedAt), {
                addSuffix: true,
              })}
              date={format(
                new Date(application.reviewedAt),
                "MMM dd, yyyy · h:mm a"
              )}
            />
          )}
          {project?.deadline && (
            <TimelineItem
              icon={ClockIcon}
              label="Deadline"
              value={formatDistanceToNow(new Date(project.deadline), {
                addSuffix: true,
              })}
              date={format(new Date(project.deadline), "MMM dd, yyyy")}
            />
          )}
        </div>
      </div>

      {/* Project Metadata */}
      {project && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Project Details
            </div>
            <div className="space-y-2">
              {project.projectType && (
                <MetaItem
                  icon={FileTextIcon}
                  label="Type"
                  value={project.projectType}
                />
              )}
              {(project.location || project.isRemote) && (
                <MetaItem
                  icon={MapPinIcon}
                  label="Location"
                  value={project.isRemote ? "Remote" : project.location || "—"}
                />
              )}
              {project.stipend && (
                <MetaItem
                  icon={DollarSignIcon}
                  label="Stipend"
                  value={`$${project.stipend.toLocaleString()}/mo`}
                />
              )}
              {project.maxApplicants && (
                <MetaItem
                  icon={UsersIcon}
                  label="Applicants"
                  value={`${project.currentApplicants}/${project.maxApplicants}`}
                />
              )}
            </div>
          </div>
        </>
      )}

      {/* Skills */}
      {project?.skills && project.skills.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Required Skills
            </div>
            <div className="flex flex-wrap gap-2">
              {project.skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Cover Letter */}
      <Separator />
      <div className="space-y-3">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">
          Cover Letter
        </div>
        <div className="p-4 rounded-lg border border-border bg-muted/30">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {application.coverLetter}
          </p>
        </div>
      </div>

      {/* Resume */}
      {application.resumeUrl && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Resume
            </div>
            <Button
              asChild
              variant="outline"
              className="w-full justify-between"
            >
              <a
                href={application.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Resume
                <ExternalLinkIcon className="size-4" />
              </a>
            </Button>
          </div>
        </>
      )}

      {/* Success Message */}
      {application.status === "ACCEPTED" && (
        <>
          <Separator />
          <div className="p-4 rounded-lg border border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-green-950/20">
            <div className="flex items-start gap-3">
              <CheckCircle2Icon className="size-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-green-800 dark:text-green-200 leading-relaxed">
                Congratulations! Your application has been accepted. The team
                will reach out to you soon.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Rejection Feedback */}
      {application.status === "REJECTED" && application.rejectionReason && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="text-xs text-destructive uppercase tracking-wider">
              Feedback
            </div>
            <div className="p-4 rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20">
              <p className="text-sm text-red-800 dark:text-red-200 leading-relaxed">
                {application.rejectionReason}
              </p>
            </div>
          </div>
        </>
      )}

      {/* Actions */}
      <Separator />
      <div className="space-y-2">
        <Button asChild className="w-full">
          <Link to={`/projects/${project?.id}`}>
            View Project
            <ExternalLinkIcon className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

// Timeline Item
function TimelineItem({
  icon: Icon,
  label,
  value,
  date,
}: {
  icon: any;
  label: string;
  value: string;
  date: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-center size-8 rounded-lg bg-background border border-border shrink-0">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
        <div className="text-sm font-medium text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
          {date}
        </div>
      </div>
    </div>
  );
}

// Meta Item
function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
      <Icon className="size-4 text-muted-foreground shrink-0" />
      <div className="flex items-baseline gap-2 flex-1 min-w-0">
        <span className="text-xs text-muted-foreground shrink-0">{label}</span>
        <span className="text-sm text-foreground font-medium truncate">
          {value}
        </span>
      </div>
    </div>
  );
}
