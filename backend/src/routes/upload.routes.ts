import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as uploadController from '../controllers/upload.controller.js';
import {
  uploadAvatar,
  uploadResume,
  handleMulterError,
} from '../middleware/upload.middleware.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// ===================================
// RATE LIMITERS
// ===================================

/**
 * Upload rate limiter
 * CRITICAL: Prevent abuse of cloud storage
 *
 * Limit: 10 uploads per 15 minutes per user
 */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many uploads. Please try again in 15 minutes.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Key by user ID for authenticated routes
  keyGenerator: (req) => req.user?.userId || req.ip || 'anonymous',
});

// ===================================
// UPLOAD ROUTES
// ===================================

/**
 * @route   POST /api/v1/upload/avatar
 * @desc    Upload user avatar (profile picture)
 * @access  Protected
 * @body    multipart/form-data with 'avatar' field
 * @limits  Max 5MB, image files only
 */
router.post(
  '/avatar',
  authenticate,
  uploadLimiter,
  uploadAvatar, // Multer middleware
  handleMulterError, // Error handler
  uploadController.uploadAvatar // Controller
);

/**
 * @route   POST /api/v1/upload/resume
 * @desc    Upload resume document
 * @access  Protected
 * @body    multipart/form-data with 'resume' field
 * @limits  Max 10MB, PDF/DOC/DOCX only
 */
router.post(
  '/resume',
  authenticate,
  uploadLimiter,
  uploadResume, // Multer middleware
  handleMulterError, // Error handler
  uploadController.uploadResume // Controller
);

/**
 * @route   DELETE /api/v1/upload/avatar
 * @desc    Delete user avatar
 * @access  Protected
 */
router.delete(
  '/avatar',
  authenticate,
  uploadLimiter,
  uploadController.deleteAvatar
);

export default router;
