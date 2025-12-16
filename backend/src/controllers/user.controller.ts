import type { Request, Response } from 'express';
import * as userService from '../services/user.service.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import type { UpdateProfileInput } from '../validators/user.validator.js';

/**
 * Get current user profile
 * GET /api/v1/users/me
 */
export const getCurrentUserProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const profile = await userService.getUserProfile(userId);

    ApiResponse.success(res, profile);
  }
);

/**
 * Update current user profile
 * PATCH /api/v1/users/me
 */
export const updateCurrentUserProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const data: UpdateProfileInput = req.body;

    const updatedProfile = await userService.updateUserProfile(userId, data);

    ApiResponse.success(res, updatedProfile);
  }
);

/**
 * Upload profile picture
 * POST /api/v1/users/me/avatar
 */
export const uploadAvatar = asyncHandler(
  async (req: Request, res: Response) => {
    // TODO: Implement file upload with multer later
    // For now, accept URL in body
    const userId = req.user!.userId;
    const { profilePictureUrl } = req.body;

    if (!profilePictureUrl) {
      ApiResponse.error(
        res,
        'Profile picture URL is required',
        400,
        'VALIDATION_ERROR'
      );
      return;
    }

    const updatedProfile = await userService.updateProfilePicture(
      userId,
      profilePictureUrl
    );

    ApiResponse.success(res, updatedProfile);
  }
);
