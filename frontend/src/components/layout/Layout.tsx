import { Navbar } from "../navigation/Navbar";
import { useLocation } from "react-router";
import { useMemo, type ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
  /**
   * Maximum width constraint
   * @default "7xl"
   */
  maxWidth?: "full" | "7xl" | "6xl" | "5xl" | "4xl";
  /**
   * Show navbar
   * @default true
   */
  showNavbar?: boolean;
  /**
   * Layout mode - determines structure
   * @default auto-detected from route
   */
  mode?: "workspace" | "page" | "sidebar";
  /**
   * Vertical padding (only applies to 'page' mode)
   * @default "standard"
   */
  padding?: "none" | "compact" | "standard" | "spacious";
  /**
   * Sidebar content (only applies to 'sidebar' mode)
   */
  sidebar?: ReactNode;
}

const maxWidthClasses = {
  full: "max-w-full",
  "7xl": "max-w-7xl",
  "6xl": "max-w-6xl",
  "5xl": "max-w-5xl",
  "4xl": "max-w-4xl",
};

const paddingClasses = {
  none: "p-0",
  compact: "px-4 py-4 sm:px-6",
  standard: "px-4 py-8 sm:px-6 lg:px-8",
  spacious: "px-4 py-12 sm:px-6 lg:px-8",
};

/**
 * Layout - Environment Composer
 *
 * Three modes:
 *
 * 1. WORKSPACE MODE (full-height, no padding)
 *    - Dashboard, Projects, Applications, Profile
 *    - Child controls all spacing
 *    - Full vertical space
 *
 * 2. PAGE MODE (standard document flow)
 *    - Marketing, Help, Public pages
 *    - Vertical padding applied
 *    - Centered max-width
 *
 * 3. SIDEBAR MODE (persistent nav + content)
 *    - Settings, Admin, Documentation (future)
 *    - Sidebar + main split
 *
 * Mode auto-detected from route unless explicitly set.
 */
export function Layout({
  children,
  maxWidth = "7xl",
  showNavbar = true,
  mode,
  padding = "standard",
  sidebar,
}: LayoutProps) {
  const location = useLocation();

  // Route-based mode detection
  const effectiveMode = useMemo(() => {
    if (mode) return mode;

    const path = location.pathname;

    // Workspace routes (full-height environments)
    const workspaceRoutes = [
      "/dashboard",
      "/projects",
      "/applications",
      "/profile",
    ];

    // TODO: Add sidebar routes when Settings/Admin/Docs are implemented
    // const sidebarRoutes = ["/settings", "/admin", "/docs"];

    if (workspaceRoutes.some((r) => path === r || path.startsWith(`${r}/`))) {
      return "workspace";
    }

    return "page";
  }, [location.pathname, mode]);

  // Auto-adjust padding for workspace mode
  const effectivePadding = effectiveMode === "workspace" ? "none" : padding;

  // WORKSPACE MODE - Full-height environment
  if (effectiveMode === "workspace") {
    return (
      <div className="min-h-screen bg-background">
        {showNavbar && <Navbar />}
        <main
          className={showNavbar ? "pt-14 h-[calc(100vh-3.5rem)]" : "h-screen"}
        >
          {children}
        </main>
      </div>
    );
  }

  // SIDEBAR MODE - Persistent navigation
  if (effectiveMode === "sidebar") {
    return (
      <div className="min-h-screen bg-background">
        {showNavbar && <Navbar />}
        <div
          className={`flex ${
            showNavbar ? "pt-14 h-[calc(100vh-3.5rem)]" : "h-screen"
          }`}
        >
          {sidebar && (
            <aside className="w-64 border-r border-border bg-muted/10 overflow-y-auto">
              {sidebar}
            </aside>
          )}
          <main className="flex-1 overflow-y-auto">
            <div
              className={`mx-auto ${maxWidthClasses[maxWidth]} ${paddingClasses[effectivePadding]}`}
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // PAGE MODE - Standard document flow
  return (
    <div className="min-h-screen bg-background">
      {showNavbar && <Navbar />}
      <main
        className={`${showNavbar ? "pt-14" : ""} mx-auto ${
          maxWidthClasses[maxWidth]
        } ${paddingClasses[effectivePadding]}`}
      >
        {children}
      </main>
    </div>
  );
}
