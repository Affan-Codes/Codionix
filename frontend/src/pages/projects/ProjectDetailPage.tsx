import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useProject } from "@/hooks/queries/useQueries";
import { ArrowLeft, Loader2, Edit, Users, X } from "lucide-react";
import { ROUTES } from "@/constants";
import { ApplicationForm } from "@/components/application/ApplicationForm";
import { useProjectAnalysis } from "@/hooks/useProjectAnalysis";
import { ProjectMetadata } from "@/components/project/ProjectMetadata";
import { ProjectHeader } from "@/components/project/ProjectHeader";
import { ProjectContent } from "@/components/project/ProjectContent";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showApplication, setShowApplication] = useState(false);

  const {
    data: project,
    isLoading,
    isError,
  } = useProject(id || "", { enabled: !!id });

  const analysis = useProjectAnalysis(project, user);

  const isCreator = isAuthenticated && user?.id === project?.createdBy.id;
  const canApply =
    isAuthenticated &&
    user?.role === "STUDENT" &&
    !isCreator &&
    project?.status === "PUBLISHED";

  const handleApplicationSuccess = () => {
    setShowApplication(false);
    navigate(ROUTES.APPLICATIONS);
  };

  if (isError) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="text-sm text-muted-foreground">
              Project not found
            </div>
            <Button
              onClick={() => navigate(ROUTES.PROJECTS)}
              variant="outline"
              size="sm"
            >
              Browse Projects
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!project) return null;

  return (
    <Layout maxWidth="full">
      {/* MOBILE: Stacked Layout */}
      <div className="lg:hidden -mt-8">
        <div className="space-y-6 pb-20">
          {/* Header */}
          <div className="p-4 border-b border-border sticky top-12 bg-background/95 backdrop-blur-sm z-10">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" asChild size="sm" className="-ml-2">
                <Link to={ROUTES.PROJECTS}>
                  <ArrowLeft className="size-4" />
                </Link>
              </Button>
              {isCreator && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/projects/${id}/edit`)}
                  >
                    <Edit className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/projects/${id}/applicants`)}
                  >
                    <Users className="size-4" />
                    {project.currentApplicants}
                  </Button>
                </div>
              )}
            </div>
            <ProjectHeader project={project} compact />
          </div>

          {/* Metadata (Mobile) */}
          <div className="px-4">
            <ProjectMetadata
              project={project}
              analysis={analysis}
              user={user}
              compact
            />
          </div>

          {/* Content (Mobile) */}
          <div className="px-4">
            <ProjectContent project={project} analysis={analysis} user={user} />
          </div>

          {/* Application Form (Mobile) */}
          {showApplication && canApply && (
            <div className="px-4">
              <ApplicationForm
                projectId={project.id}
                onSuccess={handleApplicationSuccess}
                skillMatch={analysis?.matchRate}
                missingSkills={analysis?.missingSkills}
                competitionLevel={
                  analysis?.fillRate && analysis.fillRate > 80
                    ? "critical"
                    : analysis?.fillRate && analysis.fillRate > 60
                    ? "high"
                    : analysis?.fillRate && analysis.fillRate > 40
                    ? "moderate"
                    : "low"
                }
              />
            </div>
          )}
        </div>

        {/* Fixed Bottom Action (Mobile) */}
        {canApply && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
            {!showApplication ? (
              <Button
                onClick={() => setShowApplication(true)}
                className="w-full"
              >
                Apply to Project
              </Button>
            ) : (
              <Button
                onClick={() => setShowApplication(false)}
                variant="outline"
                className="w-full"
              >
                <X className="size-4" />
                Cancel Application
              </Button>
            )}
          </div>
        )}
      </div>

      {/* DESKTOP: Dual-Pane Layout */}
      <div className="hidden lg:block -mt-4">
        {/* Top Navigation Bar */}
        <div className="sticky top-12 z-10 h-12 border-b border-border bg-background flex items-center px-6">
          <div className="flex items-center gap-6 flex-1">
            <Button variant="ghost" asChild size="sm" className="-ml-2">
              <Link to={ROUTES.PROJECTS}>
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 bg-primary rounded-full" />
              <span className="text-sm font-medium text-foreground truncate max-w-md">
                {project.title}
              </span>
            </div>
          </div>
          {isCreator && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/projects/${id}/edit`)}
              >
                <Edit className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/projects/${id}/applicants`)}
              >
                <Users className="size-4" />
                {project.currentApplicants}
              </Button>
            </div>
          )}
        </div>

        {/* Dual Layout Container */}
        <div className="flex h-[calc(100vh-12rem)]">
          {/* LEFT RAIL: Metadata (NO SCROLL) */}
          <aside className="w-80 border-r border-border bg-muted/10 flex flex-col">
            {/* Scrollable metadata container */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <div className="p-6">
                <ProjectMetadata
                  project={project}
                  analysis={analysis}
                  user={user}
                />
              </div>
            </div>
          </aside>

          {/* RIGHT CONTENT: Description + Form (SCROLLABLE) */}
          <main className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="max-w-4xl mx-auto p-8">
              {/* Header */}
              <div className="mb-8">
                <ProjectHeader project={project} />
              </div>

              {/* Content */}
              <div className="mb-12">
                <ProjectContent
                  project={project}
                  analysis={analysis}
                  user={user}
                />
              </div>

              {/* Application Zone */}
              {canApply && !showApplication && (
                <div className="space-y-6">
                  <div className="border-t border-border pt-8">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                      Ready to Apply?
                    </div>
                    <p className="text-sm text-foreground leading-relaxed mb-6">
                      Review your compatibility metrics on the left. When ready,
                      start your application.
                    </p>
                    <Button onClick={() => setShowApplication(true)} size="lg">
                      Start Application
                    </Button>
                  </div>
                </div>
              )}

              {canApply && showApplication && (
                <div className="border-t border-border pt-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">
                      Application Composer
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowApplication(false)}
                    >
                      <X className="size-4" />
                      Cancel
                    </Button>
                  </div>
                  <ApplicationForm
                    projectId={project.id}
                    onSuccess={handleApplicationSuccess}
                    skillMatch={analysis?.matchRate}
                    missingSkills={analysis?.missingSkills}
                    competitionLevel={
                      analysis?.fillRate && analysis.fillRate > 80
                        ? "critical"
                        : analysis?.fillRate && analysis.fillRate > 60
                        ? "high"
                        : analysis?.fillRate && analysis.fillRate > 40
                        ? "moderate"
                        : "low"
                    }
                  />
                </div>
              )}

              {!canApply && !isCreator && (
                <div className="border-t border-border pt-8">
                  <div className="p-6 rounded-lg border border-border bg-muted/20 text-center">
                    <p className="text-sm text-muted-foreground">
                      {!isAuthenticated
                        ? "Sign in to apply to this project"
                        : "Only students can apply to projects"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </Layout>
  );
}
