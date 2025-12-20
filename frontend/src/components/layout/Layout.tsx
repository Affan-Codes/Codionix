import { Navbar } from "../navigation/Navbar";

interface LayoutProps {
  children: React.ReactNode;
  /**
   * Maximum width constraint
   * @default "7xl" (1280px)
   */
  maxWidth?: "full" | "7xl" | "6xl" | "5xl" | "4xl";
  /**
   * Show navbar
   * @default true
   */
  showNavbar?: boolean;
}

const maxWidthClasses = {
  full: "max-w-full",
  "7xl": "max-w-7xl",
  "6xl": "max-w-6xl",
  "5xl": "max-w-5xl",
  "4xl": "max-w-4xl",
};

/**
 * Layout Component
 *
 * Wraps page content with consistent navbar and spacing
 *
 * Usage:
 * <Layout>
 *   <YourPageContent />
 * </Layout>
 *
 * Custom width:
 * <Layout maxWidth="5xl">
 *   <NarrowContent />
 * </Layout>
 *
 * No navbar:
 * <Layout showNavbar={false}>
 *   <AuthPage />
 * </Layout>
 */

export function Layout({
  children,
  maxWidth = "7xl",
  showNavbar = true,
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {showNavbar && <Navbar />}
      <main
        className={`mx-auto ${maxWidthClasses[maxWidth]} px-4 py-8 sm:px-6 lg:px-8`}
      >
        {children}
      </main>
    </div>
  );
}
