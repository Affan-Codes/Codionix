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
import { Button } from "../ui/button";
import { ThemeToggle } from "../theme/ThemeToggle";

interface NavLink {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
}

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const visibleLinks = navLinks.filter((link) => {
    if (!link.roles) return true;
    return user && link.roles.includes(user.role);
  });

  const handleLogout = async () => {
    try {
      await logout();
      navigate(ROUTES.HOME);
    } catch (error) {
      // Error handle by mutation
    }
  };

  const isActiveLink = (href: string) => {
    if (href === ROUTES.DASHBOARD) {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <>
      {/* Main Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg supports-backdrop-filter:bg-background/60 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link
              to={isAuthenticated ? ROUTES.DASHBOARD : ROUTES.HOME}
              className="flex items-center gap-3 group"
            >
              <div className="flex items-center justify-center size-10 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-md transition-all duration-300 group-hover:shadow-lg group-hover:scale-105">
                <span className="text-xl font-bold text-white">C</span>
              </div>
              <span className="text-xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
                Codionix
              </span>
            </Link>

            {/* Desktop Navigation */}
            {isAuthenticated && (
              <div className="hidden md:flex md:items-center md:gap-1">
                {visibleLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = isActiveLink(link.href);
                  return (
                    <Link
                      key={link.href}
                      to={link.href}
                      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-primary/10 text-primary shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
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
            <div className="hidden md:flex md:items-center md:gap-3">
              <ThemeToggle />

              {isAuthenticated ? (
                <>
                  {/* User Badge */}
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2 border border-border/50">
                    <div className="flex items-center justify-center size-7 rounded-md bg-linear-to-br from-indigo-500 to-purple-600 text-white text-xs font-semibold">
                      {user?.fullName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-foreground max-w-32 truncate">
                      {user?.fullName}
                    </span>
                  </div>

                  {/* Logout Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all duration-200"
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
                    className="hover:bg-accent hover:border-accent-foreground/20"
                  >
                    Login
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate(ROUTES.REGISTER)}
                    className="shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2 md:hidden">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="hover:bg-accent"
              >
                {mobileMenuOpen ? (
                  <XIcon className="size-6" />
                ) : (
                  <MenuIcon className="size-6" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Slide-in Panel */}
      <div
        className={`fixed top-16 right-0 bottom-0 z-40 w-80 max-w-[85vw] bg-background border-l shadow-2xl transform transition-transform duration-300 ease-out md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full overflow-y-auto">
          <div className="space-y-6 p-6">
            {isAuthenticated ? (
              <>
                {/* User Info Card */}
                <div className="rounded-xl bg-linear-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 p-4 border border-indigo-100 dark:border-indigo-900/30">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-12 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 text-white text-lg font-bold shadow-md">
                      {user?.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {user?.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Navigation Links */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-3">
                    Navigation
                  </p>
                  {visibleLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = isActiveLink(link.href);
                    return (
                      <Link
                        key={link.href}
                        to={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-primary/10 text-primary shadow-sm"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`}
                      >
                        <Icon className="size-5" />
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}
                </div>

                {/* Logout Button */}
                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all duration-200"
                  >
                    <LogOutIcon className="size-4" />
                    <span>Logout</span>
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Guest Actions */}
                <div className="space-y-3">
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
                    className="w-full shadow-sm"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate(ROUTES.REGISTER);
                    }}
                  >
                    Sign Up
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
