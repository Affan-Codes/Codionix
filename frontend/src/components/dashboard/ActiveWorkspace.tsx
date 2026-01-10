import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPinIcon, DollarSignIcon, ChevronRightIcon } from "lucide-react";

interface ActiveProject {
  id: string;
  title: string;
  company: string;
  type: "INTERNSHIP" | "PROJECT";
  deadline: Date;
  progress: number;
  location: string;
  stipend?: number;
  nextMilestone: string;
  skills: string[];
}

interface ActiveWorkspaceProps {
  projects: ActiveProject[];
  viewAllLink?: string;
}

export function ActiveWorkspace({
  projects,
  viewAllLink = "/projects",
}: ActiveWorkspaceProps) {
  const formatDeadline = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    if (days < 7) return `${days}d`;
    if (days < 30) return `${Math.floor(days / 7)}w`;
    return `${Math.floor(days / 30)}mo`;
  };

  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Active Work</h2>
        </div>
        <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
          <p className="text-sm text-muted-foreground">
            No active projects yet
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link to={viewAllLink}>Browse Projects</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Active Work</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {projects.length} project{projects.length !== 1 ? "s" : ""} in
            progress
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

      {/* Projects Grid - Responsive */}
      <div className="grid grid-cols-1 gap-3">
        {projects.map((project) => (
          <Link
            key={project.id}
            to={`/projects/${project.id}`}
            className="block group"
          >
            <div className="relative border-l-4 border-l-transparent hover:border-l-primary transition-all duration-200">
              <div className="border border-border rounded-r-xl p-4 sm:p-5 hover:bg-accent/50 hover:border-primary/30 hover:shadow-md transition-all duration-200 bg-card">
                {/* Top Row */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Badges Row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className="text-xs font-medium shrink-0 h-5"
                      >
                        {project.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate">
                        {project.company}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-base sm:text-lg font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
                      {project.title}
                    </h3>

                    {/* Meta Info - Responsive */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPinIcon className="size-3.5 shrink-0" />
                        <span className="truncate">{project.location}</span>
                      </div>
                      {project.stipend && (
                        <>
                          <span className="hidden sm:inline text-border">
                            •
                          </span>
                          <div className="flex items-center gap-1">
                            <DollarSignIcon className="size-3.5 shrink-0" />
                            <span className="tabular-nums">
                              {project.stipend}/mo
                            </span>
                          </div>
                        </>
                      )}
                      <span className="hidden sm:inline text-border">•</span>
                      <span className="tabular-nums">
                        {formatDeadline(project.deadline)}
                      </span>
                    </div>
                  </div>

                  {/* Progress - Larger on mobile */}
                  <div className="shrink-0 text-right">
                    <div className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums leading-none">
                      {project.progress}
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar - Thicker on mobile */}
                <div className="h-2 sm:h-1.5 bg-muted rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-linear-to-r from-primary to-primary/80 transition-all duration-500 ease-out"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>

                {/* Bottom Row - Responsive */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {/* Skills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {project.skills.slice(0, 4).map((skill) => (
                      <span
                        key={skill}
                        className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                    {project.skills.length > 4 && (
                      <span className="text-xs text-muted-foreground">
                        +{project.skills.length - 4}
                      </span>
                    )}
                  </div>

                  {/* Next Milestone */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground sm:shrink-0">
                    <span className="font-medium">Next:</span>
                    <span className="truncate">{project.nextMilestone}</span>
                    <ChevronRightIcon className="size-3 hidden sm:block group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
