import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2Icon,
  XCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  TargetIcon,
  SparklesIcon,
  UserIcon,
} from "lucide-react";
import type { Application } from "@/types";
import { formatDistanceToNow } from "date-fns";

interface ApplicantListViewProps {
  applications: Application[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  projectSkills: string[];
}

export function ApplicantListView({
  applications,
  selectedId,
  onSelect,
  projectSkills,
}: ApplicantListViewProps) {
  if (applications.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3 max-w-sm">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-muted">
            <UserIcon className="size-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            No candidates
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Applicants will appear as they submit
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin divide-y divide-border">
      {applications.map((application) => (
        <CandidateRow
          key={application.id}
          application={application}
          selected={selectedId === application.id}
          onClick={() => onSelect(application.id)}
          projectSkills={projectSkills}
        />
      ))}
    </div>
  );
}

function CandidateRow({
  application,
  selected,
  onClick,
  projectSkills,
}: {
  application: Application;
  selected: boolean;
  onClick: () => void;
  projectSkills: string[];
}) {
  const statusConfig = {
    PENDING: {
      icon: ClockIcon,
      label: "New",
      color: "text-yellow-600",
      bg: "bg-yellow-50 dark:bg-yellow-950/20",
      border: "border-yellow-200 dark:border-yellow-900/30",
    },
    UNDER_REVIEW: {
      icon: AlertCircleIcon,
      label: "Review",
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/20",
      border: "border-blue-200 dark:border-blue-900/30",
    },
    ACCEPTED: {
      icon: CheckCircle2Icon,
      label: "Accepted",
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-950/20",
      border: "border-green-200 dark:border-green-900/30",
    },
    REJECTED: {
      icon: XCircleIcon,
      label: "Rejected",
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-950/20",
      border: "border-red-200 dark:border-red-900/30",
    },
  };

  const config = statusConfig[application.status];
  const StatusIcon = config.icon;

  const candidateSkills = application.student?.skills || [];
  const matchedSkills = useMemo(() => {
    const projectSkillsLower = projectSkills.map((s) => s.toLowerCase());
    return candidateSkills.filter((skill) =>
      projectSkillsLower.includes(skill.toLowerCase())
    );
  }, [candidateSkills, projectSkills]);

  const matchRate =
    projectSkills.length > 0
      ? Math.round((matchedSkills.length / projectSkills.length) * 100)
      : 0;
  const isStrongMatch = matchRate >= 70;
  const isGoodMatch = matchRate >= 50 && matchRate < 70;

  return (
    <button
      onClick={onClick}
      className={`group w-full flex items-center gap-5 px-6 py-5 text-left transition-all hover:bg-accent/30 ${
        selected
          ? "bg-primary/5 border-l-4 border-l-primary"
          : "border-l-4 border-l-transparent"
      }`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="size-14 rounded-2xl bg-linear-to-br from-primary to-primary/60 text-primary-foreground font-bold text-xl flex items-center justify-center shadow-sm group-hover:shadow transition-shadow">
          {application.student?.fullName.charAt(0).toUpperCase()}
        </div>
        {isStrongMatch && (
          <div className="absolute -bottom-1 -right-1 size-6 rounded-full bg-primary border-2 border-background flex items-center justify-center shadow-sm">
            <SparklesIcon className="size-3 text-primary-foreground fill-current" />
          </div>
        )}
        {isGoodMatch && (
          <div className="absolute -bottom-1 -right-1 size-6 rounded-full bg-achievement border-2 border-background flex items-center justify-center shadow-sm">
            <TargetIcon className="size-2.5 text-achievement-foreground" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto] gap-x-6 gap-y-3">
        {/* Left Column */}
        <div className="space-y-2">
          {/* Name */}
          <h3 className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {application.student?.fullName}
          </h3>

          {/* Match Rate */}
          {matchRate > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex-1 max-w-48 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    isStrongMatch
                      ? "bg-primary"
                      : isGoodMatch
                      ? "bg-achievement"
                      : "bg-muted-foreground"
                  }`}
                  style={{ width: `${matchRate}%` }}
                />
              </div>
              <span
                className={`text-xs font-bold tabular-nums shrink-0 ${
                  isStrongMatch
                    ? "text-primary"
                    : isGoodMatch
                    ? "text-achievement"
                    : "text-muted-foreground"
                }`}
              >
                {matchRate}%
              </span>
            </div>
          )}

          {/* Skills */}
          {candidateSkills.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {candidateSkills.slice(0, 6).map((skill) => {
                const isMatched = matchedSkills.some(
                  (m) => m.toLowerCase() === skill.toLowerCase()
                );
                return (
                  <Badge
                    key={skill}
                    variant={isMatched ? "default" : "secondary"}
                    className={`text-xs h-5 px-1.5 ${
                      isMatched
                        ? "bg-primary/10 text-primary border-primary/20"
                        : ""
                    }`}
                  >
                    {skill}
                  </Badge>
                );
              })}
              {candidateSkills.length > 6 && (
                <span className="text-xs text-muted-foreground">
                  +{candidateSkills.length - 6}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="flex flex-col items-end justify-between gap-2">
          {/* Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${config.border} ${config.bg} shrink-0`}
          >
            <StatusIcon className={`size-3.5 ${config.color}`} />
            <span className={`text-xs font-medium ${config.color}`}>
              {config.label}
            </span>
          </div>

          {/* Timestamp */}
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatDistanceToNow(new Date(application.appliedAt), {
              addSuffix: true,
            })}
          </span>
        </div>
      </div>
    </button>
  );
}
