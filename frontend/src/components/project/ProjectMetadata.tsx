import type { Project, User } from "@/types";
import {
  Clock,
  Users,
  Target,
  TrendingUp,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Circle,
} from "lucide-react";

interface ProjectMetadataProps {
  project: Project;
  analysis: ReturnType<
    typeof import("@/hooks/useProjectAnalysis").useProjectAnalysis
  >;
  user: User | null | undefined;
  compact?: boolean;
}

export function ProjectMetadata({
  project,
  analysis,
  user,
  compact = false,
}: ProjectMetadataProps) {
  if (!analysis) return null;

  return (
    <div className="space-y-6">
      {/* Opportunity Score */}
      {user && (
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
            Opportunity Analysis
          </div>
          <div className="space-y-3">
            {/* Overall Score */}
            <div
              className={`${
                compact ? "p-4" : "p-5"
              } rounded-lg border-2 border-border bg-background`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  Match Score
                </span>
                <div className="flex items-center gap-2">
                  {analysis.signal === "strong" && (
                    <Zap className="size-5 text-primary" />
                  )}
                  <span
                    className={`${
                      compact ? "text-2xl" : "text-3xl"
                    } font-bold tabular-nums ${
                      analysis.signal === "strong"
                        ? "text-primary"
                        : analysis.signal === "moderate"
                        ? "text-achievement"
                        : "text-muted-foreground"
                    }`}
                  >
                    {analysis.opportunityScore}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full transition-all duration-500 ${
                    analysis.signal === "strong"
                      ? "bg-primary"
                      : analysis.signal === "moderate"
                      ? "bg-achievement"
                      : "bg-muted-foreground"
                  }`}
                  style={{ width: `${analysis.opportunityScore}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {analysis.signal === "strong"
                  ? "Strong match - high priority"
                  : analysis.signal === "moderate"
                  ? "Moderate match - consider carefully"
                  : "Weak match - proceed with caution"}
              </div>
            </div>

            {/* Success Probability */}
            <div className="p-4 rounded-lg border border-border bg-background">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  Est. Acceptance Rate
                </span>
                <span
                  className={`text-lg font-bold tabular-nums ${
                    analysis.successProbability >= 60
                      ? "text-primary"
                      : analysis.successProbability >= 40
                      ? "text-achievement"
                      : "text-muted-foreground"
                  }`}
                >
                  {analysis.successProbability}%
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Based on skills, competition, timing
              </div>
            </div>

            {/* Timing Advice */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-2">
                <Clock className="size-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-primary font-semibold mb-1">
                    Timing Recommendation
                  </div>
                  <div className="text-xs text-foreground">
                    {analysis.timingAdvice}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Risk Indicators */}
      {analysis.risks.length > 0 && user && (
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
            Risk Assessment
          </div>
          <div className="space-y-2">
            {analysis.risks.map((risk, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border ${
                  risk.level === "critical"
                    ? "bg-destructive/5 border-destructive/20"
                    : risk.level === "high"
                    ? "bg-achievement/5 border-achievement/20"
                    : "bg-muted border-border"
                }`}
              >
                <div className="flex items-start gap-2 mb-2">
                  <AlertTriangle
                    className={`size-4 shrink-0 mt-0.5 ${
                      risk.level === "critical"
                        ? "text-destructive"
                        : risk.level === "high"
                        ? "text-achievement"
                        : "text-muted-foreground"
                    }`}
                  />
                  <span className="text-sm text-foreground font-medium leading-tight">
                    {risk.text}
                  </span>
                </div>
                {risk.action && (
                  <div className="text-xs text-muted-foreground ml-6">
                    → {risk.action}
                  </div>
                )}
                {risk.skills && risk.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 ml-6">
                    {risk.skills.map((skill: string) => (
                      <span
                        key={skill}
                        className="text-xs px-2 py-0.5 rounded bg-background border border-border"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Metrics */}
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
          Key Metrics
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-background border border-border">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Deadline</span>
            </div>
            <span
              className={`text-sm font-semibold tabular-nums ${
                analysis.daysLeft < 3
                  ? "text-destructive"
                  : analysis.daysLeft < 7
                  ? "text-achievement"
                  : "text-foreground"
              }`}
            >
              {analysis.daysLeft}d
            </span>
          </div>
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-background border border-border">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Filled</span>
            </div>
            <span
              className={`text-sm font-semibold tabular-nums ${
                analysis.fillRate > 80
                  ? "text-destructive"
                  : analysis.fillRate > 60
                  ? "text-achievement"
                  : "text-foreground"
              }`}
            >
              {analysis.fillRate}%
            </span>
          </div>
          {user && (
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-background border border-border">
              <div className="flex items-center gap-2">
                <Target className="size-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Match</span>
              </div>
              <span
                className={`text-sm font-semibold tabular-nums ${
                  analysis.matchRate >= 70
                    ? "text-primary"
                    : analysis.matchRate >= 50
                    ? "text-achievement"
                    : "text-muted-foreground"
                }`}
              >
                {analysis.matchRate}%
              </span>
            </div>
          )}
          {project.stipend && (
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-background border border-border">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Stipend</span>
              </div>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                ${project.stipend.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Skills Compatibility */}
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
          Skill Requirements
        </div>
        <div className="space-y-2">
          {project.skills.map((skill) => {
            const hasSkill = user?.skills?.some(
              (s) => s.toLowerCase() === skill.toLowerCase()
            );
            return (
              <div
                key={skill}
                className={`flex items-center justify-between py-2.5 px-3 rounded-lg border ${
                  hasSkill
                    ? "bg-primary/5 border-primary/20"
                    : "bg-background border-border"
                }`}
              >
                <span className="text-sm font-medium text-foreground">
                  {skill}
                </span>
                {user &&
                  (hasSkill ? (
                    <CheckCircle2 className="size-4 text-primary" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground/30" />
                  ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Posted By */}
      <div className="pt-6 border-t border-border">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
          Posted By
        </div>
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-sm font-semibold">
            {project.createdBy.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">
              {project.createdBy.fullName}
            </div>
            <div className="text-xs text-muted-foreground">
              {project.createdBy.role}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
