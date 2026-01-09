import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import projectRoutes from './project.routes.js';
import applicationRoutes from './application.routes.js';
import feedbackRoutes from './feedback.routes.js';
import healthRoutes from './health.routes.js';

const router = Router();

/**
 * Mount all API routes
 */
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/projects', projectRoutes);
router.use('/applications', applicationRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/health', healthRoutes);

export default router;
