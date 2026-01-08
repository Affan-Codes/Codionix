import { Link } from "react-router";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Project } from "@/types";
import {
  BriefcaseIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ProjectCardProps {
  project: Project;
  showActions?: boolean;
  onApply?: (projectId: string) => void;
  onEdit?: (projectId: string) => void;
}

export function ProjectCard({
  project,
  showActions = true,
  onApply,
  onEdit,
}: ProjectCardProps) {
  const isAlmostFull =
    project.maxApplicants &&
    project.currentApplicants / project.maxApplicants >= 0.8;

  const difficultyStyles = {
    BEGINNER: "status-success border",
    INTERMEDIATE: "status-pending border",
    ADVANCED: "status-error border",
  };

  const typeStyles = {
    PROJECT: "bg-primary/10 text-primary border-primary/20 border",
    INTERNSHIP: "bg-purple-500/10 text-purple-700 border-purple-500/20 border",
  };

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
      <CardHeader className="space-y-4 pb-4">
        {/* Type + Difficulty (Top Badges) */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={typeStyles[project.projectType]} variant="outline">
            {project.projectType}
          </Badge>
          <Badge
            className={difficultyStyles[project.difficultyLevel]}
            variant="outline"
          >
            {project.difficultyLevel}
          </Badge>
          {isAlmostFull && (
            <Badge className="status-error border animate-pulse">
              🔥 Almost Full
            </Badge>
          )}
        </div>

        {/* Title (Primary Focus) */}
        <div>
          <h3 className="text-xl font-semibold text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {project.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
            {project.description}
          </p>
        </div>

        {/* Company/Creator (Secondary Info) */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BriefcaseIcon className="size-4 shrink-0" />
          <span className="truncate">
            {project.companyName || `By ${project.createdBy.fullName}`}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-6 pb-4">
        {/* Skills (Visual Emphasis) */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Skills Required
          </p>
          <div className="flex flex-wrap gap-2">
            {project.skills.slice(0, 4).map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="text-xs font-medium"
              >
                {skill}
              </Badge>
            ))}
            {project.skills.length > 4 && (
              <Badge
                variant="secondary"
                className="text-xs font-medium bg-muted text-muted-foreground"
              >
                +{project.skills.length - 4}
              </Badge>
            )}
          </div>
        </div>

        {/* Meta Info (Grid Layout) */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ClockIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{project.duration}</span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {formatDistanceToNow(new Date(project.deadline), {
                addSuffix: true,
              })}
            </span>
          </div>

          {(project.location || project.isRemote) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPinIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {" "}
                {project.isRemote ? "Remote" : project.location}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-muted-foreground">
            <UsersIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {project.currentApplicants}
              {project.maxApplicants && `/${project.maxApplicants}`}
            </span>
          </div>
        </div>

        {/* Stipend (If Available) */}
        {project.stipend && (
          <div className="flex items-center gap-2 text-sm font-semibold text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
            <TrendingUpIcon className="h-4 w-4" />
            <span>${project.stipend.toLocaleString()}/month</span>
          </div>
        )}
      </CardContent>

      {showActions && (
        <CardFooter className="gap-3 pt-4 border-t">
          <Button asChild className="flex-1" variant="outline" size={"default"}>
            <Link to={`/projects/${project.id}`}>View Details</Link>
          </Button>

          {onApply && (
            <Button
              onClick={() => onApply(project.id)}
              className="flex-1"
              size={"default"}
            >
              Apply Now
            </Button>
          )}

          {onEdit && (
            <Button
              onClick={() => onEdit(project.id)}
              variant="secondary"
              className="flex-1"
              size={"default"}
            >
              Edit
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
