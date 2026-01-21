/**
 * Metrics Routes
 *
 * CRITICAL: Prometheus endpoint must be public (no auth)
 * JSON endpoints are admin-only
 */

import { Router } from 'express';
import * as metricsController from '../controllers/metrics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { isAdmin } from '../middleware/authorize.js';

const router = Router();

/**
 * @route   GET /api/v1/metrics/prometheus
 * @desc    Prometheus-formatted metrics (scrape endpoint)
 * @access  Public (Prometheus scraper needs no auth)
 *
 * CRITICAL: This endpoint MUST remain public for Prometheus to scrape
 * If you need auth, configure Prometheus basic auth instead
 */
router.get('/prometheus', metricsController.getPrometheus);

/**
 * @route   GET /api/v1/metrics
 * @desc    JSON metrics snapshot
 * @access  Protected (ADMIN only)
 */
router.get('/', authenticate, isAdmin, metricsController.getMetrics);

/**
 * @route   GET /api/v1/metrics/health-summary
 * @desc    Simplified health summary for dashboards
 * @access  Protected (ADMIN only)
 */
router.get(
  '/health-summary',
  authenticate,
  isAdmin,
  metricsController.getHealthSummary
);

export default router;
