import { Router } from 'express';
import * as oauthController from '../controllers/oauth.controller.js';
import { validateBody } from '../middleware/validate.js';
import rateLimit from 'express-rate-limit';
import {
  oauthLoginInitSchema,
  oauthRegisterInitSchema,
} from '../validators/oauth.validator.js';

const router = Router();

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
 * @route   POST /api/v1/auth/oauth/login/init
 * @desc    Initialize OAuth LOGIN flow (existing users only)
 * @access  Public
 */
router.post(
  '/oauth/login/init',
  oauthInitLimiter,
  validateBody(oauthLoginInitSchema),
  oauthController.initOAuthLogin
);

/**
 * @route   POST /api/v1/auth/oauth/register/init
 * @desc    Initialize OAuth REGISTER flow (new users only)
 * @access  Public
 */
router.post(
  '/oauth/register/init',
  oauthInitLimiter,
  validateBody(oauthRegisterInitSchema),
  oauthController.initOAuthRegister
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

// I think there are some flaws in authentication doc, as it doesn't state what will happen a person login using oauth as there's no email registered , so it created the user and naturally the user will be stuck as student role forever. So analyze the database make changes in the services for any loop hole that will cause future problems then enhance the authentication doc by analyzing the code and comments from our codebase thoroughly with better info. So that our frontend team doesn't get hold back. Don't assume everything. Fact check it. Also don't give frontend implementation examples and all. Just state flow and what it should. Don't make the authentication doc too lengthy, only necessary things and what frontend team  can ask. Also i have this summary you can take reference from it suggest on your own by thinking through. Don't blindly follow what frontend team says. Take your time understanding it and implement what's necessary with your own critical thinking:
