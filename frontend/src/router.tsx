import { createBrowserRouter, Navigate } from "react-router";
import { useAuth } from "./context/AuthContext";
import { ROUTES } from "./constants";
import { RoleGuard } from "./components/guards/RoleGuard";

// Lazy load pages for better performance
import { lazy, Suspense } from "react";

const Home = lazy(() => import("@/pages/Home"));
const Login = lazy(() => import("@/pages/auth/Login"));
const Register = lazy(() => import("@/pages/auth/Register"));
const VerifyEmail = lazy(() => import("@/pages/auth/VerifyEmail"));
const VerificationPending = lazy(
  () => import("@/pages/auth/VerificationPending")
);
const Dashboard = lazy(() => import("@/pages/dashboard/Dashboard"));
const ProjectsPage = lazy(() => import("@/pages/projects/ProjectsPage"));
const CreateProjectPage = lazy(
  () => import("@/pages/projects/CreateProjectPage")
);
const EditProjectPage = lazy(() => import("@/pages/projects/EditProjectPage"));
const ProjectDetailPage = lazy(
  () => import("@/pages/projects/ProjectDetailPage")
);
const MyApplications = lazy(
  () => import("@/pages/applications/MyApplications")
);
const ProjectApplicantsPage = lazy(
  () => import("@/pages/projects/ProjectApplicantsPage")
);
const ProfilePage = lazy(() => import("@/pages/profile/ProfilePage"));
const Unauthorized = lazy(() => import("@/pages/Unauthorized"));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-lg">Loading...</div>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Redirect to verification pending if email not verified
  if (user && !user.isEmailVerified) {
    return <Navigate to={ROUTES.VERIFICATION_PENDING} replace />;
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
  // Public routes
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
    path: ROUTES.VERIFY_EMAIL,
    element: (
      <Suspense fallback={<PageLoader />}>
        <VerifyEmail />
      </Suspense>
    ),
  },
  {
    path: ROUTES.VERIFICATION_PENDING,
    element: (
      <Suspense fallback={<PageLoader />}>
        <VerificationPending />
      </Suspense>
    ),
  },

  // Protected routes
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
    path: ROUTES.PROFILE,
    element: (
      <ProtectedRoute>
        <Suspense fallback={<PageLoader />}>
          <ProfilePage />
        </Suspense>
      </ProtectedRoute>
    ),
  },

  // Public project browsing
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

  // Student-only routes
  {
    path: ROUTES.APPLICATIONS,
    element: (
      <ProtectedRoute>
        <RoleGuard allowedRoles={["STUDENT"]}>
          <Suspense fallback={<PageLoader />}>
            <MyApplications />
          </Suspense>
        </RoleGuard>
      </ProtectedRoute>
    ),
  },

  // Mentor/Employer routes (create projects)
  {
    path: ROUTES.CREATE_PROJECT,
    element: (
      <ProtectedRoute>
        <RoleGuard allowedRoles={["MENTOR", "EMPLOYER"]}>
          <Suspense fallback={<PageLoader />}>
            <CreateProjectPage />
          </Suspense>
        </RoleGuard>
      </ProtectedRoute>
    ),
  },
  {
    path: "/projects/:id/edit",
    element: (
      <ProtectedRoute>
        <RoleGuard allowedRoles={["MENTOR", "EMPLOYER"]}>
          <Suspense fallback={<PageLoader />}>
            <EditProjectPage />
          </Suspense>
        </RoleGuard>
      </ProtectedRoute>
    ),
  },
  {
    path: "/projects/:id/applicants",
    element: (
      <ProtectedRoute>
        <RoleGuard allowedRoles={["MENTOR", "EMPLOYER"]}>
          <Suspense fallback={<PageLoader />}>
            <ProjectApplicantsPage />
          </Suspense>
        </RoleGuard>
      </ProtectedRoute>
    ),
  },

  // Error pages
  {
    path: ROUTES.UNAUTHORIZED,
    element: (
      <Suspense fallback={<PageLoader />}>
        <Unauthorized />
      </Suspense>
    ),
  },

  // Catch-all 404
  {
    path: "*",
    element: <Navigate to={ROUTES.HOME} replace />,
  },
]);
