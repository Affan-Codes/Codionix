import { type ReactNode } from "react";
import { Link } from "react-router";
import { ROUTES } from "@/constants";
import { Separator } from "../ui/separator";

interface AuthLayoutProps {
  children: ReactNode;
  /**
   * Layout variant
   * - split: Full-screen brand immersion (Login, Register)
   * - centered: Single column focus (Verify, Reset, etc.)
   */
  variant?: "split" | "centered";
  /**
   * Brand zone content (split layout only)
   */
  brandContent?: {
    hero: string;
    subhero?: string;
    features?: Array<{ icon: ReactNode; text: string }>;
  };
}

export function AuthLayout({
  children,
  variant = "split",
  brandContent,
}: AuthLayoutProps) {
  if (variant === "centered") {
    return (
      <div className="min-h-screen relative overflow-hidden bg-background">
        {/* Animated Background */}
        <div className="fixed inset-0 -z-10">
          {/* Gradient Mesh */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,var(--tw-gradient-stops))] from-achievement/10 via-transparent to-transparent" />

          {/* Animated Grid */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `
                linear-gradient(to right, currentColor 1px, transparent 1px),
                linear-gradient(to bottom, currentColor 1px, transparent 1px)
              `,
              backgroundSize: "80px 80px",
            }}
          />
        </div>

        {/* Centered Content */}
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md">
            {/* Logo */}
            <Link
              to={ROUTES.HOME}
              className="flex items-center justify-center gap-2.5 mb-8 group"
            >
              <div className="size-12 rounded-xl bg-linear-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110">
                <span className="text-lg font-bold text-primary-foreground">
                  C
                </span>
              </div>
              <span className="text-xl font-bold text-foreground transition-colors duration-200 group-hover:text-primary">
                Codionix
              </span>
            </Link>

            {/* Glass Card */}
            <div className="rounded-2xl border border-border/50 bg-background/80 backdrop-blur-xl shadow-2xl p-8">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Split Layout
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background - Full Screen */}
      <div className="fixed inset-0 -z-10 bg-background">
        {/* Gradient Mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,var(--tw-gradient-stops))] from-achievement/10 via-transparent to-transparent" />

        {/* Animated Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] animate-[pulse_8s_ease-in-out_infinite]"
          style={{
            backgroundImage: `
              linear-gradient(to right, currentColor 1px, transparent 1px),
              linear-gradient(to bottom, currentColor 1px, transparent 1px)
            `,
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <div className="flex min-h-screen">
        {/* BRAND IMMERSION ZONE - 55% */}
        <div className="hidden lg:flex lg:w-[55%] relative">
          {/* Glass Effect */}
          <div className="absolute inset-0 bg-linear-to-br from-background/95 to-background/90 backdrop-blur-sm" />

          {/* Content - Fixed Height with Scroll */}
          <div className="relative w-full h-screen overflow-y-auto scrollbar-hide">
            <div className="flex flex-col min-h-screen justify-between p-16">
              {/* Logo */}
              <Link
                to={ROUTES.HOME}
                className="flex items-center gap-3 group w-fit"
              >
                <div className="size-14 rounded-2xl bg-linear-to-br from-primary to-primary/70 flex items-center justify-center shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl">
                  <span className="text-xl font-bold text-primary-foreground">
                    C
                  </span>
                </div>
                <span className="text-2xl font-bold text-foreground transition-colors duration-200 group-hover:text-primary">
                  Codionix
                </span>
              </Link>

              {/* Hero Content */}
              <div className="space-y-8 flex-1 flex flex-col justify-center">
                <div className="space-y-4">
                  <h1 className="text-6xl font-bold leading-tight tracking-tight">
                    <span className="bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      {brandContent?.hero || "Build Something Real"}
                    </span>
                  </h1>
                  {brandContent?.subhero && (
                    <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
                      {brandContent.subhero}
                    </p>
                  )}
                </div>

                {/* Features Grid */}
                {brandContent?.features && (
                  <div className="grid gap-4 max-w-lg">
                    {brandContent.features.map((feature, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-4 p-4 rounded-xl bg-background/40 border border-border/30 backdrop-blur-sm transition-all duration-300 hover:bg-background/60 hover:border-border/50 hover:translate-x-2"
                      >
                        <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          {feature.icon}
                        </div>
                        <p className="text-sm text-foreground/90 leading-relaxed pt-1">
                          {feature.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <p className="text-sm text-muted-foreground pt-8">
                © {new Date().getFullYear()} Codionix. Built for builders.
              </p>
            </div>
          </div>

          <Separator
            orientation="vertical"
            className="absolute right-0 top-0 h-full"
          />
        </div>

        {/* FUNCTION ZONE - 45% */}
        <div className="w-full lg:w-[45%] relative">
          {/* Glass Effect */}
          <div className="absolute inset-0 bg-linear-to-bl from-background/98 to-background/95 backdrop-blur-md" />

          {/* Content - Fixed Height with Scroll */}
          <div className="relative h-screen overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-center min-h-screen p-8 lg:p-16">
              <div className="w-full max-w-md">
                {/* Mobile Logo */}
                <Link
                  to={ROUTES.HOME}
                  className="flex lg:hidden items-center justify-center gap-2.5 mb-8 group"
                >
                  <div className="size-11 rounded-xl bg-linear-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110">
                    <span className="text-base font-bold text-primary-foreground">
                      C
                    </span>
                  </div>
                  <span className="text-lg font-bold text-foreground transition-colors duration-200 group-hover:text-primary">
                    Codionix
                  </span>
                </Link>

                {/* Form Content */}
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
