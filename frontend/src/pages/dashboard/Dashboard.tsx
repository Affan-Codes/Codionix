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
  PlusCircleIcon,
  TrendingUpIcon,
} from "lucide-react";
import { Link } from "react-router";

export default function Dashboard() {
  const { user } = useAuth();

  // Role-specific quick actions
  const getQuickActions = () => {
    if (user?.role === "STUDENT") {
      return [
        {
          title: "Browse Projects",
          description: "Find exciting projects and internships",
          href: ROUTES.PROJECTS,
          icon: BriefcaseIcon,
          color: "bg-blue-500",
        },
        {
          title: "My Applications",
          description: "Track your application status",
          href: ROUTES.APPLICATIONS,
          icon: FileTextIcon,
          color: "bg-green-500",
        },
      ];
    }

    if (user?.role === "MENTOR" || user?.role === "EMPLOYER") {
      return [
        {
          title: "Create Project",
          description: "Post a new project or internship",
          href: ROUTES.CREATE_PROJECT,
          icon: PlusCircleIcon,
          color: "bg-purple-500",
        },
        {
          title: "My Projects",
          description: "Manage your posted projects",
          href: ROUTES.PROJECTS, // Will filter by creator
          icon: BriefcaseIcon,
          color: "bg-blue-500",
        },
      ];
    }

    return [];
  };

  const quickActions = getQuickActions();

  return (
    <Layout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.fullName}!
          </h1>
          <p className="mt-2 text-gray-600">
            {user?.role === "STUDENT" && "Explore projects and start learning"}
            {user?.role === "MENTOR" && "Help students grow through projects"}
            {user?.role === "EMPLOYER" &&
              "Find talented students for your team"}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Active Projects
              </CardTitle>
              <BriefcaseIcon className="size-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground mt-1">
                +2 from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {user?.role === "STUDENT" ? "Applications" : "Applicants"}
              </CardTitle>
              <FileTextIcon className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground mt-1">
                3 pending review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Success Rate
              </CardTitle>
              <TrendingUpIcon className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">75%</div>
              <p className="text-xs text-muted-foreground mt-1">
                +5% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Profile Views
              </CardTitle>
              <BriefcaseIcon className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">143</div>
              <p className="text-xs text-muted-foreground mt-1">
                +12 this week
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.href} to={action.href}>
                  <Card className="hover:shadow-lg transition-shadow h-full cursor-pointer">
                    <CardHeader>
                      <div
                        className={`inline-flex size-12 items-center justify-center rounded-lg ${action.color} mb-3`}
                      >
                        <Icon className="size-6 text-white" />
                      </div>
                      <CardTitle>{action.title}</CardTitle>
                      <CardDescription>{action.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity - Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Activity feed coming soon in Phase 3
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
