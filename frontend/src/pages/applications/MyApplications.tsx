import { ApplicationCard } from "@/components/application/ApplicationCard";
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
import { useMyApplications } from "@/hooks/queries/useApplications";
import { FileTextIcon, Loader2Icon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

export default function MyApplications() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const {
    data: applications = [],
    isLoading,
    isError,
    error,
  } = useMyApplications();

  const filteredApplications = useMemo(() => {
    if (statusFilter === "all") return applications;
    return applications.filter((app) => app.status === statusFilter);
  }, [applications, statusFilter]);

  // Stats calculation
  const stats = useMemo(
    () => ({
      total: applications.length,
      pending: applications.filter((a) => a.status === "PENDING").length,
      underReview: applications.filter((a) => a.status === "UNDER_REVIEW")
        .length,
      accepted: applications.filter((a) => a.status === "ACCEPTED").length,
      rejected: applications.filter((a) => a.status === "REJECTED").length,
    }),
    [applications]
  );

  // Error state
  if (isError) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-4">
            <FileTextIcon className="h-8 w-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Failed to load applications
          </h3>
          <p className="text-gray-600 mb-4">
            {(error as any)?.response?.data?.error?.message ||
              "Please try again later"}
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2Icon className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              My Applications
            </h1>
            <p className="mt-2 text-gray-600">
              Track your project and internship applications
            </p>
          </div>
          <Button onClick={() => navigate(ROUTES.PROJECTS)}>
            <SearchIcon className="h-4 w-4" />
            Browse Projects
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-600">Total Applications</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="rounded-lg border bg-yellow-50 p-4">
            <p className="text-sm text-yellow-800">Pending</p>
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
              <SelectItem value="all">All Applications</SelectItem>
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
              <FileTextIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No applications yet
            </h3>
            <p className="text-gray-600 mb-4">
              Start by browsing projects and applying to ones that interest you.
            </p>
            <Button onClick={() => navigate(ROUTES.PROJECTS)}>
              Browse Projects
            </Button>
          </div>
        )}

        {/* No Results for Filter */}
        {applications.length > 0 && filteredApplications.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
              <FileTextIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No applications found
            </h3>
            <p className="text-gray-600 mb-4">
              No applications match the selected filter.
            </p>
            <Button variant="outline" onClick={() => setStatusFilter("all")}>
              Clear Filter
            </Button>
          </div>
        )}

        {/* Applications Grid */}
        {filteredApplications.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredApplications.map((application) => (
              <ApplicationCard key={application.id} application={application} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
