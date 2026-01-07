import { ROUTES } from "@/constants";
import { useAuth } from "@/context/AuthContext";
import {
  BriefcaseIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  PlusCircleIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { ThemeToggle } from "../theme/ThemeToggle";

interface NavLink {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[]; // If undefined, visible to all authenticated users
}

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Define navigation links with role restrictions
  const navLinks: NavLink[] = [
    {
      label: "Dashboard",
      href: ROUTES.DASHBOARD,
      icon: LayoutDashboardIcon,
    },
    {
      label: "Projects",
      href: ROUTES.PROJECTS,
      icon: BriefcaseIcon,
    },
    {
      label: "Create Project",
      href: ROUTES.CREATE_PROJECT,
      icon: PlusCircleIcon,
      roles: ["MENTOR", "EMPLOYER"],
    },
    {
      label: "My Applications",
      href: ROUTES.APPLICATIONS,
      icon: FileTextIcon,
      roles: ["STUDENT"],
    },
    {
      label: "Profile",
      href: ROUTES.PROFILE,
      icon: UserIcon,
    },
  ];

  // Filter links based on user role
  const visibleLinks = navLinks.filter((link) => {
    if (!link.roles) return true;
    return user && link.roles.includes(user.role);
  });

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate(ROUTES.HOME);
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  const isActiveLink = (href: string) => {
    if (href === ROUTES.DASHBOARD) {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            to={isAuthenticated ? ROUTES.DASHBOARD : ROUTES.HOME}
            className="flex items-center space-x-2"
          >
            <div className="flex items-center justify-center rounded-lg size-8 bg-blue-600">
              <span className="text-lg font-bold text-white">C</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Codionix</span>
          </Link>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <div className="hidden md:flex md:items-center md:space-x-1">
              <ThemeToggle />
              {visibleLinks.map((link) => {
                const Icon = link.icon;
                const isActive = isActiveLink(link.href);
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="size-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Desktop Actions */}
          <div className="hidden md:flex md:items-center md:space-x-3">
            {isAuthenticated ? (
              <>
                <div className="flex items-center space-x-2 rounded-md bg-gray-100 px-3 py-1.5">
                  <UserIcon className="size-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {user?.fullName}
                  </span>
                </div>
                <Button
                  variant={"outline"}
                  size={"sm"}
                  onClick={handleLogout}
                  className="flex items-center space-x-2"
                >
                  <LogOutIcon className="size-4" />
                  <span>Logout</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(ROUTES.LOGIN)}
                >
                  Login
                </Button>
                <Button size="sm" onClick={() => navigate(ROUTES.REGISTER)}>
                  Sign Up
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <Button
              variant={"ghost"}
              size={"icon"}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              {mobileMenuOpen ? (
                <XIcon className="size-6" />
              ) : (
                <MenuIcon className="size-6 " />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t bg-white md:hidden">
          <div className="space-y-1 px-4 pb-3 pt-2">
            {isAuthenticated ? (
              <>
                {/* User Info */}
                <div className="mb-3 flex items-center space-x-2 rounded-md bg-gray-100 px-3 py-2">
                  <UserIcon className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {user?.fullName}
                    </p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                </div>

                {/* Navigation Links */}
                {visibleLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = isActiveLink(link.href);
                  return (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium ${
                        isActive
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}

                {/* Logout Button */}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOutIcon className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate(ROUTES.LOGIN);
                  }}
                >
                  Login
                </Button>
                <Button
                  className="w-full"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate(ROUTES.REGISTER);
                  }}
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
