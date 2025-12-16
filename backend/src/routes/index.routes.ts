import { Router } from 'express';
import authRoutes from './auth.routes.js';

const router = Router();

/**
 * Mount all API routes
 */
router.use('/auth', authRoutes);

export default router;
