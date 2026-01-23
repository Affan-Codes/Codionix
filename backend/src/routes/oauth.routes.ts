/**
 * OAuth Routes
 */

import { Router } from 'express';
import * as oauthController from '../controllers/oauth.controller.js';
import { validateBody } from '../middleware/validate.js';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

const router = Router();

// ===================================
// VALIDATION SCHEMAS
// ===================================

const oauthInitSchema = z.object({
  provider: z.enum(['google', 'github'], {
    error: 'Provider must be google or github',
  }),
  role: z.enum(['STUDENT', 'MENTOR', 'EMPLOYER'], {
    error: 'Role must be STUDENT, MENTOR, or EMPLOYER',
  }),
});

// ===================================
// RATE LIMITERS
// ===================================

/**
 * OAuth init rate limiter
 * Prevent abuse of OAuth flow
 */
const oauthInitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 OAuth init attempts per 15 minutes
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many OAuth attempts. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * OAuth callback rate limiter
 * More lenient since callbacks are triggered by providers
 */
const oauthCallbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 callbacks per 15 minutes
  message: 'Too many OAuth callback attempts',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting if state is valid (legitimate callback)
    // This prevents blocking users during normal flow
    return !!req.query.state && !!req.query.code;
  },
});

// ===================================
// ROUTES
// ===================================

/**
 * @route   POST /api/v1/auth/oauth/init
 * @desc    Initialize OAuth flow (get authorization URL)
 * @access  Public
 * @body    { provider: 'google' | 'github', role: 'STUDENT' | 'MENTOR' | 'EMPLOYER' }
 */
router.post(
  '/init',
  oauthInitLimiter,
  validateBody(oauthInitSchema),
  oauthController.initOAuth
);

/**
 * @route   GET /api/v1/auth/google/callback
 * @desc    Google OAuth callback
 * @access  Public (called by Google)
 * @query   code, state
 */
router.get(
  '/google/callback',
  oauthCallbackLimiter,
  oauthController.googleCallback
);

/**
 * @route   GET /api/v1/auth/github/callback
 * @desc    GitHub OAuth callback
 * @access  Public (called by GitHub)
 * @query   code, state
 */
router.get(
  '/github/callback',
  oauthCallbackLimiter,
  oauthController.githubCallback
);

export default router;
