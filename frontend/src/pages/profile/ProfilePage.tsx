import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/context/AuthContext";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { SkillsWorkshop } from "@/components/profile/SkillsWorkshop";
import { ProfileMetrics } from "@/components/profile/ProfileMetrics";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp, Target } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<"editor" | "skills">(
    "editor"
  );

  // Calculate real-time profile analytics
  const analytics = useMemo(() => {
    if (!user) return null;

    const completionMetrics = {
      bio: user.bio ? 20 : 0,
      phone: user.phone ? 10 : 0,
      linkedin: user.linkedinUrl ? 15 : 0,
      github: user.githubUrl ? 15 : 0,
      skills:
        user.skills && user.skills.length >= 5
          ? 25
          : user.skills && user.skills.length > 0
          ? 10
          : 0,
      verification: user.isEmailVerified ? 15 : 0,
    };

    const score = Object.values(completionMetrics).reduce((a, b) => a + b, 0);
    const skillCount = user.skills?.length || 0;

    // Competitive positioning
    const matchRate = Math.min(95, Math.round(score * 0.85 + skillCount * 2));
    const visibility = score >= 70 ? "High" : score >= 50 ? "Medium" : "Low";

    // Intelligence: what's blocking next tier
    const nextMilestone =
      score >= 85
        ? null
        : score >= 60
        ? { target: 85, gap: 85 - score, tier: "Expert" }
        : score >= 40
        ? { target: 60, gap: 60 - score, tier: "Strong" }
        : { target: 40, gap: 40 - score, tier: "Competitive" };

    return {
      score,
      matchRate,
      visibility,
      skillCount,
      nextMilestone,
      metrics: completionMetrics,
    };
  }, [user]);

  if (!user) return null;

  return (
    <Layout maxWidth="full">
      <div className="h-[calc(100vh-4rem)] flex overflow-hidden">
        {/* LEFT COMMAND RAIL: Identity + Intelligence */}
        <aside className="hidden lg:flex flex-col w-80 border-r border-border bg-muted/10">
          {/* Identity Block */}
          <div className="p-6 border-b border-border shrink-0">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <div className="flex items-center justify-center size-16 rounded-2xl bg-linear-to-br from-primary to-primary/70 text-primary-foreground font-bold text-2xl shadow-lg">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                {user.isEmailVerified && (
                  <div className="absolute -bottom-1 -right-1 size-6 rounded-full bg-primary border-2 border-background flex items-center justify-center">
                    <Zap className="size-3 text-primary-foreground fill-current" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-foreground truncate">
                  {user.fullName}
                </h2>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  {user.role}
                </p>
              </div>
            </div>

            {/* Real-time Competitive Signal */}
            {analytics && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-background border border-border">
                  <span className="text-xs text-muted-foreground">
                    Match Rate
                  </span>
                  <span
                    className={`text-sm font-bold tabular-nums ${
                      analytics.matchRate >= 70
                        ? "text-primary"
                        : analytics.matchRate >= 50
                        ? "text-achievement"
                        : "text-muted-foreground"
                    }`}
                  >
                    {analytics.matchRate}%
                  </span>
                </div>

                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-background border border-border">
                  <span className="text-xs text-muted-foreground">
                    Visibility
                  </span>
                  <Badge
                    variant={
                      analytics.visibility === "High"
                        ? "default"
                        : analytics.visibility === "Medium"
                        ? "secondary"
                        : "outline"
                    }
                    className="h-5 text-[10px]"
                  >
                    {analytics.visibility}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Strategic Intelligence Panel */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <ProfileMetrics user={user} analytics={analytics} />
          </div>

          {/* Section Navigation */}
          <div className="p-4 border-t border-border space-y-2 shrink-0">
            <button
              onClick={() => setActiveSection("editor")}
              className={`w-full px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                activeSection === "editor"
                  ? "bg-primary/10 text-primary border-l-2 border-l-primary"
                  : "hover:bg-muted/50 text-foreground border-l-2 border-l-transparent"
              }`}
            >
              <div className="text-sm font-semibold">Profile Editor</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Contact & professional info
              </div>
            </button>

            <button
              onClick={() => setActiveSection("skills")}
              className={`w-full px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                activeSection === "skills"
                  ? "bg-primary/10 text-primary border-l-2 border-l-primary"
                  : "hover:bg-muted/50 text-foreground border-l-2 border-l-transparent"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-semibold">Skills Workshop</div>
                {analytics && analytics.skillCount < 5 && (
                  <Target className="size-3.5 text-achievement" />
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {analytics?.skillCount || 0} skills •{" "}
                {analytics && analytics.skillCount >= 10
                  ? "Expert"
                  : analytics && analytics.skillCount >= 5
                  ? "Strong"
                  : "Building"}
              </div>
            </button>
          </div>
        </aside>

        {/* MOBILE: Section Tabs */}
        <div className="lg:hidden fixed top-16 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex">
            <button
              onClick={() => setActiveSection("editor")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                activeSection === "editor"
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              Profile
              {activeSection === "editor" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveSection("skills")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                activeSection === "skills"
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>Skills</span>
                <span className="text-xs opacity-60">
                  ({analytics?.skillCount || 0})
                </span>
                {analytics && analytics.skillCount < 5 && (
                  <TrendingUp className="size-3" />
                )}
              </div>
              {activeSection === "skills" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>
        </div>

        {/* MAIN WORKSPACE: Active Section */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="lg:hidden h-12" />

          {activeSection === "editor" && <ProfileEditor user={user} />}
          {activeSection === "skills" && <SkillsWorkshop user={user} />}
        </main>

        {/* RIGHT RAIL: Strategic Context (Desktop Only) */}
        <aside className="hidden xl:block w-96 border-l border-border bg-muted/5 overflow-y-auto scrollbar-hide">
          <div className="p-6 space-y-6">
            {/* Next Milestone Intelligence */}
            {analytics?.nextMilestone && (
              <div className="p-5 rounded-xl border-2 border-primary/20 bg-primary/5 space-y-4">
                <div className="flex items-center gap-2">
                  <Target className="size-5 text-primary" />
                  <div className="text-xs text-primary uppercase tracking-wider font-semibold">
                    Next Tier: {analytics.nextMilestone.tier}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-foreground">Progress</span>
                    <span className="text-2xl font-bold text-primary tabular-nums">
                      {analytics.score}
                      <span className="text-sm text-muted-foreground">
                        /{analytics.nextMilestone.target}
                      </span>
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{
                        width: `${
                          (analytics.score / analytics.nextMilestone.target) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.nextMilestone.gap} points away
                  </p>
                </div>
              </div>
            )}

            {analytics && analytics?.score >= 85 && (
              <div className="p-5 rounded-xl border-2 border-primary/20 bg-primary/5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="size-5 text-primary fill-current" />
                  <div className="text-xs text-primary uppercase tracking-wider font-semibold">
                    Expert Level
                  </div>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  Your profile is in the top tier. You're highly competitive for
                  premium opportunities.
                </p>
              </div>
            )}

            {/* Actionable Intelligence */}
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Optimization Tips
              </div>

              <div className="space-y-2">
                {!user.bio && (
                  <div className="p-4 rounded-lg bg-background border border-border hover:border-primary/20 transition-colors cursor-pointer group">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        Add professional bio
                      </div>
                      <span className="text-sm font-bold text-primary tabular-nums shrink-0">
                        +20
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Profiles with bios get 40% more views
                    </p>
                  </div>
                )}

                {analytics && analytics.skillCount < 5 && (
                  <div className="p-4 rounded-lg bg-background border border-border hover:border-primary/20 transition-colors cursor-pointer group">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        Add {5 - analytics.skillCount} more skills
                      </div>
                      <span className="text-sm font-bold text-primary tabular-nums shrink-0">
                        +{5 - analytics.skillCount < 3 ? 15 : 10}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Reach Intermediate tier for better matching
                    </p>
                  </div>
                )}

                {!user.linkedinUrl && (
                  <div className="p-4 rounded-lg bg-background border border-border hover:border-primary/20 transition-colors cursor-pointer group">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        Link LinkedIn profile
                      </div>
                      <span className="text-sm font-bold text-primary tabular-nums shrink-0">
                        +15
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Professional credibility signal
                    </p>
                  </div>
                )}

                {!user.githubUrl && user.role === "STUDENT" && (
                  <div className="p-4 rounded-lg bg-background border border-border hover:border-primary/20 transition-colors cursor-pointer group">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        Link GitHub profile
                      </div>
                      <span className="text-sm font-bold text-primary tabular-nums shrink-0">
                        +15
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Showcase your technical projects
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Account Metadata */}
            <div className="pt-6 border-t border-border space-y-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Account
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-background border border-border">
                  <span className="text-xs text-muted-foreground">
                    Member Since
                  </span>
                  <span className="text-xs font-medium text-foreground tabular-nums">
                    {new Date(user.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-background border border-border">
                  <span className="text-xs text-muted-foreground">
                    Last Updated
                  </span>
                  <span className="text-xs font-medium text-foreground tabular-nums">
                    {new Date(user.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </Layout>
  );
}
