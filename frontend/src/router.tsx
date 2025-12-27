import { createBrowserRouter, Navigate } from "react-router";
import { useAuth } from "./context/AuthContext";
import { ROUTES } from "./constants";
import { RoleGuard } from "./components/guards/RoleGuard";
import ErrorBoundary from "./components/ErrorBoundary";
import { LoadingSpinner } from "./components/common/LoadingSpinner";

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

/**
 * Production-grade route wrapper
 *
 * Wraps EVERY lazy-loaded component with:
 * 1. ErrorBoundary - catches chunk load failures
 * 2. Suspense - shows loading state during code splitting
 *
 * CRITICAL: Without this, failed chunk loads white-screen the app
 */
const LazyRoute = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary>
    <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
  </ErrorBoundary>
);

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="Verifying authentication..." />;
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
    return <LoadingSpinner message="Checking session..." />;
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
      <LazyRoute>
        <Home />
      </LazyRoute>
    ),
  },
  {
    path: ROUTES.LOGIN,
    element: (
      <PublicOnlyRoute>
        <LazyRoute>
          <Login />
        </LazyRoute>
      </PublicOnlyRoute>
    ),
  },
  {
    path: ROUTES.REGISTER,
    element: (
      <PublicOnlyRoute>
        <LazyRoute>
          <Register />
        </LazyRoute>
      </PublicOnlyRoute>
    ),
  },
  {
    path: ROUTES.VERIFY_EMAIL,
    element: (
      <LazyRoute>
        <VerifyEmail />
      </LazyRoute>
    ),
  },
  {
    path: ROUTES.VERIFICATION_PENDING,
    element: (
      <LazyRoute>
        <VerificationPending />
      </LazyRoute>
    ),
  },

  // Protected routes
  {
    path: ROUTES.DASHBOARD,
    element: (
      <ProtectedRoute>
        <LazyRoute>
          <Dashboard />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.PROFILE,
    element: (
      <ProtectedRoute>
        <LazyRoute>
          <ProfilePage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },

  // Public project browsing
  {
    path: ROUTES.PROJECTS,
    element: (
      <LazyRoute>
        <ProjectsPage />
      </LazyRoute>
    ),
  },
  {
    path: ROUTES.PROJECT_DETAIL,
    element: (
      <LazyRoute>
        <ProjectDetailPage />
      </LazyRoute>
    ),
  },

  // Student-only routes
  {
    path: ROUTES.APPLICATIONS,
    element: (
      <ProtectedRoute>
        <RoleGuard allowedRoles={["STUDENT"]}>
          <LazyRoute>
            <MyApplications />
          </LazyRoute>
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
          <LazyRoute>
            <CreateProjectPage />
          </LazyRoute>
        </RoleGuard>
      </ProtectedRoute>
    ),
  },
  {
    path: "/projects/:id/edit",
    element: (
      <ProtectedRoute>
        <RoleGuard allowedRoles={["MENTOR", "EMPLOYER"]}>
          <LazyRoute>
            <EditProjectPage />
          </LazyRoute>
        </RoleGuard>
      </ProtectedRoute>
    ),
  },
  {
    path: "/projects/:id/applicants",
    element: (
      <ProtectedRoute>
        <RoleGuard allowedRoles={["MENTOR", "EMPLOYER"]}>
          <LazyRoute>
            <ProjectApplicantsPage />
          </LazyRoute>
        </RoleGuard>
      </ProtectedRoute>
    ),
  },

  // Error pages
  {
    path: ROUTES.UNAUTHORIZED,
    element: (
      <LazyRoute>
        <Unauthorized />
      </LazyRoute>
    ),
  },

  // Catch-all 404
  {
    path: "*",
    element: <Navigate to={ROUTES.HOME} replace />,
  },
]);
