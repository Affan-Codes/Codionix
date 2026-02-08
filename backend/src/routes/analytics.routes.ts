import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  isAdmin,
  canCreateProjects,
  isStudent,
} from '../middleware/authorize.js';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const router = Router();

// ===================================
// RATE LIMITERS
// ===================================

/**
 * Analytics endpoints can be expensive
 * Limit to prevent abuse
 */
const analyticsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 requests per 5 minutes
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many analytics requests. Please try again in 5 minutes.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip || ''),
});

// ===================================
// PUBLIC ROUTES (No auth required)
// ===================================

/**
 * @route   GET /api/v1/analytics/public/skill-demand
 * @desc    Public skill demand data (limited)
 * @access  Public
 */
router.get(
  '/public/skill-demand',
  analyticsLimiter,
  analyticsController.getPublicSkillDemand
);

/**
 * @route   GET /api/v1/analytics/public/response-time-benchmarks
 * @desc    Public response time benchmarks (anonymized)
 * @access  Public
 */
router.get(
  '/public/response-time-benchmarks',
  analyticsLimiter,
  analyticsController.getPublicResponseTimeBenchmarks
);

// ===================================
// ADMIN PLATFORM ANALYTICS
// ===================================

/**
 * @route   GET /api/v1/analytics/platform/overview
 * @desc    Complete platform overview metrics
 * @access  Protected (ADMIN only)
 */
router.get(
  '/platform/overview',
  authenticate,
  isAdmin,
  analyticsLimiter,
  analyticsController.getPlatformOverview
);

/**
 * @route   GET /api/v1/analytics/platform/user-growth
 * @desc    User growth analytics over time
 * @access  Protected (ADMIN only)
 * @query   timeRange: 7d | 30d | 90d | all
 */
router.get(
  '/platform/user-growth',
  authenticate,
  isAdmin,
  analyticsLimiter,
  analyticsController.getUserGrowth
);

/**
 * @route   GET /api/v1/analytics/platform/engagement
 * @desc    Platform engagement metrics
 * @access  Protected (ADMIN only)
 * @query   timeRange: 7d | 30d | 90d | all
 */
router.get(
  '/platform/engagement',
  authenticate,
  isAdmin,
  analyticsLimiter,
  analyticsController.getEngagement
);

/**
 * @route   GET /api/v1/analytics/platform/application-funnel
 * @desc    Application funnel conversion metrics
 * @access  Protected (ADMIN only)
 * @query   timeRange: 7d | 30d | 90d | all
 */
router.get(
  '/platform/application-funnel',
  authenticate,
  isAdmin,
  analyticsLimiter,
  analyticsController.getApplicationFunnel
);

/**
 * @route   GET /api/v1/analytics/platform/skill-demand
 * @desc    Complete skill demand analytics (full data)
 * @access  Protected (ADMIN only)
 * @query   timeRange: 7d | 30d | 90d | all
 */
router.get(
  '/platform/skill-demand',
  authenticate,
  isAdmin,
  analyticsLimiter,
  analyticsController.getSkillDemand
);

/**
 * @route   GET /api/v1/analytics/platform/feedback-quality
 * @desc    Feedback quality and trends
 * @access  Protected (ADMIN only)
 */
router.get(
  '/platform/feedback-quality',
  authenticate,
  isAdmin,
  analyticsLimiter,
  analyticsController.getFeedbackQuality
);

/**
 * @route   GET /api/v1/analytics/platform/response-time-benchmarks
 * @desc    Complete response time benchmarks with mentor names
 * @access  Protected (ADMIN only)
 */
router.get(
  '/platform/response-time-benchmarks',
  authenticate,
  isAdmin,
  analyticsLimiter,
  analyticsController.getResponseTimeBenchmarks
);

// ===================================
// MENTOR/EMPLOYER ANALYTICS
// ===================================

/**
 * @route   GET /api/v1/analytics/mentor/projects
 * @desc    Mentor's project performance analytics
 * @access  Protected (MENTOR/EMPLOYER only, own data)
 */
router.get(
  '/mentor/projects',
  authenticate,
  canCreateProjects,
  analyticsLimiter,
  analyticsController.getMentorProjects
);

// ===================================
// STUDENT ANALYTICS
// ===================================

/**
 * @route   GET /api/v1/analytics/student/applications
 * @desc    Student's application performance and insights
 * @access  Protected (STUDENT only, own data)
 */
router.get(
  '/student/applications',
  authenticate,
  isStudent,
  analyticsLimiter,
  analyticsController.getStudentApplications
);

export default router;
