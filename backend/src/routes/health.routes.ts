import { Router } from 'express';
import * as healthController from '../controllers/health.controller.js';

const router = Router();

/**
 * Health check routes
 *
 * CRITICAL: These routes have NO rate limiting
 * Load balancers must be able to check health at any frequency
 *
 * CRITICAL: These routes have NO authentication
 * Must be publicly accessible for load balancers
 */

/**
 * @route   GET /health
 * @desc    Liveness check - is process alive?
 * @access  Public
 * @usage   Load balancer health checks (every 2-5 seconds)
 */
router.get('/', healthController.getLiveness);

/**
 * @route   GET /health/ready
 * @desc    Readiness check - can instance serve traffic?
 * @access  Public
 * @usage   Kubernetes readiness probe, deployment systems
 */
router.get('/ready', healthController.getReadiness);

/**
 * @route   GET /health/full
 * @desc    Full diagnostic check with verbose details
 * @access  Public
 * @usage   Manual debugging, monitoring dashboards
 */
router.get('/full', healthController.getFullHealth);

export default router;
