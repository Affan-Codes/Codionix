import { Router } from 'express';
import * as projectController from '../controllers/project.controller.js';
import * as applicationController from '../controllers/application.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { canCreateProjects } from '../middleware/authorize.js';

const router = Router();

/**
 * @route   GET /api/v1/projects
 * @desc    List all projects with filters
 * @access  Public
 */
router.get('/', projectController.listProjects);

/**
 * @route   GET /api/v1/projects/my-projects
 * @desc    Get current user's projects
 * @access  Protected (Mentor/Employer)
 */
router.get(
  '/my-projects',
  authenticate,
  canCreateProjects,
  projectController.getMyProjects
);

/**
 * @route   GET /api/v1/projects/:id
 * @desc    Get project by ID
 * @access  Public
 */
router.get('/:id', projectController.getProjectById);

/**
 * @route   GET /api/v1/projects/:id/applications
 * @desc    Get project's applications
 * @access  Protected (Project owner only)
 */
router.get(
  '/:id/applications',
  authenticate,
  canCreateProjects,
  applicationController.getProjectApplications
);

/**
 * @route   POST /api/v1/projects
 * @desc    Create new project
 * @access  Protected (Mentor/Employer only)
 */
router.post(
  '/',
  authenticate,
  canCreateProjects,
  projectController.createProject
);

/**
 * @route   PATCH /api/v1/projects/:id
 * @desc    Update project
 * @access  Protected (Owner only)
 */
router.patch(
  '/:id',
  authenticate,
  canCreateProjects,
  projectController.updateProject
);

/**
 * @route   DELETE /api/v1/projects/:id
 * @desc    Delete project
 * @access  Protected (Owner only)
 */
router.delete(
  '/:id',
  authenticate,
  canCreateProjects,
  projectController.deleteProject
);

export default router;
