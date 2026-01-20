import { useState, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/constants";
import { useProject, useProjectApplicants } from "@/hooks/queries/useQueries";
import {
  ArrowLeftIcon,
  Loader2Icon,
  UsersIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { ApplicantPipelineRail } from "@/components/applicants/ApplicantPipelineRail";
import { ApplicantListView } from "@/components/applicants/ApplicantListView";
import { ProjectContextRail } from "@/components/applicants/ProjectContextRail";
import { ReviewApplicationDialog } from "@/components/applicants/ReviewApplicationDialog";
import type { Application } from "@/types";

export type StatusFilter =
  | "all"
  | "pending"
  | "review"
  | "accepted"
  | "rejected";
export type SortMode = "recent" | "match" | "name" | "urgent";

export default function ProjectApplicantsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  const {
    data: project,
    isLoading: isProjectLoading,
    isError: isProjectError,
    error: projectError,
  } = useProject(id || "", { enabled: !!id });

  const {
    data: applications = [],
    isLoading: isApplicantsLoading,
    isError: isApplicantsError,
    error: applicantsError,
  } = useProjectApplicants(id || "");

  const filteredAndSorted = useMemo(() => {
    let result = [...applications];

    if (statusFilter !== "all") {
      const statusMap = {
        pending: "PENDING",
        review: "UNDER_REVIEW",
        accepted: "ACCEPTED",
        rejected: "REJECTED",
      };
      result = result.filter((a) => a.status === statusMap[statusFilter]);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((a) => {
        const name = a.student?.fullName.toLowerCase() || "";
        const email = a.student?.email.toLowerCase() || "";
        const skills = (a.student?.skills || [])
          .map((s) => s.toLowerCase())
          .join(" ");
        return (
          name.includes(query) ||
          email.includes(query) ||
          skills.includes(query)
        );
      });
    }

    result.sort((a, b) => {
      switch (sortMode) {
        case "recent":
          return (
            new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
          );
        case "name":
          return (a.student?.fullName || "").localeCompare(
            b.student?.fullName || ""
          );
        case "urgent":
          if (a.status === "PENDING" && b.status !== "PENDING") return -1;
          if (b.status === "PENDING" && a.status !== "PENDING") return 1;
          return (
            new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime()
          );
        case "match": {
          const aMatch = calculateMatch(a, project?.skills || []);
          const bMatch = calculateMatch(b, project?.skills || []);
          return bMatch - aMatch;
        }
        default:
          return 0;
      }
    });

    return result;
  }, [applications, statusFilter, searchQuery, sortMode, project]);

  const selected = useMemo(
    () => applications.find((a) => a.id === selectedId),
    [applications, selectedId]
  );

  const handleSelect = (applicationId: string) => {
    setSelectedId(applicationId);
    setReviewDialogOpen(true);
  };

  const isLoading = isProjectLoading || isApplicantsLoading;
  const isError = isProjectError || isApplicantsError;
  const error = projectError || applicantsError;

  if (isError) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="inline-flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
              <UsersIcon className="size-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Failed to load applicants
            </h3>
            <p className="text-sm text-muted-foreground">
              {(error as any)?.response?.data?.error?.message ||
                "Please try again"}
            </p>
            <Button onClick={() => navigate(ROUTES.PROJECTS)}>
              Back to Projects
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
          <div className="text-center space-y-3">
            <Loader2Icon className="size-10 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Loading pipeline...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!project) return null;

  return (
    <Layout maxWidth="full">
      <div className="fixed inset-0 top-14 flex overflow-hidden">
        {/* LEFT: Pipeline Intelligence */}
        <aside className="hidden lg:flex flex-col w-80 border-r border-border bg-muted/10">
          <ApplicantPipelineRail
            applications={applications}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            sortMode={sortMode}
            onSortModeChange={setSortMode}
          />
        </aside>

        {/* CENTER: Working Surface */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Command Strip */}
          <div className="h-16 border-b border-border bg-background flex items-center px-6 gap-4 shrink-0">
            <Button variant="ghost" size="sm" asChild className="-ml-2">
              <Link to={`/projects/${id}`}>
                <ArrowLeftIcon className="size-4" />
              </Link>
            </Button>

            <div className="h-6 w-px bg-border" />

            <div className="relative flex-1 max-w-md">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search candidates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 bg-muted/50"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                >
                  <XIcon className="size-3" />
                </Button>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="h-7 px-2 tabular-nums">
                {filteredAndSorted.length} / {applications.length}
              </Badge>
            </div>
          </div>

          {/* Candidate Stream */}
          <div className="flex-1 overflow-hidden">
            <ApplicantListView
              applications={filteredAndSorted}
              selectedId={selectedId}
              onSelect={handleSelect}
              projectSkills={project.skills}
            />
          </div>
        </main>

        {/* RIGHT: Project Context */}
        <aside className="hidden xl:flex flex-col w-96 border-l border-border bg-muted/5">
          <ProjectContextRail
            project={project}
            applicantCount={applications.length}
          />
        </aside>
      </div>

      <ReviewApplicationDialog
        application={selected || null}
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
      />
    </Layout>
  );
}

function calculateMatch(
  application: Application,
  projectSkills: string[]
): number {
  const candidateSkills = (application.student?.skills || []).map((s) =>
    s.toLowerCase()
  );
  const requiredSkills = projectSkills.map((s) => s.toLowerCase());
  const matches = requiredSkills.filter((skill) =>
    candidateSkills.includes(skill)
  ).length;
  return requiredSkills.length > 0
    ? (matches / requiredSkills.length) * 100
    : 0;
}
