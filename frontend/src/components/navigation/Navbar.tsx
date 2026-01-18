import { ROUTES } from "@/constants";
import { useAuth } from "@/context/AuthContext";
import {
  BriefcaseIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  PlusCircleIcon,
  UserIcon,
  TargetIcon,
  BellIcon,
  ChevronDownIcon,
  MenuIcon,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { Button } from "../ui/button";
import { ThemeToggle } from "../theme/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Sheet, SheetContent } from "../ui/sheet";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActiveLink = (href: string) => {
    if (href === ROUTES.DASHBOARD) return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate(ROUTES.HOME);
    } catch (error) {
      // Error handled
    }
  };

  // Workspace intelligence
  const workspace = useMemo(() => {
    if (!user) return null;

    const isCreator = user.role === "MENTOR" || user.role === "EMPLOYER";
    const isStudent = user.role === "STUDENT";

    // TODO: Replace with real data hooks when notifications system is built
    const unreadNotifications = 0;

    // TODO: Replace with real application data when status tracking is implemented
    const urgentApplications = isStudent ? 0 : 0;

    return {
      isCreator,
      isStudent,
      unreadNotifications,
      urgentApplications,
      primaryAction: isCreator
        ? {
            label: "New Project",
            icon: PlusCircleIcon,
            route: ROUTES.CREATE_PROJECT,
          }
        : {
            label: "Discover",
            icon: TargetIcon,
            route: ROUTES.PROJECTS,
          },
    };
  }, [user]);

  // Navigation structure
  const navigation = useMemo(() => {
    if (!user || !workspace) return [];

    const base: Array<{
      label: string;
      icon: typeof LayoutDashboardIcon;
      route: string;
    }> = [
      {
        label: "Hub",
        icon: LayoutDashboardIcon,
        route: ROUTES.DASHBOARD,
      },
      {
        label: "Projects",
        icon: BriefcaseIcon,
        route: ROUTES.PROJECTS,
      },
    ];

    if (workspace.isStudent) {
      base.push({
        label: "Applications",
        icon: FileTextIcon,
        route: ROUTES.APPLICATIONS,
        // TODO: Add urgent badge when application status tracking is implemented
        // badge: workspace.urgentApplications > 0 ? workspace.urgentApplications : null
      });
    }

    return base;
  }, [user, workspace]);

  if (!isAuthenticated || !user || !workspace) {
    // GUEST NAVBAR
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="h-full max-w-480 mx-auto px-4 sm:px-6 flex items-center justify-between">
          <Link to={ROUTES.HOME} className="flex items-center gap-2.5 group">
            <div className="size-8 rounded-lg bg-linear-to-br from-primary via-primary to-primary/70 flex items-center justify-center shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:scale-105">
              <span className="text-sm font-bold text-primary-foreground">
                C
              </span>
            </div>
            <span className="text-sm font-bold text-foreground transition-colors duration-200 group-hover:text-primary">
              Codionix
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(ROUTES.LOGIN)}
            >
              Login
            </Button>
            <Button
              size="sm"
              onClick={() => navigate(ROUTES.REGISTER)}
              className="shadow-sm hover:shadow transition-shadow"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <>
      {/* NAVIGATION STRIP */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="h-full max-w-480 mx-auto flex items-stretch justify-between">
          {/* IDENTITY */}
          <Link
            to={ROUTES.DASHBOARD}
            className="flex items-center gap-2.5 px-5 border-r border-border group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-linear-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <div className="relative size-7 rounded-lg bg-linear-to-br from-primary via-primary to-primary/70 flex items-center justify-center shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:scale-110">
              <span className="text-xs font-bold text-primary-foreground">
                C
              </span>
            </div>
            <span className="relative text-sm font-bold text-foreground transition-colors duration-200 group-hover:text-primary">
              Codionix
            </span>
          </Link>

          {/* WORKSPACE ZONE */}
          <div className="hidden lg:flex items-center gap-2 px-4 flex-1 min-w-0">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActiveLink(item.route);
              return (
                <Link
                  key={item.route}
                  to={item.route}
                  className={cn(
                    "relative flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-medium transition-all duration-300 group",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                  <span
                    className={`absolute bottom-0 left-1/2 h-0.5 w-[70%] rounded-full -translate-x-1/2 origin-center transition-transform duration-300 scale-x-0 group-hover:scale-x-100 ${
                      active ? "scale-x-100 bg-primary" : "bg-muted-foreground"
                    }`}
                  />
                </Link>
              );
            })}
          </div>

          {/* ACTION ZONE */}
          <div className="flex items-stretch shrink-0 border-l border-border">
            {/* Primary CTA (Desktop Only) */}
            <div className="hidden sm:flex items-center px-3">
              <Button
                onClick={() => navigate(workspace.primaryAction.route)}
                size="sm"
                className="h-9 gap-2 text-xs font-semibold shadow-sm transition-all duration-200 hover:shadow-md"
              >
                <workspace.primaryAction.icon className="size-4" />
                <span className="hidden lg:inline">
                  {workspace.primaryAction.label}
                </span>
              </Button>
            </div>

            {/* DESKTOP: System Controls + User Menu */}
            <div className="hidden lg:flex items-center gap-2 px-3 border-l border-border">
              {/* Notifications - TODO: implement notification system */}
              <button
                disabled
                className="relative h-9 w-9 rounded-lg transition-all duration-200 flex items-center justify-center group disabled:opacity-40 disabled:cursor-not-allowed"
                title="Notifications (coming soon)"
              >
                <BellIcon className="size-4 text-muted-foreground" />
                {/* TODO: Add unread indicator when notification system is built */}
                {/* {workspace.unreadNotifications > 0 && (
                  <span className="absolute top-1 right-1 size-2 rounded-full bg-destructive animate-pulse" />
                )} */}
              </button>

              <ThemeToggle />

              {/* User Menu (Desktop Only) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 h-9 px-2 rounded-lg transition-all duration-200 hover:bg-accent group">
                    <div className="size-7 rounded-lg bg-linear-to-br from-primary via-primary to-primary/70 flex items-center justify-center text-xs font-bold text-primary-foreground transition-transform duration-200 group-hover:scale-110 shadow-sm">
                      {user.fullName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-foreground truncate max-w-24 hidden xl:block">
                      {user.fullName.split(" ")[0]}
                    </span>
                    <ChevronDownIcon className="size-3 text-muted-foreground transition-transform duration-200 group-hover:rotate-180" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center gap-3 p-3">
                    <div className="size-10 rounded-xl bg-linear-to-br from-primary via-primary to-primary/70 flex items-center justify-center text-base font-bold text-primary-foreground shadow-md shrink-0">
                      {user.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {user.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to={ROUTES.PROFILE} className="flex items-center">
                      <UserIcon className="size-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={handleLogout}
                    variant="destructive"
                    className="cursor-pointer"
                  >
                    <LogOutIcon className="size-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* MOBILE: Minimal Controls */}
            <div className="lg:hidden flex items-center gap-1 px-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileOpen(true)}
                className="h-9 w-9 p-0"
              >
                <MenuIcon className="size-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* MOBILE DRAWER */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-80 flex flex-col pt-6 pb-2">
          {/* User Identity */}
          <div className="px-6 py-4 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-linear-to-br from-primary via-primary to-primary/70 flex items-center justify-center text-base font-bold text-primary-foreground shadow-lg">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {user.fullName}
                </p>
                <Badge variant="outline" className="mt-1 text-[10px] uppercase">
                  {user.role}
                </Badge>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActiveLink(item.route);
                return (
                  <Link
                    key={item.route}
                    to={item.route}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    <Icon className="size-5" />
                    <span className="flex-1">{item.label}</span>
                    {active && (
                      <div className="size-1.5 rounded-full bg-primary" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Primary Action */}
            <div className="mt-6">
              <Button
                onClick={() => {
                  navigate(workspace.primaryAction.route);
                  setMobileOpen(false);
                }}
                className="w-full gap-2 h-11 shadow-sm cursor-pointer"
              >
                <workspace.primaryAction.icon className="size-4" />
                {workspace.primaryAction.label}
              </Button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-border space-y-2 shrink-0">
            <Link
              to={ROUTES.PROFILE}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            >
              <UserIcon className="size-4" />
              Profile
            </Link>

            <Button
              onClick={() => {
                handleLogout();
                setMobileOpen(false);
              }}
              variant="destructive"
              className="w-full gap-2 cursor-pointer"
            >
              <LogOutIcon className="size-4" />
              Logout
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
