import { useMemo } from "react";
import { differenceInDays } from "date-fns";
import type { Project, User } from "@/types";

export function useProjectAnalysis(
  project: Project | undefined,
  user: User | null | undefined
) {
  return useMemo(() => {
    if (!project) return null;

    const now = new Date();
    const deadline = new Date(project.deadline);
    const daysLeft = differenceInDays(deadline, now);
    const hoursLeft = daysLeft * 24;

    // Skill match with categorization
    const userSkills = (user?.skills || []).map((s) => s.toLowerCase());
    const required = project.skills.map((s) => s.toLowerCase());
    const matched = required.filter((s) => userSkills.includes(s));
    const missing = required.filter((s) => !userSkills.includes(s));
    const matchRate =
      required.length > 0 ? (matched.length / required.length) * 100 : 0;

    // Skill categories
    const criticalSkills = project.skills.slice(
      0,
      Math.ceil(project.skills.length * 0.6)
    );
    const criticalMissing = criticalSkills.filter(
      (s) => !userSkills.includes(s.toLowerCase())
    );

    // Competition pressure
    const slots = project.maxApplicants || 999;
    const taken = project.currentApplicants;
    const fillRate = (taken / slots) * 100;
    const spotsLeft = slots - taken;

    // Estimated acceptance rate
    const estimatedAcceptanceRate = Math.max(10, Math.min(40, 100 - fillRate));

    // URGENCY SCORE (0-100)
    let urgencyScore = 0;
    if (daysLeft < 1) urgencyScore = 100;
    else if (daysLeft < 3) urgencyScore = 90;
    else if (daysLeft < 5) urgencyScore = 75;
    else if (daysLeft < 7) urgencyScore = 60;
    else if (daysLeft < 14) urgencyScore = 40;
    else if (daysLeft < 21) urgencyScore = 25;
    else urgencyScore = 10;

    // COMPETITION SCORE (0-100)
    let competitionScore = fillRate;

    // FIT SCORE (0-100)
    const criticalMatchRate =
      criticalSkills.length > 0
        ? ((criticalSkills.length - criticalMissing.length) /
            criticalSkills.length) *
          100
        : 100;
    let fitScore = Math.round(matchRate * 0.6 + criticalMatchRate * 0.4);

    // OVERALL OPPORTUNITY SCORE
    let opportunityScore = Math.round(
      fitScore * 0.5 + (100 - competitionScore) * 0.3 + urgencyScore * 0.2
    );

    // Critical skill penalty
    if (criticalMissing.length > 0) {
      opportunityScore = Math.max(
        0,
        opportunityScore - criticalMissing.length * 10
      );
    }

    // RISK FLAGS
    const risks = [];

    if (criticalMissing.length > 0) {
      risks.push({
        level: "critical" as const,
        text: `Missing ${criticalMissing.length} critical skills`,
        action: "Review requirements carefully",
        skills: criticalMissing,
      });
    }

    if (fillRate > 90) {
      risks.push({
        level: "critical" as const,
        text: `Only ${spotsLeft} spots remaining`,
        action: "Apply immediately if interested",
      });
    } else if (fillRate > 75) {
      risks.push({
        level: "high" as const,
        text: "High competition, filling fast",
        action: "Apply within 24-48 hours",
      });
    }

    if (daysLeft < 2) {
      risks.push({
        level: "critical" as const,
        text: `Deadline in ${hoursLeft}h`,
        action: "Final hours - decide now",
      });
    } else if (daysLeft < 5) {
      risks.push({
        level: "high" as const,
        text: `${daysLeft} days until deadline`,
        action: "Apply this week",
      });
    }

    if (matchRate >= 40 && matchRate < 60 && missing.length > 0) {
      risks.push({
        level: "medium" as const,
        text: "Partial skill match - strengthen application",
        action: "Emphasize transferable skills",
        skills: missing.slice(0, 2),
      });
    }

    // Application timing recommendation
    let timingAdvice = "";
    if (fillRate < 30 && daysLeft > 7) {
      timingAdvice = "Early applicant advantage - apply when ready";
    } else if (fillRate > 70 || daysLeft < 5) {
      timingAdvice = "Time-sensitive - apply within 24 hours";
    } else if (matchRate < 60) {
      timingAdvice = "Take time to craft strong application";
    } else {
      timingAdvice = "Good timing - apply this week";
    }

    // Success prediction
    let successProbability = Math.round(
      fitScore * 0.6 +
        (100 - competitionScore) * 0.3 +
        Math.min(urgencyScore, 50) * 0.1
    );
    successProbability = Math.max(5, Math.min(85, successProbability));

    return {
      daysLeft,
      hoursLeft,
      matchRate: Math.round(matchRate),
      criticalMatchRate: Math.round(criticalMatchRate),
      matched: matched.length,
      missing: missing.length,
      criticalMissing: criticalMissing.length,
      fillRate: Math.round(fillRate),
      spotsLeft,
      urgencyScore,
      competitionScore,
      fitScore,
      opportunityScore,
      risks,
      missingSkills: missing,
      criticalMissingSkills: criticalMissing,
      signal:
        opportunityScore >= 70
          ? ("strong" as const)
          : opportunityScore >= 50
          ? ("moderate" as const)
          : ("weak" as const),
      timingAdvice,
      estimatedAcceptanceRate,
      successProbability,
    };
  }, [project, user]);
}
