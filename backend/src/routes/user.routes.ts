import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as userController from '../controllers/user.controller.js';
import { validateBody } from '../middleware/validate.js';
import { updateProfileSchema } from '../validators/user.validator.js';

const router = Router();

// All user routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/users/me
 * @desc    Get current user profile
 * @access  Protected
 */
router.get('/me', userController.getCurrentUserProfile);

/**
 * @route   PATCH /api/v1/users/me
 * @desc    Update current user profile
 * @access  Protected
 */
router.patch(
  '/me',
  validateBody(updateProfileSchema),
  userController.updateCurrentUserProfile
);

/**
 * @route   POST /api/v1/users/me/avatar
 * @desc    Upload profile picture
 * @access  Protected
 */
router.post('/me/avatar', userController.uploadAvatar);

export default router;
