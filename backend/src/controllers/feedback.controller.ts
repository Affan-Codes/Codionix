import type { Request, Response } from 'express';
import * as feedbackService from '../services/feedback.service.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  createFeedbackSchema,
  feedbackIdParamSchema,
  listFeedbackQuerySchema,
  updateFeedbackSchema,
} from '../validators/feedback.validator.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ForbiddenError } from '../utils/errors.js';

/**
 * Create new feedback
 * POST /api/v1/feedback
 */
export const createFeedback = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const data = createFeedbackSchema.parse(req.body);

    const feedback = await feedbackService.createFeedback(userId, data);

    ApiResponse.created(res, feedback);
  }
);

/**
 * List all feedback with filters
 * GET /api/v1/feedback
 */
export const listFeedback = asyncHandler(
  async (req: Request, res: Response) => {
    const query = listFeedbackQuerySchema.parse(req.query);

    const result = await feedbackService.listFeedback(query);

    ApiResponse.success(res, result);
  }
);

/**
 * Get feedback by ID
 * GET /api/v1/feedback/:id
 */
export const getFeedbackById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = feedbackIdParamSchema.parse(req.params);
    const userId = req.user?.userId;

    const feedback = await feedbackService.getFeedbackById(id, userId);

    ApiResponse.success(res, feedback);
  }
);

/**
 * Update feedback
 * PATCH /api/v1/feedback/:id
 */
export const updateFeedback = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = feedbackIdParamSchema.parse(req.params);
    const userId = req.user!.userId;
    const data = updateFeedbackSchema.parse(req.body);

    const feedback = await feedbackService.updateFeedback(id, userId, data);

    ApiResponse.success(res, feedback);
  }
);

/**
 * Delete feedback
 * DELETE /api/v1/feedback/:id
 */
export const deleteFeedback = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = feedbackIdParamSchema.parse(req.params);
    const userId = req.user!.userId;

    await feedbackService.deleteFeedback(id, userId);

    ApiResponse.success(res, { message: 'Feedback deleted successfully' });
  }
);

/**
 * Get current user's feedback (student view)
 * GET /api/v1/feedback/my-feedback
 */
export const getMyFeedback = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const feedback = await feedbackService.getMyFeedback(userId);

    ApiResponse.success(res, feedback);
  }
);

/**
 * Get feedback by mentor (mentor view)
 * GET /api/v1/feedback/given
 */
export const getFeedbackByMentor = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const feedback = await feedbackService.getFeedbackByMentor(userId);

    ApiResponse.success(res, feedback);
  }
);

/**
 * Get feedback for an application
 * GET /api/v1/feedback/application/:applicationId
 */
export const getFeedbackForApplication = asyncHandler(
  async (req: Request, res: Response) => {
    const { applicationId } = req.params;
    const userId = req.user!.userId;

    if (!applicationId) {
      throw new ForbiddenError('applicationId is required');
    }

    const feedback = await feedbackService.getFeedbackForApplication(
      applicationId,
      userId
    );

    ApiResponse.success(res, feedback);
  }
);
