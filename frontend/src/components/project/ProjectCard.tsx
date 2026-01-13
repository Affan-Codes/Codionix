import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Project } from "@/types";
import {
  BriefcaseIcon,
  ClockIcon,
  MapPinIcon,
  DollarSignIcon,
  UsersIcon,
  ArrowRightIcon,
  FlameIcon,
  TrendingUpIcon,
} from "lucide-react";

interface ProjectCardProps {
  project: Project;
  viewMode: "grid" | "list";
  onApply?: (projectId: string) => void;
  onEdit?: (projectId: string) => void;
}

export function ProjectCard({
  project,
  viewMode,
  onApply,
  onEdit,
}: ProjectCardProps) {
  const daysLeft = Math.ceil(
    (new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isUrgent = daysLeft <= 7 && daysLeft > 0;
  const isHot = project.currentApplicants > 10;
  const isAlmostFull =
    project.maxApplicants &&
    project.currentApplicants / project.maxApplicants >= 0.8;

  if (viewMode === "list") {
    return (
      <div className="group relative">
        {/* Hover accent */}
        <div className="absolute -inset-px rounded-xl bg-linear-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative flex items-center gap-4 p-4 bg-card border border-border rounded-xl transition-all duration-200 group-hover:shadow-md group-hover:border-primary/20">
          {/* Left: Content */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Header Row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-2">
                {/* Type + Urgency */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`size-1.5 rounded-full ${
                        project.projectType === "INTERNSHIP"
                          ? "bg-purple-500"
                          : "bg-primary"
                      }`}
                    />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {project.projectType}
                    </span>
                  </div>

                  {isUrgent && (
                    <Badge className="h-5 text-[10px] px-1.5 gap-1 bg-destructive/10 text-destructive border-destructive/20">
                      <FlameIcon className="size-2.5" />
                      {daysLeft}d
                    </Badge>
                  )}

                  {isHot && (
                    <Badge className="h-5 text-[10px] px-1.5 gap-1 bg-primary/10 text-primary border-primary/20">
                      <TrendingUpIcon className="size-2.5" />
                      Hot
                    </Badge>
                  )}
                </div>

                {/* Title */}
                <Link
                  to={`/projects/${project.id}`}
                  className="block group/title"
                >
                  <h3 className="text-base font-semibold text-foreground leading-snug line-clamp-1 group-hover/title:text-primary transition-colors">
                    {project.title}
                  </h3>
                </Link>

                {/* Company */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BriefcaseIcon className="size-3 shrink-0" />
                  <span className="truncate">
                    {project.companyName || project.createdBy.fullName}
                  </span>
                </div>
              </div>

              {/* Skills (List View Only) */}
              <div className="hidden lg:flex items-center gap-1.5 flex-wrap max-w-xs">
                {project.skills.slice(0, 4).map((skill) => (
                  <span
                    key={skill}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium uppercase tracking-wide"
                  >
                    {skill}
                  </span>
                ))}
                {project.skills.length > 4 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{project.skills.length - 4}
                  </span>
                )}
              </div>
            </div>

            {/* Metadata Row */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1.5">
                <ClockIcon className="size-3 shrink-0" />
                <span>{project.duration}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <UsersIcon className="size-3 shrink-0" />
                <span className="tabular-nums">
                  {project.currentApplicants}
                  {project.maxApplicants && (
                    <>
                      <span className="text-border mx-0.5">/</span>
                      {project.maxApplicants}
                    </>
                  )}
                </span>
              </div>

              {(project.location || project.isRemote) && (
                <div className="flex items-center gap-1.5">
                  <MapPinIcon className="size-3 shrink-0" />
                  <span className="truncate">
                    {project.isRemote ? "Remote" : project.location}
                  </span>
                </div>
              )}

              {project.stipend && (
                <div className="flex items-center gap-1.5 font-semibold text-green-600">
                  <DollarSignIcon className="size-3 shrink-0" />
                  <span className="tabular-nums">
                    {project.stipend.toLocaleString()}/mo
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {onApply && (
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  onApply(project.id);
                }}
                size="sm"
                className="h-8 gap-1.5 group/btn"
              >
                <span>Apply</span>
                <ArrowRightIcon className="size-3 group-hover/btn:translate-x-0.5 transition-transform" />
              </Button>
            )}

            {onEdit && (
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  onEdit(project.id);
                }}
                variant="secondary"
                size="sm"
                className="h-8"
              >
                Edit
              </Button>
            )}

            {!onApply && !onEdit && (
              <Link to={`/projects/${project.id}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 group/btn"
                >
                  <span>View</span>
                  <ArrowRightIcon className="size-3 group-hover/btn:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // GRID VIEW
  return (
    <div className="group relative h-full">
      {/* Hover accent border */}
      <div className="absolute -inset-px rounded-xl bg-linear-to-b from-border to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative h-full flex flex-col bg-card border border-border rounded-xl overflow-hidden transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-0.5">
        {/* Header */}
        <div className="p-4 pb-3 space-y-3 border-b border-border/50">
          {/* Status Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={`size-1.5 rounded-full ${
                  project.projectType === "INTERNSHIP"
                    ? "bg-purple-500"
                    : "bg-primary"
                }`}
              />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {project.projectType}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {isUrgent && (
                <Badge className="h-5 text-[10px] px-1.5 gap-0.5 bg-destructive/10 text-destructive border-destructive/20">
                  <FlameIcon className="size-2.5" />
                  {daysLeft}d
                </Badge>
              )}

              {isHot && (
                <Badge className="h-5 text-[10px] px-1.5 gap-0.5 bg-primary/10 text-primary border-primary/20">
                  <TrendingUpIcon className="size-2.5" />
                </Badge>
              )}
            </div>
          </div>

          {/* Title */}
          <Link to={`/projects/${project.id}`} className="block group/title">
            <h3 className="text-base font-semibold text-foreground leading-snug line-clamp-2 group-hover/title:text-primary transition-colors">
              {project.title}
            </h3>
          </Link>

          {/* Company */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BriefcaseIcon className="size-3 shrink-0" />
            <span className="truncate">
              {project.companyName || project.createdBy.fullName}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-4 space-y-4">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <ClockIcon className="size-3 shrink-0" />
              <span className="truncate">{project.duration}</span>
            </div>

            <div className="flex items-center gap-1.5 text-muted-foreground">
              <UsersIcon className="size-3 shrink-0" />
              <span className="tabular-nums">
                {project.currentApplicants}
                {project.maxApplicants && (
                  <>
                    <span className="text-border mx-0.5">/</span>
                    {project.maxApplicants}
                  </>
                )}
              </span>
            </div>

            {(project.location || project.isRemote) && (
              <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                <MapPinIcon className="size-3 shrink-0" />
                <span className="truncate">
                  {project.isRemote ? "Remote" : project.location}
                </span>
              </div>
            )}
          </div>

          {/* Skills */}
          <div className="flex flex-wrap gap-1">
            {project.skills.slice(0, 3).map((skill) => (
              <span
                key={skill}
                className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium uppercase tracking-wide"
              >
                {skill}
              </span>
            ))}
            {project.skills.length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 text-muted-foreground">
                +{project.skills.length - 3}
              </span>
            )}
          </div>

          {/* Stipend */}
          {project.stipend && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
              <DollarSignIcon className="size-3" />
              <span className="tabular-nums">
                {project.stipend.toLocaleString()}/mo
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 pt-2 border-t border-border/50">
          {onApply && (
            <Button
              onClick={(e) => {
                e.preventDefault();
                onApply(project.id);
              }}
              size="sm"
              className="w-full h-8 gap-1.5 group/btn"
            >
              <span>Apply</span>
              <ArrowRightIcon className="size-3 group-hover/btn:translate-x-0.5 transition-transform" />
            </Button>
          )}

          {onEdit && (
            <Button
              onClick={(e) => {
                e.preventDefault();
                onEdit(project.id);
              }}
              variant="secondary"
              size="sm"
              className="w-full h-8"
            >
              Edit Project
            </Button>
          )}

          {!onApply && !onEdit && (
            <Link to={`/projects/${project.id}`}>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 gap-1.5 group/btn"
              >
                <span>View Details</span>
                <ArrowRightIcon className="size-3 group-hover/btn:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
