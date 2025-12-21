import { projectApi } from "@/api/project.api";
import { ApplicantCard } from "@/components/application/ApplicantCard";
import { ReviewApplicationDialog } from "@/components/application/ReviewApplicationDialog";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROUTES } from "@/constants";
import type { Application, Project } from "@/types";
import { ArrowLeftIcon, Loader2Icon, UsersIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

export default function ProjectApplicantsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<
    Application[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Review dialog state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] =
    useState<Application | null>(null);

  // Fetch project and applications
  useEffect(() => {
    if (!id) {
      navigate(ROUTES.PROJECTS);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch project details
        const projectData = await projectApi.getProjectById(id);
        setProject(projectData);

        // Fetch applications for this project
        const applicationsData = await projectApi.getProjectApplications(id);
        setApplications(applicationsData);
        setFilteredApplications(applicationsData);
      } catch (error: any) {
        console.error("Failed to fetch data:", error);
        toast.error("Failed to load applicants", {
          description:
            error.response?.data?.error?.message || "Please try again later",
        });
        navigate(ROUTES.PROJECTS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  // Filter applications by status
  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredApplications(applications);
    } else {
      setFilteredApplications(
        applications.filter((app) => app.status === statusFilter)
      );
    }
  }, [statusFilter, applications]);

  // Handle review click
  const handleReviewClick = (applicationId: string) => {
    const application = applications.find((app) => app.id === applicationId);
    if (application) {
      setSelectedApplication(application);
      setReviewDialogOpen(true);
    }
  };

  // Handle review success
  const handleReviewSuccess = async () => {
    // Refresh applications
    if (!id) return;

    try {
      const applicationsData = await projectApi.getProjectApplications(id);
      setApplications(applicationsData);
    } catch (error) {
      console.error("Failed to refresh applications:", error);
    }
  };

  // Stats calculation
  const stats = {
    total: applications.length,
    pending: applications.filter((a) => a.status === "PENDING").length,
    underReview: applications.filter((a) => a.status === "UNDER_REVIEW").length,
    accepted: applications.filter((a) => a.status === "ACCEPTED").length,
    rejected: applications.filter((a) => a.status === "REJECTED").length,
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

  return (
    <Layout maxWidth="7xl">
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" asChild>
          <Link to={`/projects/${id}`}>
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Project
          </Link>
        </Button>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Applicants for "{project.title}"
          </h1>
          <p className="mt-2 text-gray-600">
            Review and manage applications for this project
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-600">Total Applicants</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="rounded-lg border bg-yellow-50 p-4">
            <p className="text-sm text-yellow-800">Pending Review</p>
            <p className="text-2xl font-bold text-yellow-900">
              {stats.pending}
            </p>
          </div>
          <div className="rounded-lg border bg-blue-50 p-4">
            <p className="text-sm text-blue-800">Under Review</p>
            <p className="text-2xl font-bold text-blue-900">
              {stats.underReview}
            </p>
          </div>
          <div className="rounded-lg border bg-green-50 p-4">
            <p className="text-sm text-green-800">Accepted</p>
            <p className="text-2xl font-bold text-green-900">
              {stats.accepted}
            </p>
          </div>
          <div className="rounded-lg border bg-red-50 p-4">
            <p className="text-sm text-red-800">Rejected</p>
            <p className="text-2xl font-bold text-red-900">{stats.rejected}</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Filter by status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-50">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Applicants</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
              <SelectItem value="ACCEPTED">Accepted</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-500">
            Showing {filteredApplications.length} of {stats.total}
          </span>
        </div>

        {/* Empty State */}
        {applications.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
              <UsersIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No applicants yet
            </h3>
            <p className="text-gray-600">
              Applications will appear here once students start applying.
            </p>
          </div>
        )}

        {/* No Results for Filter */}
        {applications.length > 0 && filteredApplications.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
              <UsersIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No applicants found
            </h3>
            <p className="text-gray-600 mb-4">
              No applications match the selected filter.
            </p>
            <Button variant="outline" onClick={() => setStatusFilter("all")}>
              Clear Filter
            </Button>
          </div>
        )}

        {/* Applicants Grid */}
        {filteredApplications.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredApplications.map((application) => (
              <ApplicantCard
                key={application.id}
                application={application}
                onReview={handleReviewClick}
              />
            ))}
          </div>
        )}

        {/* Review Dialog */}
        <ReviewApplicationDialog
          application={selectedApplication}
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          onSuccess={handleReviewSuccess}
        />
      </div>
    </Layout>
  );
}
