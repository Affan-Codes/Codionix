import { Router } from 'express';
import * as feedbackController from '../controllers/feedback.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { canCreateProjects, isStudent } from '../middleware/authorize.js';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../middleware/validate.js';
import {
  createFeedbackSchema,
  feedbackIdParamSchema,
  listFeedbackQuerySchema,
  updateFeedbackSchema,
} from '../validators/feedback.validator.js';

const router = Router();

/**
 * @route   GET /api/v1/feedback
 * @desc    List all feedback with filters
 * @access  Public (only shows public feedback unless authenticated)
 */
router.get(
  '/',
  validateQuery(listFeedbackQuerySchema),
  feedbackController.listFeedback
);

/**
 * @route   GET /api/v1/feedback/my-feedback
 * @desc    Get current user's feedback (student only)
 * @access  Protected (Student only)
 */
router.get(
  '/my-feedback',
  authenticate,
  isStudent,
  feedbackController.getMyFeedback
);

/**
 * @route   GET /api/v1/feedback/given
 * @desc    Get feedback given by mentor
 * @access  Protected (Mentor/Employer only)
 */
router.get(
  '/given',
  authenticate,
  canCreateProjects,
  feedbackController.getFeedbackByMentor
);

/**
 * @route   GET /api/v1/feedback/application/:applicationId
 * @desc    Get feedback for a specific application
 * @access  Protected (Student who applied or project owner)
 */
router.get(
  '/application/:applicationId',
  authenticate,
  feedbackController.getFeedbackForApplication
);

/**
 * @route   GET /api/v1/feedback/:id
 * @desc    Get feedback by ID
 * @access  Public/Protected (public feedback or involved parties)
 */
router.get(
  '/:id',
  validateParams(feedbackIdParamSchema),
  feedbackController.getFeedbackById
);

/**
 * @route   POST /api/v1/feedback
 * @desc    Create new feedback
 * @access  Protected (Mentor/Employer only)
 */
router.post(
  '/',
  authenticate,
  canCreateProjects,
  validateBody(createFeedbackSchema),
  feedbackController.createFeedback
);

/**
 * @route   PATCH /api/v1/feedback/:id
 * @desc    Update feedback
 * @access  Protected (Mentor who created it)
 */
router.patch(
  '/:id',
  authenticate,
  canCreateProjects,
  validateParams(feedbackIdParamSchema),
  validateBody(updateFeedbackSchema),
  feedbackController.updateFeedback
);

/**
 * @route   DELETE /api/v1/feedback/:id
 * @desc    Delete feedback
 * @access  Protected (Mentor who created it)
 */
router.delete(
  '/:id',
  authenticate,
  canCreateProjects,
  validateParams(feedbackIdParamSchema),
  feedbackController.deleteFeedback
);

export default router;
