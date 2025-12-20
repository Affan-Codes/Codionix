import { ROUTES } from "@/constants";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/types";
import { Navigate, useLocation } from "react-router";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
}

/**
 * RoleGuard - Protects routes based on user roles
 *
 * Usage:
 * <RoleGuard allowedRoles={["MENTOR", "EMPLOYER"]}>
 *   <CreateProjectPage />
 * </RoleGuard>
 */
export function RoleGuard({
  children,
  allowedRoles,
  redirectTo = "/unauthorized",
}: RoleGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Still loading - show nothing (parent ProtectedRoute handles this)
  if (isLoading) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // Check if user's role is allowed
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
