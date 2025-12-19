import type { Request, Response } from 'express';
import * as applicationService from '../services/application.service.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  applicationIdParamSchema,
  createApplicationSchema,
  listApplicationsQuerySchema,
  projectIdParamSchema,
  updateApplicationStatusSchema,
} from '../validators/application.validator.js';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * Create new application
 * POST /api/v1/applications
 */
export const createApplication = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const data = createApplicationSchema.parse(req.body);

    const application = await applicationService.createApplication(
      userId,
      data
    );

    ApiResponse.created(res, application);
  }
);

/**
 * List all applications with filters
 * GET /api/v1/applications
 */
export const listApplications = asyncHandler(
  async (req: Request, res: Response) => {
    const query = listApplicationsQuerySchema.parse(req.query);

    const result = await applicationService.listApplications(query);

    ApiResponse.success(res, result);
  }
);

/**
 * Get application by ID
 * GET /api/v1/applications/:id
 */
export const getApplicationById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = applicationIdParamSchema.parse(req.params);

    const application = await applicationService.getApplicationById(id);

    ApiResponse.success(res, application);
  }
);

/**
 * Update application status
 * PATCH /api/v1/applications/:id/status
 */
export const updateApplicationStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = applicationIdParamSchema.parse(req.params);
    const userId = req.user!.userId;
    const data = updateApplicationStatusSchema.parse(req.body);

    const application = await applicationService.updateApplicationStatus(
      id,
      userId,
      data
    );

    ApiResponse.success(res, application);
  }
);

/**
 * Get current user's applications
 * GET /api/v1/applications/my-applications
 */
export const getMyApplications = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const applications = await applicationService.getMyApplications(userId);

    ApiResponse.success(res, applications);
  }
);

/**
 * Get project's applications
 * GET /api/v1/projects/:id/applications
 */
export const getProjectApplications = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = projectIdParamSchema.parse(req.params);
    const userId = req.user!.userId;

    const applications = await applicationService.getProjectApplications(
      id,
      userId
    );

    ApiResponse.success(res, applications);
  }
);
