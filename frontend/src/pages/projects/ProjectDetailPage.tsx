import { ApplicationForm } from "@/components/application/ApplicationForm";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/constants";
import { useAuth } from "@/context/AuthContext";
import { useProject } from "@/hooks/queries/useQueries";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeftIcon,
  BriefcaseIcon,
  CalendarIcon,
  ClockIcon,
  DollarSignIcon,
  EditIcon,
  Loader2Icon,
  MapPinIcon,
  UsersIcon,
  SparklesIcon,
  CheckCircle2Icon,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  const {
    data: project,
    isLoading,
    isError,
    error,
  } = useProject(id || "", {
    enabled: !!id,
  });

  const isCreator = isAuthenticated && user?.id === project?.createdBy.id;
  const canApply =
    isAuthenticated &&
    user?.role === "STUDENT" &&
    !isCreator &&
    project?.status === "PUBLISHED";

  const handleApplicationSuccess = () => {
    setShowApplicationForm(false);
    toast.success("Application submitted successfully!");
  };

  const handleApplyClick = () => {
    if (!isAuthenticated) {
      toast.error("Please login to apply");
      navigate(ROUTES.LOGIN);
      return;
    }

    if (user?.role !== "STUDENT") {
      toast.error("Only students can apply to projects");
      return;
    }

    setShowApplicationForm(true);
    setTimeout(() => {
      document.getElementById("application-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  if (isError) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full text-center border-destructive/20">
            <CardContent className="pt-12 pb-8 space-y-4">
              <div className="inline-flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
                <BriefcaseIcon className="size-8 text-destructive" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground">
                  Project Not Found
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {(error as any)?.response?.data?.error?.message ||
                    "This project may have been removed or doesn't exist"}
                </p>
              </div>
              <Button
                onClick={() => navigate(ROUTES.PROJECTS)}
                className="mt-4"
              >
                Browse Projects
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2Icon className="size-12 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">
              Loading project details...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!project) return null;

  const difficultyStyles = {
    BEGINNER: "status-success border",
    INTERMEDIATE: "status-pending border",
    ADVANCED: "status-error border",
  };

  const typeStyles = {
    PROJECT: "bg-primary/10 text-primary border-primary/20 border",
    INTERNSHIP: "bg-purple-500/10 text-purple-700 border-purple-500/20 border",
  };

  const statusStyles = {
    DRAFT: "status-draft border",
    PUBLISHED: "status-success border",
    CLOSED: "status-error border",
  };

  const isAlmostFull =
    project.maxApplicants &&
    project.currentApplicants / project.maxApplicants >= 0.8;

  const applicantPercentage = project.maxApplicants
    ? Math.min((project.currentApplicants / project.maxApplicants) * 100, 100)
    : 0;

  return (
    <Layout maxWidth="7xl">
      <div className="space-y-8">
        {/* Back Navigation */}
        <Button variant="ghost" asChild size="sm" className="group">
          <Link to={ROUTES.PROJECTS}>
            <ArrowLeftIcon className="size-4 group-hover:-translate-x-1 transition-transform" />
            Back to Projects
          </Link>
        </Button>

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/10 via-primary/5 to-purple-500/10 border-2 border-primary/10 p-8 sm:p-12">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 size-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 size-64 bg-purple-500/5 rounded-full blur-3xl" />

          <div className="relative space-y-6">
            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={typeStyles[project.projectType]}
                variant="outline"
              >
                {project.projectType}
              </Badge>
              <Badge
                className={difficultyStyles[project.difficultyLevel]}
                variant="outline"
              >
                {project.difficultyLevel}
              </Badge>
              <Badge className={statusStyles[project.status]} variant="outline">
                {project.status}
              </Badge>
              {isAlmostFull && (
                <Badge className="status-error border animate-pulse">
                  🔥 Almost Full
                </Badge>
              )}
            </div>

            {/* Title */}
            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight leading-tight">
                {project.title}
              </h1>
              <div className="flex items-center gap-3 text-muted-foreground">
                <BriefcaseIcon className="size-5" />
                <span className="text-lg">
                  {project.companyName || `By ${project.createdBy.fullName}`}
                </span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              {isCreator && (
                <>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => navigate(`/projects/${id}/edit`)}
                    className="group"
                  >
                    <EditIcon className="size-4 group-hover:rotate-12 transition-transform" />
                    Edit Project
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => navigate(`/projects/${id}/applicants`)}
                    className="group"
                  >
                    <UsersIcon className="size-4 group-hover:scale-110 transition-transform" />
                    View Applicants ({project.currentApplicants})
                  </Button>
                </>
              )}
              {canApply && !showApplicationForm && (
                <Button
                  size="lg"
                  onClick={handleApplyClick}
                  className="bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all group"
                >
                  <SparklesIcon className="size-4 group-hover:rotate-12 transition-transform" />
                  Apply Now
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About Section */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <div className="size-2 rounded-full bg-primary animate-pulse" />
                  About this {project.projectType.toLowerCase()}
                </CardTitle>
                <CardDescription className="text-base">
                  Learn what you'll work on and achieve
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap text-base">
                  {project.description}
                </p>
              </CardContent>
            </Card>

            {/* Required Skills */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <CheckCircle2Icon className="size-6 text-primary" />
                  Required Skills
                </CardTitle>
                <CardDescription className="text-base">
                  Technical expertise needed for success
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {project.skills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className="text-sm px-4 py-2 font-medium"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Application Form */}
            {showApplicationForm && (
              <div id="application-form" className="scroll-mt-8">
                <ApplicationForm
                  projectId={project.id}
                  projectTitle={project.title}
                  onSuccess={handleApplicationSuccess}
                />
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6 lg:sticky lg:top-8 lg:self-start">
            {/* Quick Details */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-xl">Project Details</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Duration */}
                <div className="flex items-start gap-4 group">
                  <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    <ClockIcon className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Duration
                    </p>
                    <p className="font-semibold text-foreground">
                      {project.duration}
                    </p>
                  </div>
                </div>

                {/* Deadline */}
                <div className="flex items-start gap-4 group">
                  <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive group-hover:bg-destructive/20 transition-colors">
                    <CalendarIcon className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Application Deadline
                    </p>
                    <p className="font-semibold text-foreground">
                      {format(new Date(project.deadline), "MMM dd, yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(project.deadline), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>

                {/* Location */}
                {(project.location || project.isRemote) && (
                  <div className="flex items-start gap-4 group">
                    <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 group-hover:bg-blue-500/20 transition-colors">
                      <MapPinIcon className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Location
                      </p>
                      <p className="font-semibold text-foreground">
                        {project.isRemote ? "Remote" : project.location}
                      </p>
                    </div>
                  </div>
                )}

                {/* Stipend */}
                {project.stipend && (
                  <div className="flex items-start gap-4 group">
                    <div className="p-2.5 rounded-lg bg-green-500/10 text-green-600 group-hover:bg-green-500/20 transition-colors">
                      <DollarSignIcon className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Monthly Stipend
                      </p>
                      <p className="text-xl font-bold text-green-600">
                        ${project.stipend.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Applicants */}
                <div className="flex items-start gap-4 group">
                  <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 group-hover:bg-purple-500/20 transition-colors">
                    <UsersIcon className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Applicants
                    </p>
                    <div className="flex items-baseline gap-2">
                      <p className="font-semibold text-foreground text-lg">
                        {project.currentApplicants}
                      </p>
                      {project.maxApplicants && (
                        <p className="text-sm text-muted-foreground">
                          / {project.maxApplicants}
                        </p>
                      )}
                    </div>
                    {project.maxApplicants && (
                      <div
                        className="mt-2 h-2 bg-muted rounded-full overflow-hidden"
                        role="progressbar"
                        aria-valuenow={project.currentApplicants}
                        aria-valuemin={0}
                        aria-valuemax={project.maxApplicants}
                        aria-label={`${project.currentApplicants} out of ${project.maxApplicants} applicants`}
                      >
                        <div
                          className="h-full bg-linear-to-r from-primary to-primary/70 transition-all duration-500"
                          style={{ width: `${applicantPercentage}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Apply CTA (Sticky) */}
            {canApply && !showApplicationForm && (
              <Card className="border-2 border-primary/20 bg-linear-to-br from-primary/5 to-purple-500/5">
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2 text-center">
                    <div className="inline-flex size-14 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary/70 shadow-lg mx-auto">
                      <SparklesIcon className="size-7 text-white" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground">
                      Ready to Apply?
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Show your skills and secure this opportunity
                    </p>
                  </div>
                  <Button
                    onClick={handleApplyClick}
                    size="lg"
                    className="w-full bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all"
                  >
                    Apply to this Project
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Creator Info */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-xl">Posted By</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex size-14 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary/70 text-white font-bold text-xl shadow-lg">
                    {project.createdBy.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-lg truncate">
                      {project.createdBy.fullName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {project.createdBy.role}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
