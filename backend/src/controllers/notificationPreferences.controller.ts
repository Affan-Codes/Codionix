import type { Request, Response } from 'express';
import * as notificationPreferencesService from '../services/notificationPreferences.service.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import type { UpdateNotificationPreferencesInput } from '../validators/notificationPreferences.validator.js';

/**
 * Get current user's notification preferences
 * GET /api/v1/users/me/notification-preferences
 */
export const getNotificationPreferences = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const preferences =
      await notificationPreferencesService.getNotificationPreferences(userId);

    ApiResponse.success(res, preferences);
  }
);

/**
 * Update current user's notification preferences
 * PATCH /api/v1/users/me/notification-preferences
 */
export const updateNotificationPreferences = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const data: UpdateNotificationPreferencesInput = req.body;

    const updatedPreferences =
      await notificationPreferencesService.updateNotificationPreferences(
        userId,
        data
      );

    ApiResponse.success(res, updatedPreferences);
  }
);
