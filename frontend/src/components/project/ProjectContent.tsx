import type { Project, User } from "@/types";
import { formatDistanceToNow } from "date-fns";

interface ProjectContentProps {
  project: Project;
  analysis: ReturnType<
    typeof import("@/hooks/useProjectAnalysis").useProjectAnalysis
  >;
  user: User | null | undefined;
}

export function ProjectContent({ project, analysis }: ProjectContentProps) {
  return (
    <div className="space-y-8">
      {/* Description */}
      <div className="space-y-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">
          Project Description
        </div>
        <div className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
          {project.description}
        </div>
      </div>

      {/* Key Details */}
      <div className="space-y-4 pt-6 border-t border-border">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">
          Key Details
        </div>
        <div className="space-y-2 text-sm text-foreground">
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground">•</span>
            <span>Duration: {project.duration}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground">•</span>
            <span>
              Location: {project.isRemote ? "Remote" : project.location}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground">•</span>
            <span>
              Deadline:{" "}
              {formatDistanceToNow(new Date(project.deadline), {
                addSuffix: true,
              })}
            </span>
          </div>
          {analysis && (
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground">•</span>
              <span>
                Competition: {analysis.fillRate}% full (
                {project.currentApplicants}/{project.maxApplicants || "∞"}{" "}
                applicants)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
