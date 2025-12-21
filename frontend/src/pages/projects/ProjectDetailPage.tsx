import { projectApi } from "@/api/project.api";
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
import type { Project } from "@/types";
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
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  // Fetch project details
  useEffect(() => {
    if (!id) {
      navigate(ROUTES.PROJECTS);
      return;
    }

    const fetchProject = async () => {
      setIsLoading(true);
      try {
        const data = await projectApi.getProjectById(id);
        setProject(data);
      } catch (error: any) {
        console.error("Failed to fetch project:", error);
        toast.error("Failed to load project", {
          description:
            error.response?.data?.error?.message || "Project not found",
        });
        navigate(ROUTES.PROJECTS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [id, navigate]);

  // Check permissions
  const isCreator = isAuthenticated && user?.id === project?.createdBy.id;
  const canApply =
    isAuthenticated &&
    user?.role === "STUDENT" &&
    !isCreator &&
    project?.status === "PUBLISHED";

  const handleApplicationSuccess = () => {
    setShowApplicationForm(false);
    toast.success("Application submitted successfully!");
    // Optionally refresh project data to update applicant count
    if (id) {
      projectApi.getProjectById(id).then(setProject);
    }
  };

  // Handle apply button click
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
    // Scroll to form
    setTimeout(() => {
      document.getElementById("application-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2Icon className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  if (!project) {
    return null;
  }

  const difficultyColors = {
    BEGINNER: "bg-green-100 text-green-800 border-green-200",
    INTERMEDIATE: "bg-yellow-100 text-yellow-800 border-yellow-200",
    ADVANCED: "bg-red-100 text-red-800 border-red-200",
  };

  const typeColors = {
    PROJECT: "bg-blue-100 text-blue-800 border-blue-200",
    INTERNSHIP: "bg-purple-100 text-purple-800 border-purple-200",
  };

  const statusColors = {
    DRAFT: "bg-gray-100 text-gray-800 border-gray-200",
    PUBLISHED: "bg-green-100 text-green-800 border-green-200",
    CLOSED: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <Layout maxWidth="5xl">
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" asChild>
          <Link to={ROUTES.PROJECTS}>
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Projects
          </Link>
        </Button>

        {/* Header */}
        <div className="">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge
                className={typeColors[project.projectType]}
                variant="outline"
              >
                {project.projectType}
              </Badge>
              <Badge
                className={difficultyColors[project.difficultyLevel]}
                variant="outline"
              >
                {project.difficultyLevel}
              </Badge>
              <Badge className={statusColors[project.status]} variant="outline">
                {project.status}
              </Badge>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {project.title}
            </h1>
            <div className="flex items-center gap-2 text-gray-600">
              <BriefcaseIcon className="h-4 w-4" />
              <span>
                {project.companyName || `By ${project.createdBy.fullName}`}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {isCreator && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/projects/${id}/edit`)}
                >
                  <EditIcon className="h-4 w-4" />
                  Edit Project
                </Button>
                <Button onClick={() => navigate(`/projects/${id}/applicants`)}>
                  <UsersIcon className="h-4 w-4" />
                  View Applicants ({project.currentApplicants})
                </Button>
              </div>
            )}
            {canApply && !showApplicationForm && (
              <Button onClick={handleApplyClick}>Apply Now</Button>
            )}
          </div>
        </div>

        {/* Project Details Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>
                  About this {project.projectType.toLowerCase()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {project.description}
                </p>
              </CardContent>
            </Card>

            {/* Required Skills */}
            <Card>
              <CardHeader>
                <CardTitle>Required Skills</CardTitle>
                <CardDescription>
                  Technical skills needed for this project
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {project.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Application Form */}
            {showApplicationForm && (
              <div id="application-form">
                <ApplicationForm
                  projectId={project.id}
                  projectTitle={project.title}
                  onSuccess={handleApplicationSuccess}
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <ClockIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Duration</p>
                    <p className="text-gray-600">{project.duration}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <CalendarIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Deadline</p>
                    <p className="text-gray-600">
                      {format(new Date(project.deadline), "MMM dd, yyyy")}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(project.deadline), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>

                {project.location && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPinIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">Location</p>
                      <p className="text-gray-600">{project.location}</p>
                    </div>
                  </div>
                )}

                {project.isRemote && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPinIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">Work Mode</p>
                      <p className="text-gray-600">Remote</p>
                    </div>
                  </div>
                )}

                {project.stipend && (
                  <div className="flex items-center gap-3 text-sm">
                    <DollarSignIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">Stipend</p>
                      <p className="text-green-600 font-semibold">
                        ${project.stipend.toLocaleString()}/month
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-sm">
                  <UsersIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Applicants</p>
                    <p className="text-gray-600">
                      {project.currentApplicants}
                      {project.maxApplicants && ` / ${project.maxApplicants}`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Apply CTA */}
            {canApply && !showApplicationForm && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <Button
                    onClick={handleApplyClick}
                    className="w-full"
                    size="lg"
                  >
                    Apply to this Project
                  </Button>
                  <p className="text-xs text-gray-600 text-center mt-3">
                    Show your interest and skills
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Creator Info */}
            <Card>
              <CardHeader>
                <CardTitle>Posted By</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white font-semibold">
                    {project.createdBy.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {project.createdBy.fullName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {project.createdBy.role}
                    </p>
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
