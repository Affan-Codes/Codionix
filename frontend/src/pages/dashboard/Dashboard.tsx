import { Layout } from "@/components/layout/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/constants";
import { useAuth } from "@/context/AuthContext";
import {
  BriefcaseIcon,
  FileTextIcon,
  TrendingUpIcon,
  SparklesIcon,
  RocketIcon,
  TargetIcon,
} from "lucide-react";
import { Link } from "react-router";

export default function Dashboard() {
  const { user } = useAuth();

  // Role-specific quick actions with emotional design
  const getQuickActions = () => {
    if (user?.role === "STUDENT") {
      return [
        {
          title: "Discover Projects",
          description:
            "Find opportunities that match your skills and interests",
          href: ROUTES.PROJECTS,
          icon: SparklesIcon,
          gradient: "from-indigo-500 to-purple-600",
          hoverGradient: "hover:from-indigo-600 hover:to-purple-700",
        },
        {
          title: "Track Applications",
          description: "See where you stand and what's next",
          href: ROUTES.APPLICATIONS,
          icon: TargetIcon,
          gradient: "from-blue-500 to-cyan-600",
          hoverGradient: "hover:from-blue-600 hover:to-cyan-700",
        },
      ];
    }

    if (user?.role === "MENTOR" || user?.role === "EMPLOYER") {
      return [
        {
          title: "Create Project",
          description: "Post a new opportunity for talented students",
          href: ROUTES.CREATE_PROJECT,
          icon: RocketIcon,
          gradient: "from-violet-500 to-indigo-600",
          hoverGradient: "hover:from-violet-600 hover:to-indigo-700",
        },
        {
          title: "Manage Projects",
          description: "Review applications and connect with candidates",
          href: ROUTES.PROJECTS,
          icon: BriefcaseIcon,
          gradient: "from-blue-500 to-indigo-600",
          hoverGradient: "hover:from-blue-600 hover:to-indigo-700",
        },
      ];
    }

    return [];
  };

  const quickActions = getQuickActions();

  // Role-specific greeting
  const getGreeting = () => {
    if (user?.role === "STUDENT") {
      return "Ready to learn something new?";
    }
    if (user?.role === "MENTOR") {
      return "Ready to inspire the next generation?";
    }
    if (user?.role === "EMPLOYER") {
      return "Ready to discover exceptional talent?";
    }
    return "Welcome back!";
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Welcome Section (Personalized) */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            Welcome back,{" "}
            <span className="gradient-text">{user?.fullName}</span>!
          </h1>
          <p className="text-lg text-muted-foreground">{getGreeting()}</p>
        </div>

        {/* Stats Cards (Visual Hierarchy) */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Active Projects */}
          <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md group">
            <div className="absolute inset-0 bg-linear-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Projects
              </CardTitle>
              <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                <BriefcaseIcon className="size-4" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-foreground">12</div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUpIcon className="size-3 text-green-600" />
                <p className="text-xs text-green-600 font-medium">
                  +2 from last month
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Applications/Applicants */}
          <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md group">
            <div className="absolute inset-0 bg-linear-to-br from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {user?.role === "STUDENT" ? "Applications" : "Applicants"}
              </CardTitle>
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <FileTextIcon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-foreground">8</div>
              <p className="text-xs text-muted-foreground mt-1">
                3 pending review
              </p>
            </CardContent>
          </Card>

          {/* Success Rate */}
          <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md group">
            <div className="absolute inset-0 bg-linear-to-br from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Success Rate
              </CardTitle>
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <TrendingUpIcon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-foreground">75%</div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUpIcon className="size-3 text-green-600" />
                <p className="text-xs text-green-600 font-medium">
                  +5% from last month
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Profile Views */}
          <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md group">
            <div className="absolute inset-0 bg-linear-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Profile Views
              </CardTitle>
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                <SparklesIcon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-foreground">143</div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUpIcon className="size-3 text-green-600" />
                <p className="text-xs text-green-600 font-medium">
                  +12 this week
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions (High Visual Impact) */}
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-6 tracking-tight">
            Quick Actions
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.href} to={action.href} className="group">
                  <Card className="h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer border-2 hover:border-primary/20">
                    <CardHeader className="space-y-4">
                      {/* Icon with Gradient Background */}
                      <div
                        className={`inline-flex size-14 items-center justify-center rounded-xl bg-linear-to-br ${action.gradient} ${action.hoverGradient} transition-all duration-300 shadow-lg group-hover:shadow-xl group-hover:scale-110`}
                      >
                        <Icon className="size-7 text-white" />
                      </div>

                      {/* Title + Description */}
                      <div className="space-y-2">
                        <CardTitle className="text-xl group-hover:text-primary transition-colors">
                          {action.title}
                        </CardTitle>
                        <CardDescription className="text-sm leading-relaxed">
                          {action.description}
                        </CardDescription>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity Placeholder */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-xl">Recent Activity</CardTitle>
            <CardDescription>
              Your latest interactions and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="p-4 rounded-full bg-muted">
                <FileTextIcon className="size-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Activity feed coming soon. We'll show your recent applications,
                project updates, and important notifications here.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
