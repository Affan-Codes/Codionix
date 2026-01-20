import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  DollarSignIcon,
  UsersIcon,
  BriefcaseIcon,
  AlertTriangleIcon,
} from "lucide-react";
import type { Project } from "@/types";
import { formatDistanceToNow } from "date-fns";

interface ProjectContextRailProps {
  project: Project;
  applicantCount: number;
}

export function ProjectContextRail({
  project,
  applicantCount,
}: ProjectContextRailProps) {
  const fillRate = project.maxApplicants
    ? Math.round((project.currentApplicants / project.maxApplicants) * 100)
    : 0;
  const isAlmostFull = fillRate >= 80;
  const isFull = fillRate >= 100;
  const spotsRemaining = project.maxApplicants
    ? project.maxApplicants - project.currentApplicants
    : null;
  const daysLeft = Math.ceil(
    (new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isUrgent = daysLeft <= 7 && daysLeft > 0;

  return (
    <div className="p-6 space-y-6 overflow-y-auto scrollbar-hide">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="size-1.5 rounded-full bg-primary" />
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Project
          </span>
        </div>

        <h3 className="text-lg font-bold text-foreground leading-tight line-clamp-2">
          {project.title}
        </h3>

        {project.companyName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BriefcaseIcon className="size-4 shrink-0" />
            <span className="truncate">{project.companyName}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {project.projectType}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {project.difficultyLevel}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Capacity */}
      <div className="space-y-3">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">
          Capacity
        </div>

        {project.maxApplicants ? (
          <>
            <div className="p-5 rounded-xl border-2 border-border bg-background space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Fill Rate</span>
                <span
                  className={`text-3xl font-bold tabular-nums ${
                    isFull
                      ? "text-destructive"
                      : isAlmostFull
                      ? "text-yellow-600"
                      : "text-foreground"
                  }`}
                >
                  {fillRate}%
                </span>
              </div>
              <Progress value={fillRate} className="h-2" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {project.currentApplicants} / {project.maxApplicants}
                </span>
                {spotsRemaining !== null && spotsRemaining > 0 && (
                  <span
                    className={`font-semibold ${
                      spotsRemaining <= 3
                        ? "text-destructive"
                        : "text-foreground"
                    }`}
                  >
                    {spotsRemaining} left
                  </span>
                )}
              </div>
            </div>

            {isAlmostFull && spotsRemaining !== null && spotsRemaining > 0 && (
              <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30">
                <div className="flex items-start gap-2">
                  <AlertTriangleIcon className="size-4 text-yellow-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-yellow-800 dark:text-yellow-200">
                    <div className="font-semibold mb-1">Almost Full</div>
                    Only {spotsRemaining} spot{spotsRemaining === 1 ? "" : "s"}{" "}
                    remaining
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-5 rounded-xl border-2 border-border bg-background">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                Applications
              </span>
              <span className="text-3xl font-bold text-foreground tabular-nums">
                {applicantCount}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">No limit set</p>
          </div>
        )}
      </div>

      <Separator />

      {/* Details */}
      <div className="space-y-3">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">
          Timeline
        </div>
        <div className="grid gap-2">
          <DetailRow
            icon={ClockIcon}
            label="Duration"
            value={project.duration}
          />
          <DetailRow
            icon={CalendarIcon}
            label="Deadline"
            value={formatDistanceToNow(new Date(project.deadline), {
              addSuffix: true,
            })}
            urgent={isUrgent}
          />
          <DetailRow
            icon={MapPinIcon}
            label="Location"
            value={project.isRemote ? "Remote" : project.location || "—"}
          />
          {project.stipend && (
            <DetailRow
              icon={DollarSignIcon}
              label="Stipend"
              value={`$${project.stipend.toLocaleString()}/mo`}
              highlight
            />
          )}
          <DetailRow
            icon={UsersIcon}
            label="Applicants"
            value={project.currentApplicants.toString()}
          />
        </div>
      </div>

      <Separator />

      {/* Skills */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Required Skills
          </span>
          <Badge
            variant="secondary"
            className="h-5 px-1.5 text-[10px] tabular-nums"
          >
            {project.skills.length}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {project.skills.map((skill) => (
            <Badge
              key={skill}
              variant="outline"
              className="text-xs font-medium"
            >
              {skill}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      {/* Owner */}
      <div className="space-y-3">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">
          Posted By
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
          <div className="size-10 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-sm font-semibold shrink-0">
            {project.createdBy.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground truncate">
              {project.createdBy.fullName}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              {project.createdBy.role}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  urgent,
  highlight,
}: {
  icon: any;
  label: string;
  value: string;
  urgent?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 py-2.5 px-3 rounded-lg ${
        highlight
          ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30"
          : urgent
          ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30"
          : "bg-background border border-border"
      }`}
    >
      <Icon
        className={`size-4 shrink-0 ${
          highlight
            ? "text-green-600"
            : urgent
            ? "text-red-600"
            : "text-muted-foreground"
        }`}
      />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
        <div
          className={`text-sm font-medium truncate ${
            highlight
              ? "text-green-800 dark:text-green-200"
              : urgent
              ? "text-red-800 dark:text-red-200"
              : "text-foreground"
          }`}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
