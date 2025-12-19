import { Router } from 'express';
import * as applicationController from '../controllers/application.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { canCreateProjects, isStudent } from '../middleware/authorize.js';

const router = Router();

/**
 * @route   GET /api/v1/applications
 * @desc    List all applications with filters
 * @access  Protected
 */
router.get('/', authenticate, applicationController.listApplications);

/**
 * @route   GET /api/v1/applications/my-applications
 * @desc    Get current user's applications
 * @access  Protected (Student only)
 */
router.get(
  '/my-applications',
  authenticate,
  isStudent,
  applicationController.getMyApplications
);

/**
 * @route   GET /api/v1/applications/:id
 * @desc    Get application by ID
 * @access  Protected
 */
router.get('/:id', authenticate, applicationController.getApplicationById);

/**
 * @route   POST /api/v1/applications
 * @desc    Create new application
 * @access  Protected (Student only)
 */
router.post(
  '/',
  authenticate,
  isStudent,
  applicationController.createApplication
);

/**
 * @route   PATCH /api/v1/applications/:id/status
 * @desc    Update application status
 * @access  Protected (Project owner only)
 */
router.patch(
  '/:id/status',
  authenticate,
  canCreateProjects,
  applicationController.updateApplicationStatus
);

export default router;
