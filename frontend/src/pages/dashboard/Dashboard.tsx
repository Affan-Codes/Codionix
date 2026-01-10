import { Layout } from "@/components/layout/Layout";
import { ROUTES } from "@/constants";
import { useAuth } from "@/context/AuthContext";
import {
  BriefcaseIcon,
  FileTextIcon,
  PlusCircleIcon,
  TargetIcon,
} from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { ActiveWorkspace } from "@/components/dashboard/ActiveWorkspace";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { MetricsPanel } from "@/components/dashboard/MetricsPanel";

export default function Dashboard() {
  const { user } = useAuth();

  // MOCK DATA
  const activeWork = [
    {
      id: "1",
      title: "Full-Stack E-commerce Platform",
      company: "TechCorp Inc.",
      type: "INTERNSHIP" as const,
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      progress: 65,
      location: "Remote",
      stipend: 1200,
      nextMilestone: "API Integration",
      skills: ["React", "Node.js", "PostgreSQL", "AWS"],
    },
    {
      id: "2",
      title: "Mobile App UI Redesign",
      company: "DesignStudio",
      type: "PROJECT" as const,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      progress: 30,
      location: "New York, NY",
      nextMilestone: "Wireframe Review",
      skills: ["Figma", "React Native", "TypeScript"],
    },
    {
      id: "3",
      title: "ML Model Training Pipeline",
      company: "AI Labs",
      type: "INTERNSHIP" as const,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      progress: 85,
      location: "Remote",
      stipend: 1500,
      nextMilestone: "Model Deployment",
      skills: ["Python", "TensorFlow", "Docker"],
    },
  ];

  const recentActivity = [
    {
      id: "1",
      type: "application_submitted" as const,
      projectTitle: "Full-Stack E-commerce Platform",
      projectType: "INTERNSHIP" as const,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: "PENDING" as const,
    },
    {
      id: "2",
      type: "application_reviewed" as const,
      projectTitle: "React Dashboard Development",
      projectType: "PROJECT" as const,
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      status: "UNDER_REVIEW" as const,
    },
    {
      id: "3",
      type: "application_accepted" as const,
      projectTitle: "Node.js API Development",
      projectType: "INTERNSHIP" as const,
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      status: "ACCEPTED" as const,
    },
    {
      id: "4",
      type: "application_rejected" as const,
      projectTitle: "Mobile App UI Design",
      projectType: "PROJECT" as const,
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      status: "REJECTED" as const,
      rejectionReason:
        "Looking for candidates with more design experience in fintech applications",
    },
    {
      id: "5",
      type: "new_project" as const,
      projectTitle: "AI Chatbot Development",
      projectType: "PROJECT" as const,
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      skills: ["Python", "TensorFlow", "NLP"],
    },
  ];

  const weeklyMetrics = [
    {
      label: "Applications",
      value: 24,
      change: 12,
      format: "number" as const,
    },
    {
      label: "Profile Views",
      value: 87,
      change: 8,
      format: "number" as const,
    },
    {
      label: "Response Rate",
      value: 82,
      change: 5,
      format: "percentage" as const,
    },
    {
      label: "Projects Completed",
      value: 3,
      change: 1,
      format: "number" as const,
    },
  ];

  const upcomingDeadlines = [
    {
      id: "1",
      title: "ML Model Training Pipeline",
      type: "submission" as const,
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      urgent: true,
    },
    {
      id: "2",
      title: "Full-Stack E-commerce Platform",
      type: "application" as const,
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      urgent: false,
    },
    {
      id: "3",
      title: "Mobile App UI Redesign",
      type: "review" as const,
      date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      urgent: false,
    },
  ];

  const isStudent = user?.role === "STUDENT";

  return (
    <Layout>
      <div className="fixed inset-0 top-16 flex overflow-hidden">
        {/* LEFT RAIL: Command Strip (fixed width, no scroll) */}
        <aside className="hidden lg:flex flex-col w-20 border-r border-border bg-card">
          {/* User Avatar */}
          <div className="flex flex-col items-center py-6 border-b border-border">
            <div className="flex items-center justify-center size-12 rounded-xl bg-linear-to-br from-primary via-primary to-primary/70 text-primary-foreground font-bold text-lg shadow-lg">
              {user?.fullName.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Quick Stats - Vertical */}
          <div className="flex-1 flex flex-col gap-6 py-6 px-3">
            <div className="flex flex-col items-center">
              <div className="text-2xl font-bold text-foreground tabular-nums">
                {activeWork.length}
              </div>
              <div className="text-[10px] text-muted-foreground text-center uppercase tracking-wider mt-1 leading-tight">
                Active
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-2xl font-bold text-foreground tabular-nums">
                {recentActivity.filter((a) => a.status === "PENDING").length}
              </div>
              <div className="text-[10px] text-muted-foreground text-center uppercase tracking-wider mt-1 leading-tight">
                Pending
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-2xl font-bold text-foreground tabular-nums">
                {weeklyMetrics.find((m) => m.label === "Response Rate")?.value}
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <div className="text-[10px] text-muted-foreground text-center uppercase tracking-wider mt-1 leading-tight">
                Success
              </div>
            </div>
          </div>

          {/* Action Buttons - Vertical */}
          <div className="flex flex-col gap-2 p-3 border-t border-border">
            {isStudent ? (
              <>
                <Button
                  asChild
                  size="icon"
                  className="size-12 rounded-xl"
                  title="Find Projects"
                >
                  <Link to={ROUTES.PROJECTS}>
                    <TargetIcon className="size-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="icon"
                  variant="outline"
                  className="size-12 rounded-xl"
                  title="Applications"
                >
                  <Link to={ROUTES.APPLICATIONS}>
                    <FileTextIcon className="size-5" />
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button
                  asChild
                  size="icon"
                  className="size-12 rounded-xl"
                  title="New Project"
                >
                  <Link to={ROUTES.CREATE_PROJECT}>
                    <PlusCircleIcon className="size-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="icon"
                  variant="outline"
                  className="size-12 rounded-xl"
                  title="Manage"
                >
                  <Link to={ROUTES.PROJECTS}>
                    <BriefcaseIcon className="size-5" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </aside>

        {/* MAIN CONTENT: Single scroll container */}
        <div className="flex-1 flex overflow-hidden">
          {/* CENTER: Primary workspace */}
          <main className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="max-w-4xl mx-auto px-6 lg:px-8 py-8">
              <div className="space-y-12">
                {/* Header - Minimal */}
                <header className="space-y-1">
                  <h1 className="text-2xl font-bold text-foreground tracking-tight">
                    Workspace
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {new Date().toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </header>

                {/* Mobile Stats (visible on small screens) */}
                <div className="lg:hidden grid grid-cols-3 gap-4 pb-8 border-b border-border">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-foreground tabular-nums">
                      {activeWork.length}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                      Active
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-foreground tabular-nums">
                      {
                        recentActivity.filter((a) => a.status === "PENDING")
                          .length
                      }
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                      Pending
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-foreground tabular-nums">
                      {
                        weeklyMetrics.find((m) => m.label === "Response Rate")
                          ?.value
                      }
                      %
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                      Success
                    </div>
                  </div>
                </div>

                {/* Mobile Actions */}
                <div className="lg:hidden flex gap-2">
                  {isStudent ? (
                    <>
                      <Button asChild className="flex-1 gap-2">
                        <Link to={ROUTES.PROJECTS}>
                          <TargetIcon className="size-4" />
                          Find Projects
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        className="flex-1 gap-2"
                      >
                        <Link to={ROUTES.APPLICATIONS}>
                          <FileTextIcon className="size-4" />
                          Applications
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button asChild className="flex-1 gap-2">
                        <Link to={ROUTES.CREATE_PROJECT}>
                          <PlusCircleIcon className="size-4" />
                          New Project
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        className="flex-1 gap-2"
                      >
                        <Link to={ROUTES.PROJECTS}>
                          <BriefcaseIcon className="size-4" />
                          Manage
                        </Link>
                      </Button>
                    </>
                  )}
                </div>

                {/* Active Projects */}
                <section>
                  <ActiveWorkspace
                    projects={activeWork}
                    viewAllLink={ROUTES.PROJECTS}
                  />
                </section>

                {/* Activity Timeline */}
                <section>
                  <ActivityTimeline
                    activities={recentActivity}
                    viewAllLink={ROUTES.APPLICATIONS}
                  />
                </section>

                {/* Mobile Metrics */}
                <section className="lg:hidden">
                  <MetricsPanel
                    weeklyMetrics={weeklyMetrics}
                    upcomingDeadlines={upcomingDeadlines}
                  />
                </section>
              </div>
            </div>
          </main>

          {/* RIGHT RAIL: Context panel (desktop only) */}
          <aside className="hidden lg:block w-80 border-l border-border bg-muted/20 overflow-y-auto scrollbar-hide">
            <div className="p-6">
              <MetricsPanel
                weeklyMetrics={weeklyMetrics}
                upcomingDeadlines={upcomingDeadlines}
              />
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
