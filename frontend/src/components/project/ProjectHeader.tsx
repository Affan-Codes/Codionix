import { Badge } from "@/components/ui/badge";
import type { Project } from "@/types";
import { Briefcase } from "lucide-react";

interface ProjectHeaderProps {
  project: Project;
  compact?: boolean;
}

export function ProjectHeader({
  project,
  compact = false,
}: ProjectHeaderProps) {
  const difficultyStyles = {
    BEGINNER: "status-success",
    INTERMEDIATE: "status-pending",
    ADVANCED: "status-error",
  };

  const typeStyles = {
    PROJECT: "bg-primary/10 text-primary border-primary/20",
    INTERNSHIP: "bg-achievement/10 text-achievement border-achievement/20",
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={`${typeStyles[project.projectType]} text-xs`}
          >
            {project.projectType}
          </Badge>
          <Badge
            variant="outline"
            className={`${difficultyStyles[project.difficultyLevel]} text-xs`}
          >
            {project.difficultyLevel}
          </Badge>
        </div>
        <h1 className="text-xl font-bold text-foreground leading-tight">
          {project.title}
        </h1>
        {project.companyName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Briefcase className="size-3.5" />
            <span>{project.companyName}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={typeStyles[project.projectType]}>
          {project.projectType}
        </Badge>
        <Badge
          variant="outline"
          className={difficultyStyles[project.difficultyLevel]}
        >
          {project.difficultyLevel}
        </Badge>
      </div>
      <div>
        <h1 className="text-3xl font-bold text-foreground leading-tight mb-2">
          {project.title}
        </h1>
        {project.companyName && (
          <div className="flex items-center gap-2 text-base text-muted-foreground">
            <Briefcase className="size-4" />
            <span>{project.companyName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
