import { Link } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Project } from "@/types";
import {
  BriefcaseIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
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

  const difficultyColors = {
    BEGINNER: "bg-green-100 text-green-800 border-green-200",
    INTERMEDIATE: "bg-yellow-100 text-yellow-800 border-yellow-200",
    ADVANCED: "bg-red-100 text-red-800 border-red-200",
  };

  const typeColors = {
    PROJECT: "bg-blue-100 text-blue-800 border-blue-200",
    INTERNSHIP: "bg-purple-100 text-purple-800 border-purple-200",
  };

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-2">
          <CardTitle className="text-xl line-clamp-1">
            {project.title}
          </CardTitle>
          <Badge className={typeColors[project.projectType]} variant="outline">
            {project.projectType}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2">
          {project.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* Company/Creator */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <BriefcaseIcon className="h-4 w-4" />
          <span>
            {project.companyName || `By ${project.createdBy.fullName}`}
          </span>
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-1.5">
          {project.skills.slice(0, 4).map((skill) => (
            <Badge key={skill} variant="secondary" className="text-xs">
              {skill}
            </Badge>
          ))}
          {project.skills.length > 4 && (
            <Badge variant="secondary" className="text-xs">
              +{project.skills.length - 4}
            </Badge>
          )}
        </div>

        {/* Meta Info */}
        <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4" />
            <span>{project.duration}</span>
          </div>

          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span>
              {formatDistanceToNow(new Date(project.deadline), {
                addSuffix: true,
              })}
            </span>
          </div>

          {project.location && (
            <div className="flex items-center gap-2">
              <MapPinIcon className="h-4 w-4" />
              <span className="truncate">{project.location}</span>
            </div>
          )}

          {project.isRemote && (
            <div className="flex items-center gap-2">
              <MapPinIcon className="h-4 w-4" />
              <span>Remote</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4" />
            <span>
              {project.currentApplicants}
              {project.maxApplicants && `/${project.maxApplicants}`}
            </span>
            {isAlmostFull && (
              <Badge variant="destructive" className="text-xs">
                Almost Full
              </Badge>
            )}
          </div>
        </div>

        {/* Difficulty & Stipend */}
        <div className="flex items-center justify-between">
          <Badge
            className={difficultyColors[project.difficultyLevel]}
            variant="outline"
          >
            {project.difficultyLevel}
          </Badge>

          {project.stipend && (
            <span className="text-sm font-medium text-green-600">
              ${project.stipend.toLocaleString()}/month
            </span>
          )}
        </div>
      </CardContent>

      {showActions && (
        <CardFooter className="gap-2">
          <Button asChild className="flex-1" variant="outline">
            <Link to={`/projects/${project.id}`}>View Details</Link>
          </Button>

          {onApply && (
            <Button onClick={() => onApply(project.id)} className="flex-1">
              Apply Now
            </Button>
          )}

          {onEdit && (
            <Button
              onClick={() => onEdit(project.id)}
              variant="secondary"
              className="flex-1"
            >
              Edit
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
