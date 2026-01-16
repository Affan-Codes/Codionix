import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import * as uploadService from '../services/upload.service.js';
import * as userService from '../services/user.service.js';
import { ValidationError } from '../utils/errors.js';
import { prisma } from '../config/database.js';

/**
 * Upload avatar
 * POST /api/v1/upload/avatar
 */
export const uploadAvatar = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    // Check if file exists
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    // Check if Cloudinary is configured
    if (!uploadService.isCloudinaryConfigured()) {
      throw new ValidationError(
        'File upload service not configured. Please contact support.'
      );
    }

    // Get current user to extract old avatar public ID
    const user = await userService.getUserProfile(userId);
    const oldPublicId = user.profilePictureUrl
      ? uploadService.extractPublicIdFromUrl(user.profilePictureUrl)
      : undefined;

    // Upload to Cloudinary (and delete old if exists)
    const uploadResult = await uploadService.replaceFile(
      req.file,
      userId,
      'avatar',
      oldPublicId || undefined
    );

    // Update user profile with new avatar URL
    const updatedUser = await userService.updateProfilePicture(
      userId,
      uploadResult.url
    );

    ApiResponse.success(res, {
      message: 'Avatar uploaded successfully',
      user: updatedUser,
      upload: {
        url: uploadResult.url,
        format: uploadResult.format,
        width: uploadResult.width,
        height: uploadResult.height,
      },
    });
  }
);

/**
 * Upload resume
 * POST /api/v1/upload/resume
 */
export const uploadResume = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    // Check if file exists
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    // Check if Cloudinary is configured
    if (!uploadService.isCloudinaryConfigured()) {
      throw new ValidationError(
        'File upload service not configured. Please contact support.'
      );
    }

    // Upload to Cloudinary
    const uploadResult = await uploadService.uploadFile(
      req.file,
      userId,
      'resume'
    );

    // NOTE: Resume URL is stored per-application, not on user profile
    // This endpoint just uploads and returns the URL for the frontend to use

    ApiResponse.success(res, {
      message: 'Resume uploaded successfully',
      upload: {
        url: uploadResult.url,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
      },
    });
  }
);

/**
 * Delete avatar
 * DELETE /api/v1/upload/avatar
 */
export const deleteAvatar = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    // Get current user
    const user = await userService.getUserProfile(userId);

    if (!user.profilePictureUrl) {
      throw new ValidationError('No avatar to delete');
    }

    // Extract public ID
    const publicId = uploadService.extractPublicIdFromUrl(
      user.profilePictureUrl
    );

    if (publicId) {
      // Delete from Cloudinary (fire and forget - don't block on failure)
      uploadService.deleteFile(publicId, 'avatar').catch(() => {
        // Silent fail - we'll remove from DB anyway
      });
    }

    // Remove from user profile
    await prisma.user.update({
      where: { id: userId },
      data: { profilePictureUrl: null },
    });

    ApiResponse.success(res, {
      message: 'Avatar deleted successfully',
    });
  }
);
