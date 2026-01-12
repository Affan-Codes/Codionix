import {
  differenceInHours,
  format,
  setDate,
  setMonth,
  setYear,
  subDays,
} from 'date-fns';
import type {
  ApplicationFunnelMetrics,
  EngagementMetrics,
  FeedbackQualityMetrics,
  MentorProjectAnalytics,
  PlatformOverviewMetrics,
  ProjectPerformanceMetrics,
  ResponseTimeBenchmarks,
  SkillDemandMetrics,
  StudentApplicationAnalytics,
  TimeRange,
  UserGrowthAnalytics,
  UserGrowthPoint,
} from '../types/analytics.types.js';
import { trackOperation } from '../utils/logger.js';
import { prisma } from '../config/database.js';

// ===================================
// HELPER FUNCTIONS
// ===================================

/**
 * Convert TimeRange to date range
 */
function getDateRangeFromTimeRange(timeRange: TimeRange): {
  startDate: Date;
  endDate: Date;
} {
  const endDate = new Date();
  let startDate: Date = endDate;

  switch (timeRange) {
    case '7d':
      startDate = subDays(endDate, 7);
      break;
    case '30d':
      startDate = subDays(endDate, 30);
      break;
    case '90d':
      startDate = subDays(endDate, 90);
      break;
    case 'all':
      startDate = setYear(setMonth(setDate(endDate, 1), 0), 2020); // Jan 1, 2020
      break;
  }

  return { startDate, endDate };
}

/**
 * Calculate percentage with safe division
 */
function calculatePercentage(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100 * 100) / 100; // 2 decimal places
}

/**
 * Calculate hours between dates
 */
function calculateHoursBetween(start: Date, end: Date): number {
  return Math.round(differenceInHours(end, start) * 100) / 100; // 2 decimal places
}

// ===================================
// PLATFORM OVERVIEW (ADMIN)
// ===================================

export async function getPlatformOverview(): Promise<PlatformOverviewMetrics> {
  const tracker = trackOperation('analytics.platformOverview');

  try {
    const now = new Date();
    const weekAgo = subDays(now, 7);
    const monthAgo = subDays(now, 30);

    // Parallel queries for performance
    const [
      totalUsers,
      usersByRole,
      verifiedUsers,
      activeLastWeek,
      activeLastMonth,
      newUsersWeek,
      newUsersMonth,
      oldUsersMonth,
      totalProjects,
      projectsByStatus,
      projectsWeek,
      projectsMonth,
      totalApplications,
      applicationsByStatus,
      applicationsWeek,
      applicationsMonth,
      totalFeedback,
      avgRating,
      publicFeedback,
      feedbackWeek,
      feedbackMonth,
    ] = await Promise.all([
      // Users
      prisma.user.count(),
      prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      prisma.user.count({ where: { isEmailVerified: true } }),
      prisma.user.count({
        where: { updatedAt: { gte: weekAgo } },
      }),
      prisma.user.count({
        where: { updatedAt: { gte: monthAgo } },
      }),
      prisma.user.count({
        where: { createdAt: { gte: weekAgo } },
      }),
      prisma.user.count({
        where: { createdAt: { gte: monthAgo } },
      }),
      prisma.user.count({
        where: { createdAt: { lt: monthAgo } },
      }),

      // Projects
      prisma.project.count(),
      prisma.project.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.project.count({
        where: { createdAt: { gte: weekAgo } },
      }),
      prisma.project.count({
        where: { createdAt: { gte: monthAgo } },
      }),

      // Applications
      prisma.application.count(),
      prisma.application.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.application.count({
        where: { appliedAt: { gte: weekAgo } },
      }),
      prisma.application.count({
        where: { appliedAt: { gte: monthAgo } },
      }),

      // Feedback
      prisma.feedback.count(),
      prisma.feedback.aggregate({
        _avg: { rating: true },
      }),
      prisma.feedback.count({ where: { isPublic: true } }),
      prisma.feedback.count({
        where: { createdAt: { gte: weekAgo } },
      }),
      prisma.feedback.count({
        where: { createdAt: { gte: monthAgo } },
      }),
    ]);

    // Additional computed metrics
    const [
      avgApplicationsPerProject,
      avgApplicationsPerStudent,
      avgProjectsPerMentor,
    ] = await Promise.all([
      prisma.project.aggregate({
        _avg: { currentApplicants: true },
      }),
      prisma.application
        .groupBy({
          by: ['studentId'],
          _count: true,
        })
        .then((groups) => {
          if (groups.length === 0) return 0;
          const total = groups.reduce((sum, g) => sum + g._count, 0);
          return total / groups.length;
        }),
      prisma.project
        .groupBy({
          by: ['createdById'],
          _count: true,
        })
        .then((groups) => {
          const mentorsCount = usersByRole.find(
            (r) => r.role === 'MENTOR' || r.role === 'EMPLOYER'
          );
          if (!mentorsCount || groups.length === 0) return 0;
          const total = groups.reduce((sum, g) => sum + g._count, 0);
          return total / groups.length;
        }),
    ]);

    // Active projects (published + deadline in future)
    const activeProjects = await prisma.project.count({
      where: {
        status: 'PUBLISHED',
        deadline: { gte: now },
      },
    });

    // Completion rate (applications with feedback)
    const applicationsWithFeedback = await prisma.application.count({
      where: { feedback: { isNot: null } },
    });
    const completionRate = calculatePercentage(
      applicationsWithFeedback,
      totalApplications
    );

    // Acceptance rate
    const acceptedApps =
      applicationsByStatus.find((s) => s.status === 'ACCEPTED')?._count || 0;
    const acceptanceRate = calculatePercentage(acceptedApps, totalApplications);

    // Average response time
    const reviewedApps = await prisma.application.findMany({
      where: {
        reviewedAt: { not: null },
      },
      select: {
        appliedAt: true,
        reviewedAt: true,
      },
    });

    const avgResponseTime =
      reviewedApps.length > 0
        ? reviewedApps.reduce((sum, app) => {
            if (!app.reviewedAt) return sum;
            return sum + calculateHoursBetween(app.appliedAt, app.reviewedAt);
          }, 0) / reviewedApps.length
        : 0;

    // Growth rate (month over month)
    const growthRate =
      oldUsersMonth > 0 ? calculatePercentage(newUsersMonth, oldUsersMonth) : 0;

    const result: PlatformOverviewMetrics = {
      users: {
        total: totalUsers,
        students: usersByRole.find((r) => r.role === 'STUDENT')?._count || 0,
        mentors: usersByRole.find((r) => r.role === 'MENTOR')?._count || 0,
        employers: usersByRole.find((r) => r.role === 'EMPLOYER')?._count || 0,
        verified: verifiedUsers,
        activeLastWeek,
        activeLastMonth,
        newThisWeek: newUsersWeek,
        newThisMonth: newUsersMonth,
        growthRate,
      },
      projects: {
        total: totalProjects,
        published:
          projectsByStatus.find((s) => s.status === 'PUBLISHED')?._count || 0,
        draft: projectsByStatus.find((s) => s.status === 'DRAFT')?._count || 0,
        closed:
          projectsByStatus.find((s) => s.status === 'CLOSED')?._count || 0,
        avgApplicationsPerProject:
          Math.round(
            (avgApplicationsPerProject._avg.currentApplicants || 0) * 100
          ) / 100,
        newThisWeek: projectsWeek,
        newThisMonth: projectsMonth,
      },
      applications: {
        total: totalApplications,
        pending:
          applicationsByStatus.find((s) => s.status === 'PENDING')?._count || 0,
        underReview:
          applicationsByStatus.find((s) => s.status === 'UNDER_REVIEW')
            ?._count || 0,
        accepted: acceptedApps,
        rejected:
          applicationsByStatus.find((s) => s.status === 'REJECTED')?._count ||
          0,
        acceptanceRate,
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
        newThisWeek: applicationsWeek,
        newThisMonth: applicationsMonth,
      },
      feedback: {
        total: totalFeedback,
        avgRating: Math.round((avgRating._avg.rating || 0) * 100) / 100,
        publicFeedback,
        newThisWeek: feedbackWeek,
        newThisMonth: feedbackMonth,
      },
      engagement: {
        avgApplicationsPerStudent:
          Math.round(avgApplicationsPerStudent * 100) / 100,
        avgProjectsPerMentor: Math.round(avgProjectsPerMentor * 100) / 100,
        activeProjects,
        completionRate,
      },
    };

    tracker.success({ metrics: 'platform_overview' });
    return result;
  } catch (error) {
    tracker.failure(error);
    throw error;
  }
}

// ===================================
// USER GROWTH ANALYTICS
// ===================================

export async function getUserGrowthAnalytics(
  timeRange: TimeRange = '30d'
): Promise<UserGrowthAnalytics> {
  const tracker = trackOperation('analytics.userGrowth', undefined, {
    timeRange,
  });

  try {
    const { startDate, endDate } = getDateRangeFromTimeRange(timeRange);

    // Get all users created in range
    const users = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
        role: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Get total users before start date
    const usersBeforeRange = await prisma.user.count({
      where: { createdAt: { lt: startDate } },
    });

    // Group by date
    const dailyData = new Map<string, UserGrowthPoint>();
    let cumulativeTotal = usersBeforeRange;
    let cumulativeStudents = 0;
    let cumulativeMentors = 0;
    let cumulativeEmployers = 0;

    // Initialize all dates in range
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dateKey = d.toISOString().split('T')[0] ?? '';
      dailyData.set(dateKey, {
        date: dateKey,
        total: cumulativeTotal,
        students: cumulativeStudents,
        mentors: cumulativeMentors,
        employers: cumulativeEmployers,
        newUsers: 0,
      });
    }

    // Populate with actual data
    for (const user of users) {
      const dateKey = user.createdAt.toISOString().split('T')[0] ?? '';
      const point = dailyData.get(dateKey);
      if (!point) continue;

      cumulativeTotal++;
      point.newUsers++;

      if (user.role === 'STUDENT') cumulativeStudents++;
      if (user.role === 'MENTOR') cumulativeMentors++;
      if (user.role === 'EMPLOYER') cumulativeEmployers++;

      // Update all subsequent dates
      for (const [key, p] of dailyData.entries()) {
        if (key >= dateKey) {
          p.total = cumulativeTotal;
          p.students = cumulativeStudents;
          p.mentors = cumulativeMentors;
          p.employers = cumulativeEmployers;
        }
      }
    }

    const dataPoints = Array.from(dailyData.values());

    // Calculate summary
    const totalGrowth = users.length;
    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const avgDailySignups = Math.round((totalGrowth / days) * 100) / 100;

    const peakDay = dataPoints.reduce(
      (max, point) => (point.newUsers > max.newUsers ? point : max),
      dataPoints[0] ?? { date: '', newUsers: 0 }
    );

    const result: UserGrowthAnalytics = {
      timeRange,
      dataPoints,
      summary: {
        totalGrowth,
        avgDailySignups,
        peakSignupDay: peakDay.date,
        peakSignupCount: peakDay.newUsers,
      },
    };

    tracker.success({ dataPoints: dataPoints.length });
    return result;
  } catch (error) {
    tracker.failure(error);
    throw error;
  }
}

// ===================================
// MENTOR PROJECT ANALYTICS
// ===================================

export async function getMentorProjectAnalytics(
  mentorId: string
): Promise<MentorProjectAnalytics> {
  const tracker = trackOperation('analytics.mentorProjects', undefined, {
    mentorId,
  });

  try {
    // Get all projects for mentor
    const projects = await prisma.project.findMany({
      where: { createdById: mentorId },
      include: {
        applications: {
          include: {
            student: { select: { skills: true } },
            feedback: { select: { rating: true } },
          },
        },
      },
    });

    const now = new Date();

    // Calculate per-project metrics
    const projectMetrics: ProjectPerformanceMetrics[] = projects.map(
      (project) => {
        const apps = project.applications;
        const pending = apps.filter((a) => a.status === 'PENDING').length;
        const accepted = apps.filter((a) => a.status === 'ACCEPTED').length;
        const rejected = apps.filter((a) => a.status === 'REJECTED').length;

        // Response time
        const reviewedApps = apps.filter((a) => a.reviewedAt);
        const avgResponseTime =
          reviewedApps.length > 0
            ? reviewedApps.reduce((sum, app) => {
                if (!app.reviewedAt) return sum;
                return (
                  sum + calculateHoursBetween(app.appliedAt, app.reviewedAt)
                );
              }, 0) / reviewedApps.length
            : 0;

        // Applicant rating
        const ratings = apps
          .map((a) => a.feedback?.rating)
          .filter((r): r is number => r !== null && r !== undefined);
        const avgApplicantRating =
          ratings.length > 0
            ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
            : 0;

        // Skills match
        const requiredSkills = project.skills;
        let totalSkillsMatch = 0;
        apps.forEach((app) => {
          const studentSkills = app.student.skills;
          const matchCount = requiredSkills.filter((s) =>
            studentSkills.includes(s)
          ).length;
          totalSkillsMatch += calculatePercentage(
            matchCount,
            requiredSkills.length
          );
        });
        const avgSkillsMatch =
          apps.length > 0 ? totalSkillsMatch / apps.length : 0;

        // Top applicant skills
        const skillCounts = new Map<string, number>();
        apps.forEach((app) => {
          app.student.skills.forEach((skill) => {
            skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
          });
        });
        const topApplicantSkills = Array.from(skillCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([skill, count]) => ({ skill, count }));

        return {
          projectId: project.id,
          projectTitle: project.title,
          stats: {
            totalApplications: apps.length,
            pendingApplications: pending,
            acceptedApplications: accepted,
            rejectedApplications: rejected,
            acceptanceRate: calculatePercentage(accepted, apps.length),
            avgResponseTime: Math.round(avgResponseTime * 100) / 100,
            avgApplicantRating: Math.round(avgApplicantRating * 100) / 100,
            daysUntilDeadline: Math.ceil(
              (project.deadline.getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24)
            ),
            isActive: project.status === 'PUBLISHED' && project.deadline > now,
          },
          applicantQuality: {
            avgSkillsMatch: Math.round(avgSkillsMatch * 100) / 100,
            topApplicantSkills,
          },
          timeline: {
            publishedAt: project.createdAt,
            firstApplicationAt: apps[0]?.appliedAt || null,
            lastApplicationAt: apps[apps.length - 1]?.appliedAt || null,
            deadline: project.deadline,
          },
        };
      }
    );

    // Overall statistics
    const allApplications = projects.flatMap((p) => p.applications);
    const totalApps = allApplications.length;
    const totalAccepted = allApplications.filter(
      (a) => a.status === 'ACCEPTED'
    ).length;

    const reviewedApps = allApplications.filter((a) => a.reviewedAt);
    const avgResponseTime =
      reviewedApps.length > 0
        ? reviewedApps.reduce((sum, app) => {
            if (!app.reviewedAt) return sum;
            return sum + calculateHoursBetween(app.appliedAt, app.reviewedAt);
          }, 0) / reviewedApps.length
        : 0;

    // Top skills requested
    const skillCounts = new Map<string, number>();
    projects.forEach((p) => {
      p.skills.forEach((skill) => {
        skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
      });
    });
    const topSkillsRequested = Array.from(skillCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill, projectCount]) => ({ skill, projectCount }));

    // Hiring funnel
    const pending = allApplications.filter(
      (a) => a.status === 'PENDING'
    ).length;
    const underReview = allApplications.filter(
      (a) => a.status === 'UNDER_REVIEW'
    ).length;
    const accepted = allApplications.filter(
      (a) => a.status === 'ACCEPTED'
    ).length;
    const rejected = allApplications.filter(
      (a) => a.status === 'REJECTED'
    ).length;

    const result: MentorProjectAnalytics = {
      overview: {
        totalProjects: projects.length,
        activeProjects: projectMetrics.filter((p) => p.stats.isActive).length,
        totalApplicationsReceived: totalApps,
        avgApplicationsPerProject:
          Math.round((totalApps / projects.length) * 100) / 100 || 0,
        avgAcceptanceRate: calculatePercentage(totalAccepted, totalApps),
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      },
      projects: projectMetrics,
      topSkillsRequested,
      hiringFunnel: {
        applied: totalApps,
        underReview,
        accepted,
        rejected,
        pending,
        conversionRate: calculatePercentage(accepted, totalApps),
      },
    };

    tracker.success({ projectsAnalyzed: projects.length });
    return result;
  } catch (error) {
    tracker.failure(error, { mentorId });
    throw error;
  }
}

// ===================================
// STUDENT ANALYTICS
// ===================================

export async function getStudentApplicationAnalytics(
  studentId: string
): Promise<StudentApplicationAnalytics> {
  const tracker = trackOperation('analytics.studentApplications', undefined, {
    studentId,
  });

  try {
    // Get student with applications
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { skills: true },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    const applications = await prisma.application.findMany({
      where: { studentId },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            skills: true,
          },
        },
        feedback: true,
      },
      orderBy: { appliedAt: 'desc' },
    });

    // Overview stats
    const pending = applications.filter((a) => a.status === 'PENDING').length;
    const underReview = applications.filter(
      (a) => a.status === 'UNDER_REVIEW'
    ).length;
    const accepted = applications.filter((a) => a.status === 'ACCEPTED').length;
    const rejected = applications.filter((a) => a.status === 'REJECTED').length;

    const reviewedApps = applications.filter((a) => a.reviewedAt);
    const avgResponseTime =
      reviewedApps.length > 0
        ? reviewedApps.reduce((sum, app) => {
            if (!app.reviewedAt) return sum;
            return sum + calculateHoursBetween(app.appliedAt, app.reviewedAt);
          }, 0) / reviewedApps.length
        : 0;

    // Recent applications
    const recentApplications = applications.slice(0, 10).map((app) => ({
      projectId: app.project.id,
      projectTitle: app.project.title,
      status: app.status,
      appliedAt: app.appliedAt,
      responseTime: app.reviewedAt
        ? calculateHoursBetween(app.appliedAt, app.reviewedAt)
        : null,
      hashedback: !!app.feedback,
    }));

    // Feedback summary
    const feedbacks = applications
      .map((a) => a.feedback)
      .filter((f): f is NonNullable<typeof f> => f !== null);

    const avgRating =
      feedbacks.length > 0
        ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
        : 0;

    const strengthCounts = new Map<string, number>();
    const improvementCounts = new Map<string, number>();

    feedbacks.forEach((f) => {
      f.strengths.forEach((s) => {
        strengthCounts.set(s, (strengthCounts.get(s) || 0) + 1);
      });
      f.improvements.forEach((i) => {
        improvementCounts.set(i, (improvementCounts.get(i) || 0) + 1);
      });
    });

    const commonStrengths = Array.from(strengthCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([strength, count]) => ({ strength, count }));

    const commonImprovements = Array.from(improvementCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([improvement, count]) => ({ improvement, count }));

    // Skills analysis
    const allProjectSkills = new Set<string>();
    const skillCounts = new Map<string, number>();

    applications.forEach((app) => {
      app.project.skills.forEach((skill) => {
        allProjectSkills.add(skill);
        skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
      });
    });

    const mostRequestedSkills = Array.from(skillCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill, projectCount]) => ({ skill, projectCount }));

    const skillGaps = Array.from(allProjectSkills).filter(
      (skill) => !student.skills.includes(skill)
    );

    const competitiveSkills = student.skills.filter((skill) =>
      Array.from(allProjectSkills).includes(skill)
    );

    // Performance trend (monthly)
    const monthlyData = new Map<
      string,
      { applied: number; accepted: number; rejected: number }
    >();

    applications.forEach((app) => {
      const month = app.appliedAt.toISOString().substring(0, 7); // YYYY-MM
      const data = monthlyData.get(month) || {
        applied: 0,
        accepted: 0,
        rejected: 0,
      };
      data.applied++;
      if (app.status === 'ACCEPTED') data.accepted++;
      if (app.status === 'REJECTED') data.rejected++;
      monthlyData.set(month, data);
    });

    const applicationTrend = Array.from(monthlyData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({ month, ...data }));

    // Best performing skills
    const skillAcceptance = new Map<
      string,
      { accepted: number; total: number }
    >();

    applications.forEach((app) => {
      const isAccepted = app.status === 'ACCEPTED';
      app.project.skills.forEach((skill) => {
        if (!student.skills.includes(skill)) return;
        const stats = skillAcceptance.get(skill) || { accepted: 0, total: 0 };
        stats.total++;
        if (isAccepted) stats.accepted++;
        skillAcceptance.set(skill, stats);
      });
    });

    const bestPerformingSkills = Array.from(skillAcceptance.entries())
      .filter(([, stats]) => stats.total >= 2) // Min 2 applications
      .map(([skill, stats]) => ({
        skill,
        acceptanceRate: calculatePercentage(stats.accepted, stats.total),
      }))
      .sort((a, b) => b.acceptanceRate - a.acceptanceRate)
      .slice(0, 5);

    const result: StudentApplicationAnalytics = {
      overview: {
        totalApplications: applications.length,
        pending,
        underReview,
        accepted,
        rejected,
        successRate: calculatePercentage(accepted, applications.length),
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      },
      recentApplications,
      feedbackSummary: {
        totalFeedbackReceived: feedbacks.length,
        avgRating: Math.round(avgRating * 100) / 100,
        commonStrengths,
        commonImprovements,
      },
      skillsAnalysis: {
        yourSkills: student.skills,
        mostRequestedSkills,
        skillGaps: skillGaps.slice(0, 10),
        competitiveSkills,
      },
      performance: {
        applicationTrend,
        bestPerformingSkills,
      },
    };

    tracker.success({ applicationsAnalyzed: applications.length });
    return result;
  } catch (error) {
    tracker.failure(error, { studentId });
    throw error;
  }
}

// ===================================
// APPLICATION FUNNEL ANALYTICS
// ===================================

export async function getApplicationFunnelMetrics(
  timeRange: TimeRange = '30d'
): Promise<ApplicationFunnelMetrics> {
  const tracker = trackOperation('analytics.applicationFunnel', undefined, {
    timeRange,
  });

  try {
    const { startDate, endDate } = getDateRangeFromTimeRange(timeRange);

    const applications = await prisma.application.findMany({
      where: {
        appliedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        project: {
          select: {
            projectType: true,
            difficultyLevel: true,
          },
        },
      },
    });

    // Funnel counts
    const totalApplications = applications.length;
    const pending = applications.filter((a) => a.status === 'PENDING').length;
    const underReview = applications.filter(
      (a) => a.status === 'UNDER_REVIEW'
    ).length;
    const accepted = applications.filter((a) => a.status === 'ACCEPTED').length;
    const rejected = applications.filter((a) => a.status === 'REJECTED').length;

    // Conversion rates
    const reviewed = underReview + accepted + rejected;
    const pendingToReview = calculatePercentage(reviewed, totalApplications);
    const reviewToAccepted = calculatePercentage(accepted, reviewed);
    const reviewToRejected = calculatePercentage(rejected, reviewed);
    const overallAcceptance = calculatePercentage(accepted, totalApplications);

    // Timeline analysis
    const reviewedApps = applications.filter((a) => a.reviewedAt);
    const responseTimes = reviewedApps.map((a) =>
      a.reviewedAt ? calculateHoursBetween(a.appliedAt, a.reviewedAt) : 0
    );

    const avgTimeToDecision =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
        : 0;

    const fastestDecision = Math.min(...responseTimes, Infinity);
    const slowestDecision = Math.max(...responseTimes, -Infinity);

    // By project type
    const byProjectType = [
      {
        type: 'PROJECT' as const,
        applications: applications.filter(
          (a) => a.project.projectType === 'PROJECT'
        ).length,
        acceptanceRate: 0,
      },
      {
        type: 'INTERNSHIP' as const,
        applications: applications.filter(
          (a) => a.project.projectType === 'INTERNSHIP'
        ).length,
        acceptanceRate: 0,
      },
    ];

    byProjectType.forEach((type) => {
      const typeApps = applications.filter(
        (a) => a.project.projectType === type.type
      );
      const typeAccepted = typeApps.filter(
        (a) => a.status === 'ACCEPTED'
      ).length;
      type.acceptanceRate = calculatePercentage(typeAccepted, typeApps.length);
    });

    // By difficulty
    const byDifficulty = [
      {
        level: 'BEGINNER' as const,
        applications: applications.filter(
          (a) => a.project.difficultyLevel === 'BEGINNER'
        ).length,
        acceptanceRate: 0,
      },
      {
        level: 'INTERMEDIATE' as const,
        applications: applications.filter(
          (a) => a.project.difficultyLevel === 'INTERMEDIATE'
        ).length,
        acceptanceRate: 0,
      },
      {
        level: 'ADVANCED' as const,
        applications: applications.filter(
          (a) => a.project.difficultyLevel === 'ADVANCED'
        ).length,
        acceptanceRate: 0,
      },
    ];

    byDifficulty.forEach((diff) => {
      const diffApps = applications.filter(
        (a) => a.project.difficultyLevel === diff.level
      );
      const diffAccepted = diffApps.filter(
        (a) => a.status === 'ACCEPTED'
      ).length;
      diff.acceptanceRate = calculatePercentage(diffAccepted, diffApps.length);
    });

    const result: ApplicationFunnelMetrics = {
      timeRange,
      funnel: {
        totalApplications,
        pending,
        underReview,
        accepted,
        rejected,
      },
      conversionRates: {
        pendingToReview,
        reviewToAccepted,
        reviewToRejected,
        overallAcceptance,
      },
      timeline: {
        avgTimeToFirstReview: Math.round(avgTimeToDecision * 100) / 100,
        avgTimeToDecision: Math.round(avgTimeToDecision * 100) / 100,
        fastestDecision:
          fastestDecision === Infinity
            ? 0
            : Math.round(fastestDecision * 100) / 100,
        slowestDecision:
          slowestDecision === -Infinity
            ? 0
            : Math.round(slowestDecision * 100) / 100,
      },
      byProjectType,
      byDifficulty,
    };

    tracker.success({ applicationsAnalyzed: totalApplications });
    return result;
  } catch (error) {
    tracker.failure(error, { timeRange });
    throw error;
  }
}

// ===================================
// SKILL DEMAND ANALYTICS
// ===================================

export async function getSkillDemandMetrics(
  timeRange: TimeRange = '30d'
): Promise<SkillDemandMetrics> {
  const tracker = trackOperation('analytics.skillDemand', undefined, {
    timeRange,
  });

  try {
    const { startDate, endDate } = getDateRangeFromTimeRange(timeRange);

    // Get all projects in time range
    const projects = await prisma.project.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        skills: true,
        stipend: true,
        applications: {
          select: {
            status: true,
          },
        },
      },
    });

    // Previous period for trend analysis
    const prevStart = subDays(
      startDate,
      timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
    );
    const prevProjects = await prisma.project.findMany({
      where: {
        createdAt: {
          gte: prevStart,
          lt: startDate,
        },
      },
      select: {
        skills: true,
      },
    });

    // Aggregate skill data
    const skillData = new Map<
      string,
      {
        projectCount: number;
        applicationCount: number;
        acceptedCount: number;
        prevProjectCount: number;
        totalStipend: number;
        stipendCount: number;
      }
    >();

    projects.forEach((project) => {
      project.skills.forEach((skill) => {
        const data = skillData.get(skill) || {
          projectCount: 0,
          applicationCount: 0,
          acceptedCount: 0,
          prevProjectCount: 0,
          totalStipend: 0,
          stipendCount: 0,
        };
        data.projectCount++;
        data.applicationCount += project.applications.length;
        data.acceptedCount += project.applications.filter(
          (a) => a.status === 'ACCEPTED'
        ).length;

        if (project.stipend) {
          data.totalStipend += Number(project.stipend);
          data.stipendCount++;
        }

        skillData.set(skill, data);
      });
    });

    // Previous period counts
    prevProjects.forEach((project) => {
      project.skills.forEach((skill) => {
        const data = skillData.get(skill);
        if (data) {
          data.prevProjectCount++;
        } else {
          skillData.set(skill, {
            projectCount: 0,
            applicationCount: 0,
            acceptedCount: 0,
            prevProjectCount: 1,
            totalStipend: 0,
            stipendCount: 0,
          });
        }
      });
    });

    // Calculate trends
    const topSkills = Array.from(skillData.entries())
      .map(([skill, data]) => {
        const avgAcceptanceRate = calculatePercentage(
          data.acceptedCount,
          data.applicationCount
        );

        let trend: 'rising' | 'stable' | 'falling' = 'stable';
        if (data.prevProjectCount > 0) {
          const growthRate =
            ((data.projectCount - data.prevProjectCount) /
              data.prevProjectCount) *
            100;
          if (growthRate > 20) trend = 'rising';
          if (growthRate < -20) trend = 'falling';
        } else if (data.projectCount > 0) {
          trend = 'rising';
        }

        return {
          skill,
          projectCount: data.projectCount,
          applicationCount: data.applicationCount,
          avgAcceptanceRate,
          trend,
        };
      })
      .sort((a, b) => b.projectCount - a.projectCount)
      .slice(0, 20);

    // Emerging skills (new or fast-growing)
    const emergingSkills = Array.from(skillData.entries())
      .filter(([, data]) => data.projectCount >= 2) // Min 2 projects
      .map(([skill, data]) => {
        const growthRate =
          data.prevProjectCount > 0
            ? ((data.projectCount - data.prevProjectCount) /
                data.prevProjectCount) *
              100
            : 100;

        return {
          skill,
          recentProjectCount: data.projectCount,
          growthRate: Math.round(growthRate * 100) / 100,
        };
      })
      .filter((s) => s.growthRate > 50) // 50%+ growth
      .sort((a, b) => b.growthRate - a.growthRate)
      .slice(0, 10);

    // Skills by role
    const [studentSkills, mentorSkills] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'STUDENT' },
        select: { skills: true },
      }),
      prisma.project.findMany({
        select: { skills: true },
      }),
    ]);

    const studentSkillCounts = new Map<string, number>();
    studentSkills.forEach((user) => {
      user.skills.forEach((skill) => {
        studentSkillCounts.set(skill, (studentSkillCounts.get(skill) || 0) + 1);
      });
    });

    const mentorSkillCounts = new Map<string, number>();
    mentorSkills.forEach((project) => {
      project.skills.forEach((skill) => {
        mentorSkillCounts.set(skill, (mentorSkillCounts.get(skill) || 0) + 1);
      });
    });

    // Skill combinations
    const comboCounts = new Map<
      string,
      { count: number; stipends: number[] }
    >();
    projects.forEach((project) => {
      if (project.skills.length < 2) return;
      const combo = project.skills.sort().join(',');
      const data = comboCounts.get(combo) || { count: 0, stipends: [] };
      data.count++;
      if (project.stipend) {
        data.stipends.push(Number(project.stipend));
      }
      comboCounts.set(combo, data);
    });

    const skillCombinations = Array.from(comboCounts.entries())
      .filter(([, data]) => data.count >= 2)
      .map(([combo, data]) => ({
        skills: combo.split(','),
        projectCount: data.count,
        avgStipend:
          data.stipends.length > 0
            ? Math.round(
                (data.stipends.reduce((a, b) => a + b, 0) /
                  data.stipends.length) *
                  100
              ) / 100
            : null,
      }))
      .sort((a, b) => b.projectCount - a.projectCount)
      .slice(0, 10);

    const result: SkillDemandMetrics = {
      timeRange,
      topSkills,
      emergingSkills,
      byRole: {
        students: Array.from(studentSkillCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15)
          .map(([skill, userCount]) => ({ skill, userCount })),
        mentors: Array.from(mentorSkillCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15)
          .map(([skill, projectCount]) => ({ skill, projectCount })),
      },
      skillCombinations,
    };

    tracker.success({ skillsAnalyzed: skillData.size });
    return result;
  } catch (error) {
    tracker.failure(error, { timeRange });
    throw error;
  }
}

// ===================================
// ENGAGEMENT ANALYTICS
// ===================================

export async function getEngagementMetrics(
  timeRange: TimeRange = '30d'
): Promise<EngagementMetrics> {
  const tracker = trackOperation('analytics.engagement', undefined, {
    timeRange,
  });

  try {
    const now = new Date();
    const dayAgo = subDays(now, 1);
    const weekAgo = subDays(now, 7);
    const monthAgo = subDays(now, 30);
    const { startDate, endDate } = getDateRangeFromTimeRange(timeRange);

    // Active users (based on updatedAt - any activity updates this)
    const [dau, wau, mau] = await Promise.all([
      prisma.user.count({
        where: { updatedAt: { gte: dayAgo } },
      }),
      prisma.user.count({
        where: { updatedAt: { gte: weekAgo } },
      }),
      prisma.user.count({
        where: { updatedAt: { gte: monthAgo } },
      }),
    ]);

    const dau_mau_ratio = calculatePercentage(dau, mau);

    // Actions in time range
    const [
      newUsers,
      newProjects,
      newApplications,
      feedbackGiven,
      projectsPublished,
    ] = await Promise.all([
      prisma.user.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.project.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.application.count({
        where: {
          appliedAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.feedback.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.project.count({
        where: {
          status: 'PUBLISHED',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    // Retention analysis
    const twoWeeksAgo = subDays(now, 14);
    const threeWeeksAgo = subDays(now, 21);
    const twoMonthsAgo = subDays(now, 60);

    const [weekOneCohort, weekOneReturned, monthOneCohort, monthOneReturned] =
      await Promise.all([
        prisma.user.count({
          where: {
            createdAt: { gte: threeWeeksAgo, lt: twoWeeksAgo },
          },
        }),
        prisma.user.count({
          where: {
            createdAt: { gte: threeWeeksAgo, lt: twoWeeksAgo },
            updatedAt: { gte: twoWeeksAgo },
          },
        }),
        prisma.user.count({
          where: {
            createdAt: { gte: twoMonthsAgo, lt: monthAgo },
          },
        }),
        prisma.user.count({
          where: {
            createdAt: { gte: twoMonthsAgo, lt: monthAgo },
            updatedAt: { gte: monthAgo },
          },
        }),
      ]);

    const weeklyRetention = calculatePercentage(weekOneReturned, weekOneCohort);
    const monthlyRetention = calculatePercentage(
      monthOneReturned,
      monthOneCohort
    );

    // Engagement by role
    const roles: Array<'STUDENT' | 'MENTOR' | 'EMPLOYER'> = [
      'STUDENT',
      'MENTOR',
      'EMPLOYER',
    ];

    const engagement_by_role = await Promise.all(
      roles.map(async (role) => {
        const [total, active] = await Promise.all([
          prisma.user.count({ where: { role } }),
          prisma.user.count({
            where: {
              role,
              updatedAt: { gte: weekAgo },
            },
          }),
        ]);

        // Calculate actions for this role
        let avgActionsPerUser = 0;
        if (role === 'STUDENT') {
          const apps = await prisma.application.count({
            where: {
              appliedAt: { gte: startDate, lte: endDate },
            },
          });
          avgActionsPerUser = total > 0 ? apps / total : 0;
        } else {
          const projects = await prisma.project.count({
            where: {
              createdAt: { gte: startDate, lte: endDate },
              createdBy: { role },
            },
          });
          avgActionsPerUser = total > 0 ? projects / total : 0;
        }

        return {
          role,
          activeUsers: active,
          avgActionsPerUser: Math.round(avgActionsPerUser * 100) / 100,
          engagementRate: calculatePercentage(active, total),
        };
      })
    );

    const result: EngagementMetrics = {
      timeRange,
      userActivity: {
        dailyActiveUsers: dau,
        weeklyActiveUsers: wau,
        monthlyActiveUsers: mau,
        dau_mau_ratio,
      },
      actions: {
        newUsers,
        newProjects,
        newApplications,
        feedbackGiven,
        projectsPublished,
      },
      retention: {
        weeklyRetention,
        monthlyRetention,
      },
      engagement_by_role,
    };

    tracker.success();
    return result;
  } catch (error) {
    tracker.failure(error, { timeRange });
    throw error;
  }
}

// ===================================
// FEEDBACK QUALITY ANALYTICS
// ===================================

export async function getFeedbackQualityMetrics(): Promise<FeedbackQualityMetrics> {
  const tracker = trackOperation('analytics.feedbackQuality');

  try {
    const [allFeedback, publicCount, avgRating] = await Promise.all([
      prisma.feedback.findMany({
        include: {
          mentor: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      }),
      prisma.feedback.count({ where: { isPublic: true } }),
      prisma.feedback.aggregate({
        _avg: { rating: true },
      }),
    ]);

    const totalFeedback = allFeedback.length;
    const publicFeedbackRate = calculatePercentage(publicCount, totalFeedback);

    // Rating distribution
    const ratingCounts = [1, 2, 3, 4, 5].map((rating) => {
      const count = allFeedback.filter((f) => f.rating === rating).length;
      return {
        rating,
        count,
        percentage: calculatePercentage(count, totalFeedback),
      };
    });

    // Top mentors
    const mentorStats = new Map<
      string,
      { name: string; count: number; totalRating: number }
    >();

    allFeedback.forEach((f) => {
      const stats = mentorStats.get(f.mentorId) || {
        name: f.mentor.fullName,
        count: 0,
        totalRating: 0,
      };
      stats.count++;
      stats.totalRating += f.rating;
      mentorStats.set(f.mentorId, stats);
    });

    const topMentors = Array.from(mentorStats.entries())
      .map(([mentorId, stats]) => ({
        mentorId,
        mentorName: stats.name,
        feedbackGiven: stats.count,
        avgRating: Math.round((stats.totalRating / stats.count) * 100) / 100,
      }))
      .sort((a, b) => b.feedbackGiven - a.feedbackGiven)
      .slice(0, 10);

    // Common strengths and improvements
    const strengthCounts = new Map<string, number>();
    const improvementCounts = new Map<string, number>();

    allFeedback.forEach((f) => {
      f.strengths.forEach((s) => {
        strengthCounts.set(s, (strengthCounts.get(s) || 0) + 1);
      });
      f.improvements.forEach((i) => {
        improvementCounts.set(i, (improvementCounts.get(i) || 0) + 1);
      });
    });

    const commonStrengths = Array.from(strengthCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([strength, count]) => ({ strength, count }));

    const commonImprovements = Array.from(improvementCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([improvement, count]) => ({ improvement, count }));

    // Monthly trends
    const monthlyData = new Map<
      string,
      { count: number; totalRating: number }
    >();

    allFeedback.forEach((f) => {
      const month = format(f.createdAt, 'yyyy-MM');
      const data = monthlyData.get(month) || { count: 0, totalRating: 0 };
      data.count++;
      data.totalRating += f.rating;
      monthlyData.set(month, data);
    });

    const feedbackTrends = Array.from(monthlyData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({
        month,
        totalFeedback: data.count,
        avgRating: Math.round((data.totalRating / data.count) * 100) / 100,
      }));

    const result: FeedbackQualityMetrics = {
      overview: {
        totalFeedback,
        avgRating: Math.round((avgRating._avg.rating || 0) * 100) / 100,
        publicFeedbackRate,
      },
      ratingDistribution: ratingCounts,
      topMentors,
      commonStrengths,
      commonImprovements,
      feedbackTrends,
    };

    tracker.success();
    return result;
  } catch (error) {
    tracker.failure(error);
    throw error;
  }
}

// ===================================
// RESPONSE TIME BENCHMARKS
// ===================================

export async function getResponseTimeBenchmarks(): Promise<ResponseTimeBenchmarks> {
  const tracker = trackOperation('analytics.responseTimeBenchmarks');

  try {
    const reviewedApps = await prisma.application.findMany({
      where: {
        reviewedAt: { not: null },
      },
      select: {
        appliedAt: true,
        reviewedAt: true,
        reviewer: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
        project: {
          select: {
            projectType: true,
          },
        },
      },
    });

    // Calculate response times in hours
    const responseTimes = reviewedApps
      .filter((app) => app.reviewedAt !== null)
      .map((app) => ({
        hours: differenceInHours(app.reviewedAt!, app.appliedAt),
        reviewerId: app.reviewer?.id,
        reviewerName: app.reviewer?.fullName,
        reviewerRole: app.reviewer?.role,
        projectType: app.project.projectType,
      }));

    // Overall stats
    const sorted = [...responseTimes].sort((a, b) => a.hours - b.hours);
    const avgResponseTime =
      responseTimes.reduce((sum, rt) => sum + rt.hours, 0) /
      responseTimes.length;
    const medianResponseTime =
      sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)]?.hours || 0 : 0;
    const p95ResponseTime =
      sorted.length > 0
        ? sorted[Math.floor(sorted.length * 0.95)]?.hours || 0
        : 0;

    // By role
    const roleGroups = new Map<string, number[]>();
    responseTimes.forEach((rt) => {
      if (!rt.reviewerRole) return;
      const times = roleGroups.get(rt.reviewerRole) || [];
      times.push(rt.hours);
      roleGroups.set(rt.reviewerRole, times);
    });

    const byRole = Array.from(roleGroups.entries())
      .filter(([role]) => role === 'MENTOR' || role === 'EMPLOYER')
      .map(([role, times]) => ({
        role: role as 'MENTOR' | 'EMPLOYER',
        avgResponseTime:
          Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 100) /
          100,
        count: times.length,
      }));

    // By project type
    const typeGroups = new Map<string, number[]>();
    responseTimes.forEach((rt) => {
      const times = typeGroups.get(rt.projectType) || [];
      times.push(rt.hours);
      typeGroups.set(rt.projectType, times);
    });

    const byProjectType = Array.from(typeGroups.entries()).map(
      ([type, times]) => ({
        type: type as 'PROJECT' | 'INTERNSHIP',
        avgResponseTime:
          Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 100) /
          100,
        count: times.length,
      })
    );

    // Fastest responders
    const reviewerGroups = new Map<string, { name: string; times: number[] }>();
    responseTimes.forEach((rt) => {
      if (!rt.reviewerId || !rt.reviewerName) return;
      const data = reviewerGroups.get(rt.reviewerId) || {
        name: rt.reviewerName,
        times: [],
      };
      data.times.push(rt.hours);
      reviewerGroups.set(rt.reviewerId, data);
    });

    const fastestResponders = Array.from(reviewerGroups.entries())
      .filter(([, data]) => data.times.length >= 3) // Min 3 reviews
      .map(([mentorId, data]) => ({
        mentorId,
        mentorName: data.name,
        avgResponseTime:
          Math.round(
            (data.times.reduce((a, b) => a + b, 0) / data.times.length) * 100
          ) / 100,
        applicationCount: data.times.length,
      }))
      .sort((a, b) => a.avgResponseTime - b.avgResponseTime)
      .slice(0, 10);

    const result: ResponseTimeBenchmarks = {
      overall: {
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
        medianResponseTime: Math.round(medianResponseTime * 100) / 100,
        p95ResponseTime: Math.round(p95ResponseTime * 100) / 100,
      },
      byRole,
      byProjectType,
      fastestResponders,
    };

    tracker.success({ applicationsAnalyzed: reviewedApps.length });
    return result;
  } catch (error) {
    tracker.failure(error);
    throw error;
  }
}
