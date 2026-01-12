import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import * as analyticsService from '../services/analytics.service.js';
import type { TimeRange } from '../types/analytics.types.js';

/**
 * GET /api/v1/analytics/platform/overview
 * Platform overview metrics (ADMIN only)
 */
export const getPlatformOverview = asyncHandler(
  async (_req: Request, res: Response) => {
    const metrics = await analyticsService.getPlatformOverview();
    ApiResponse.success(res, metrics);
  }
);

/**
 * GET /api/v1/analytics/platform/user-growth
 * User growth analytics (ADMIN only)
 */
export const getUserGrowth = asyncHandler(
  async (req: Request, res: Response) => {
    const timeRange = (req.query.timeRange as TimeRange) || '30d';
    const metrics = await analyticsService.getUserGrowthAnalytics(timeRange);
    ApiResponse.success(res, metrics);
  }
);

/**
 * GET /api/v1/analytics/platform/engagement
 * Platform engagement metrics (ADMIN only)
 */
export const getEngagement = asyncHandler(
  async (req: Request, res: Response) => {
    const timeRange = (req.query.timeRange as TimeRange) || '30d';
    const metrics = await analyticsService.getEngagementMetrics(timeRange);
    ApiResponse.success(res, metrics);
  }
);

/**
 * GET /api/v1/analytics/platform/application-funnel
 * Application funnel analytics (ADMIN only)
 */
export const getApplicationFunnel = asyncHandler(
  async (req: Request, res: Response) => {
    const timeRange = (req.query.timeRange as TimeRange) || '30d';
    const metrics =
      await analyticsService.getApplicationFunnelMetrics(timeRange);
    ApiResponse.success(res, metrics);
  }
);

/**
 * GET /api/v1/analytics/platform/skill-demand
 * Skill demand analytics (ADMIN only)
 */
export const getSkillDemand = asyncHandler(
  async (req: Request, res: Response) => {
    const timeRange = (req.query.timeRange as TimeRange) || '30d';
    const metrics = await analyticsService.getSkillDemandMetrics(timeRange);
    ApiResponse.success(res, metrics);
  }
);

/**
 * GET /api/v1/analytics/platform/feedback-quality
 * Feedback quality analytics (ADMIN only)
 */
export const getFeedbackQuality = asyncHandler(
  async (_req: Request, res: Response) => {
    const metrics = await analyticsService.getFeedbackQualityMetrics();
    ApiResponse.success(res, metrics);
  }
);

/**
 * GET /api/v1/analytics/platform/response-time-benchmarks
 * Response time benchmarks (ADMIN only)
 */
export const getResponseTimeBenchmarks = asyncHandler(
  async (_req: Request, res: Response) => {
    const metrics = await analyticsService.getResponseTimeBenchmarks();
    ApiResponse.success(res, metrics);
  }
);

/**
 * GET /api/v1/analytics/mentor/projects
 * Mentor project analytics (MENTOR/EMPLOYER only, own data)
 */
export const getMentorProjects = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const metrics = await analyticsService.getMentorProjectAnalytics(userId);
    ApiResponse.success(res, metrics);
  }
);

/**
 * GET /api/v1/analytics/student/applications
 * Student application analytics (STUDENT only, own data)
 */
export const getStudentApplications = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const metrics =
      await analyticsService.getStudentApplicationAnalytics(userId);
    ApiResponse.success(res, metrics);
  }
);

/**
 * GET /api/v1/analytics/public/skill-demand
 * Public skill demand data (anyone can access)
 */
export const getPublicSkillDemand = asyncHandler(
  async (req: Request, res: Response) => {
    const timeRange = (req.query.timeRange as TimeRange) || '30d';
    const metrics = await analyticsService.getSkillDemandMetrics(timeRange);

    // Return limited public data
    ApiResponse.success(res, {
      timeRange: metrics.timeRange,
      topSkills: metrics.topSkills.slice(0, 10),
      emergingSkills: metrics.emergingSkills.slice(0, 5),
    });
  }
);

/**
 * GET /api/v1/analytics/public/response-time-benchmarks
 * Public response time benchmarks (anyone can access)
 */
export const getPublicResponseTimeBenchmarks = asyncHandler(
  async (_req: Request, res: Response) => {
    const metrics = await analyticsService.getResponseTimeBenchmarks();

    // Return anonymized public data
    ApiResponse.success(res, {
      overall: metrics.overall,
      byRole: metrics.byRole,
      byProjectType: metrics.byProjectType,
      // Exclude individual mentor names
    });
  }
);
