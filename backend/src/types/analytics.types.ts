// ===================================
// TIME RANGE FILTERS
// ===================================

export type TimeRange = '7d' | '30d' | '90d' | 'all';

export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
  timeRange?: TimeRange;
}

// ===================================
// PLATFORM OVERVIEW (ADMIN)
// ===================================

export interface PlatformOverviewMetrics {
  users: {
    total: number;
    students: number;
    mentors: number;
    employers: number;
    verified: number;
    activeLastWeek: number;
    activeLastMonth: number;
    newThisWeek: number;
    newThisMonth: number;
    growthRate: number; // percentage
  };
  projects: {
    total: number;
    published: number;
    draft: number;
    closed: number;
    avgApplicationsPerProject: number;
    newThisWeek: number;
    newThisMonth: number;
  };
  applications: {
    total: number;
    pending: number;
    underReview: number;
    accepted: number;
    rejected: number;
    acceptanceRate: number; // percentage
    avgResponseTime: number; // hours
    newThisWeek: number;
    newThisMonth: number;
  };
  feedback: {
    total: number;
    avgRating: number;
    publicFeedback: number;
    newThisWeek: number;
    newThisMonth: number;
  };
  engagement: {
    avgApplicationsPerStudent: number;
    avgProjectsPerMentor: number;
    activeProjects: number; // published with deadline in future
    completionRate: number; // applications that got feedback / total applications
  };
}

// ===================================
// USER GROWTH ANALYTICS
// ===================================

export interface UserGrowthPoint {
  date: string; // YYYY-MM-DD
  total: number;
  students: number;
  mentors: number;
  employers: number;
  newUsers: number;
}

export interface UserGrowthAnalytics {
  timeRange: TimeRange;
  dataPoints: UserGrowthPoint[];
  summary: {
    totalGrowth: number;
    avgDailySignups: number;
    peakSignupDay: string;
    peakSignupCount: number;
  };
}

// ===================================
// PROJECT ANALYTICS (MENTOR/EMPLOYER)
// ===================================

export interface ProjectPerformanceMetrics {
  projectId: string;
  projectTitle: string;
  stats: {
    totalApplications: number;
    pendingApplications: number;
    acceptedApplications: number;
    rejectedApplications: number;
    acceptanceRate: number;
    avgResponseTime: number; // hours
    avgApplicantRating: number; // based on feedback given
    daysUntilDeadline: number;
    isActive: boolean;
  };
  applicantQuality: {
    avgSkillsMatch: number; // percentage of required skills applicants have
    topApplicantSkills: { skill: string; count: number }[];
  };
  timeline: {
    publishedAt: Date;
    firstApplicationAt: Date | null;
    lastApplicationAt: Date | null;
    deadline: Date;
  };
}

export interface MentorProjectAnalytics {
  overview: {
    totalProjects: number;
    activeProjects: number;
    totalApplicationsReceived: number;
    avgApplicationsPerProject: number;
    avgAcceptanceRate: number;
    avgResponseTime: number; // hours
  };
  projects: ProjectPerformanceMetrics[];
  topSkillsRequested: { skill: string; projectCount: number }[];
  hiringFunnel: {
    applied: number;
    pending: number;
    underReview: number;
    accepted: number;
    rejected: number;
    conversionRate: number;
  };
}

// ===================================
// STUDENT ANALYTICS
// ===================================

export interface StudentApplicationAnalytics {
  overview: {
    totalApplications: number;
    pending: number;
    underReview: number;
    accepted: number;
    rejected: number;
    successRate: number; // acceptance rate
    avgResponseTime: number; // hours
  };
  recentApplications: Array<{
    projectId: string;
    projectTitle: string;
    status: string;
    appliedAt: Date;
    responseTime: number | null; // hours
    hashedback: boolean;
  }>;
  feedbackSummary: {
    totalFeedbackReceived: number;
    avgRating: number;
    commonStrengths: { strength: string; count: number }[];
    commonImprovements: { improvement: string; count: number }[];
  };
  skillsAnalysis: {
    yourSkills: string[];
    mostRequestedSkills: { skill: string; projectCount: number }[];
    skillGaps: string[]; // skills in demand but not in student's profile
    competitiveSkills: string[]; // student's skills that match many projects
  };
  performance: {
    applicationTrend: Array<{
      month: string; // YYYY-MM
      applied: number;
      accepted: number;
      rejected: number;
    }>;
    bestPerformingSkills: { skill: string; acceptanceRate: number }[];
  };
}

// ===================================
// APPLICATION FUNNEL ANALYTICS
// ===================================

export interface ApplicationFunnelMetrics {
  timeRange: TimeRange;
  funnel: {
    totalApplications: number;
    pending: number;
    underReview: number;
    accepted: number;
    rejected: number;
  };
  conversionRates: {
    pendingToReview: number; // percentage
    reviewToAccepted: number;
    reviewToRejected: number;
    overallAcceptance: number;
  };
  timeline: {
    avgTimeToFirstReview: number; // hours
    avgTimeToDecision: number; // hours
    fastestDecision: number; // hours
    slowestDecision: number; // hours
  };
  byProjectType: Array<{
    type: 'PROJECT' | 'INTERNSHIP';
    applications: number;
    acceptanceRate: number;
  }>;
  byDifficulty: Array<{
    level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    applications: number;
    acceptanceRate: number;
  }>;
}

// ===================================
// SKILL DEMAND ANALYTICS
// ===================================

export interface SkillDemandMetrics {
  timeRange: TimeRange;
  topSkills: Array<{
    skill: string;
    projectCount: number;
    applicationCount: number;
    avgAcceptanceRate: number;
    trend: 'rising' | 'stable' | 'falling';
  }>;
  emergingSkills: Array<{
    skill: string;
    recentProjectCount: number;
    growthRate: number; // percentage
  }>;
  byRole: {
    students: { skill: string; userCount: number }[];
    mentors: { skill: string; projectCount: number }[];
  };
  skillCombinations: Array<{
    skills: string[];
    projectCount: number;
    avgStipend: number | null;
  }>;
}

// ===================================
// ENGAGEMENT ANALYTICS
// ===================================

export interface EngagementMetrics {
  timeRange: TimeRange;
  userActivity: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    dau_mau_ratio: number; // stickiness metric
  };
  actions: {
    newUsers: number;
    newProjects: number;
    newApplications: number;
    feedbackGiven: number;
    projectsPublished: number;
  };
  retention: {
    weeklyRetention: number; // percentage of users returning week 2
    monthlyRetention: number; // percentage of users returning month 2
  };
  engagement_by_role: Array<{
    role: 'STUDENT' | 'MENTOR' | 'EMPLOYER';
    activeUsers: number;
    avgActionsPerUser: number;
    engagementRate: number; // active / total
  }>;
}

// ===================================
// FEEDBACK QUALITY ANALYTICS
// ===================================

export interface FeedbackQualityMetrics {
  overview: {
    totalFeedback: number;
    avgRating: number;
    publicFeedbackRate: number; // percentage
  };
  ratingDistribution: Array<{
    rating: number;
    count: number;
    percentage: number;
  }>;
  topMentors: Array<{
    mentorId: string;
    mentorName: string;
    feedbackGiven: number;
    avgRating: number;
  }>;
  commonStrengths: { strength: string; count: number }[];
  commonImprovements: { improvement: string; count: number }[];
  feedbackTrends: Array<{
    month: string;
    totalFeedback: number;
    avgRating: number;
  }>;
}

// ===================================
// RESPONSE TIME BENCHMARKS
// ===================================

export interface ResponseTimeBenchmarks {
  overall: {
    avgResponseTime: number; // hours
    medianResponseTime: number;
    p95ResponseTime: number; // 95th percentile
  };
  byRole: Array<{
    role: 'MENTOR' | 'EMPLOYER';
    avgResponseTime: number;
    count: number;
  }>;
  byProjectType: Array<{
    type: 'PROJECT' | 'INTERNSHIP';
    avgResponseTime: number;
    count: number;
  }>;
  fastestResponders: Array<{
    mentorId: string;
    mentorName: string;
    avgResponseTime: number;
    applicationCount: number;
  }>;
}

// ===================================
// REVENUE ANALYTICS (FUTURE)
// ===================================

export interface RevenueMetrics {
  timeRange: TimeRange;
  totalRevenue: number;
  mrr: number; // monthly recurring revenue
  arr: number; // annual recurring revenue
  byPlan: Array<{
    planName: string;
    subscribers: number;
    revenue: number;
  }>;
  churnRate: number;
  ltv: number; // lifetime value
}
