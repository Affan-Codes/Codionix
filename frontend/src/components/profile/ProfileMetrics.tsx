import type { User } from "@/types";
import {
  TrendingUpIcon,
  TargetIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  Zap,
} from "lucide-react";

interface ProfileMetricsProps {
  user: User;
  analytics: {
    score: number;
    matchRate: number;
    visibility: string;
    skillCount: number;
    nextMilestone: { target: number; gap: number; tier: string } | null;
    metrics: Record<string, number>;
  } | null;
}

export function ProfileMetrics({ user, analytics }: ProfileMetricsProps) {
  if (!analytics) return null;

  const missingItems = [];
  if (!user.bio)
    missingItems.push({ label: "Bio", points: 20, impact: "40% more views" });
  if (!user.phone)
    missingItems.push({
      label: "Phone",
      points: 10,
      impact: "Contact flexibility",
    });
  if (!user.linkedinUrl)
    missingItems.push({
      label: "LinkedIn",
      points: 15,
      impact: "Professional credibility",
    });
  if (!user.githubUrl && user.role === "STUDENT")
    missingItems.push({
      label: "GitHub",
      points: 15,
      impact: "Technical showcase",
    });
  if (analytics.skillCount < 5)
    missingItems.push({
      label: `${5 - analytics.skillCount} more skills`,
      points: 15,
      impact: "Better matching",
    });

  const strengthColor =
    analytics.score >= 85
      ? "primary"
      : analytics.score >= 60
      ? "achievement"
      : "muted-foreground";

  return (
    <div className="p-6 space-y-6">
      {/* Current Score Analysis */}
      <div className="space-y-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">
          Profile Analysis
        </div>

        <div className="p-5 rounded-xl border-2 border-border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Current Tier</div>
              <div className={`text-2xl font-bold text-${strengthColor}`}>
                {analytics.score >= 85
                  ? "Expert"
                  : analytics.score >= 60
                  ? "Strong"
                  : analytics.score >= 40
                  ? "Fair"
                  : "Basic"}
              </div>
            </div>
            <div
              className={`text-4xl font-bold tabular-nums text-${strengthColor}`}
            >
              {analytics.score}
            </div>
          </div>

          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 bg-${strengthColor}`}
              style={{ width: `${analytics.score}%` }}
            />
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {analytics.score >= 85
              ? "Maximum competitive advantage — top tier for matching"
              : analytics.score >= 60
              ? "Strong position — good matching potential"
              : analytics.score >= 40
              ? "Building credibility — keep improving"
              : "Needs attention — fill critical gaps"}
          </p>
        </div>
      </div>

      {/* Component Breakdown */}
      <div className="space-y-3">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">
          Component Scores
        </div>

        <div className="space-y-1.5">
          <MetricRow
            label="Bio"
            current={analytics.metrics.bio}
            max={20}
            completed={!!user.bio}
          />
          <MetricRow
            label="Contact"
            current={analytics.metrics.phone}
            max={10}
            completed={!!user.phone}
          />
          <MetricRow
            label="LinkedIn"
            current={analytics.metrics.linkedin}
            max={15}
            completed={!!user.linkedinUrl}
          />
          <MetricRow
            label="GitHub"
            current={analytics.metrics.github}
            max={15}
            completed={!!user.githubUrl}
          />
          <MetricRow
            label="Skills"
            current={analytics.metrics.skills}
            max={25}
            completed={analytics.skillCount >= 5}
            detail={`${analytics.skillCount} added`}
          />
          <MetricRow
            label="Verified"
            current={analytics.metrics.verification}
            max={15}
            completed={user.isEmailVerified}
          />
        </div>
      </div>

      {/* Next Actions (Strategic Priority) */}
      {missingItems.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            Priority Actions
          </div>

          <div className="space-y-2">
            {missingItems.slice(0, 3).map((item, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-3 py-3 px-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors border border-primary/20 group cursor-pointer"
              >
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <TargetIcon className="size-4 text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-sm text-foreground font-medium">
                      Add {item.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.impact}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-lg font-bold text-primary tabular-nums">
                    +{item.points}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    points
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competitive Impact (Student-specific) */}
      {user.role === "STUDENT" && (
        <div className="space-y-3 pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            Competitive Edge
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-background border border-border">
              <div className="flex items-center gap-2">
                <TrendingUpIcon
                  className={`size-4 ${
                    analytics.matchRate >= 70
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                />
                <span className="text-sm text-foreground">Match Rate</span>
              </div>
              <span
                className={`text-xl font-bold tabular-nums ${
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

            <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-background border border-border">
              <div className="flex items-center gap-2">
                <Zap
                  className={`size-4 ${
                    analytics.visibility === "High"
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                />
                <span className="text-sm text-foreground">Visibility</span>
              </div>
              <span
                className={`text-sm font-bold uppercase tracking-wider ${
                  analytics.visibility === "High"
                    ? "text-primary"
                    : analytics.visibility === "Medium"
                    ? "text-achievement"
                    : "text-muted-foreground"
                }`}
              >
                {analytics.visibility}
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed pt-2">
            {analytics.visibility === "High"
              ? "Your profile appears in top search results"
              : analytics.visibility === "Medium"
              ? "Improving — add more details for top placement"
              : "Limited visibility — strengthen profile to improve ranking"}
          </p>
        </div>
      )}
    </div>
  );
}

function MetricRow({
  label,
  current,
  max,
  completed,
  detail,
}: {
  label: string;
  current: number;
  max: number;
  completed: boolean;
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        {completed ? (
          <CheckCircle2Icon className="size-4 text-primary shrink-0" />
        ) : (
          <AlertCircleIcon className="size-4 text-muted-foreground/40 shrink-0" />
        )}
        <div className="min-w-0">
          <div
            className={`text-sm truncate ${
              completed
                ? "text-foreground font-medium"
                : "text-muted-foreground"
            }`}
          >
            {label}
          </div>
          {detail && (
            <div className="text-xs text-muted-foreground truncate">
              {detail}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-baseline gap-1 shrink-0">
        <span
          className={`text-base font-bold tabular-nums ${
            completed ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {current}
        </span>
        <span className="text-xs text-muted-foreground">/{max}</span>
      </div>
    </div>
  );
}
