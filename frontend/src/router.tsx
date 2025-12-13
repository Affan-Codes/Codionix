import { createBrowserRouter, Navigate } from "react-router";
import { useAuth } from "./context/AuthContext";
import { ROUTES } from "./constants";

// Lazy load pages for better performance
import { lazy, Suspense } from "react";

const Home = lazy(() => import("@/pages/Home"));
const Login = lazy(() => import("@/pages/auth/Login"));
const Register = lazy(() => import("@/pages/auth/Register"));
const Dashboard = lazy(() => import("@/pages/dashboard/Dashboard"));
const ProjectsPage = lazy(() => import("@/pages/projects/ProjectsPage"));
const ProjectDetailPage = lazy(
  () => import("@/pages/projects/ProjectDetailPage")
);
const MyApplications = lazy(
  () => import("@/pages/applications/MyApplications")
);
const ProfilePage = lazy(() => import("@/pages/profile/ProfilePage"));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-lg">Loading...</div>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <>{children}</>;
};

// Public Only Route (redirect to dashboard if authenticated)
const PublicOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return <>{children}</>;
};

export const router = createBrowserRouter([
  {
    path: ROUTES.HOME,
    element: (
      <Suspense fallback={<PageLoader />}>
        <Home />
      </Suspense>
    ),
  },
  {
    path: ROUTES.LOGIN,
    element: (
      <PublicOnlyRoute>
        <Suspense fallback={<PageLoader />}>
          <Login />
        </Suspense>
      </PublicOnlyRoute>
    ),
  },
  {
    path: ROUTES.REGISTER,
    element: (
      <PublicOnlyRoute>
        <Suspense fallback={<PageLoader />}>
          <Register />
        </Suspense>
      </PublicOnlyRoute>
    ),
  },
  {
    path: ROUTES.DASHBOARD,
    element: (
      <ProtectedRoute>
        <Suspense fallback={<PageLoader />}>
          <Dashboard />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.PROJECTS,
    element: (
      <Suspense fallback={<PageLoader />}>
        <ProjectsPage />
      </Suspense>
    ),
  },
  {
    path: ROUTES.PROJECT_DETAIL,
    element: (
      <Suspense fallback={<PageLoader />}>
        <ProjectDetailPage />
      </Suspense>
    ),
  },
  {
    path: ROUTES.APPLICATIONS,
    element: (
      <ProtectedRoute>
        <Suspense fallback={<PageLoader />}>
          <MyApplications />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.PROFILE,
    element: (
      <ProtectedRoute>
        <Suspense fallback={<PageLoader />}>
          <ProfilePage />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <Navigate to={ROUTES.HOME} replace />,
  },
]);
