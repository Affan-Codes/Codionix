import { Router } from 'express';
import * as oauthController from '../controllers/oauth.controller.js';
import { validateBody } from '../middleware/validate.js';
import rateLimit from 'express-rate-limit';
import {
  exchangeAuthCodeSchema,
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

/**
 * Authorization code exchange rate limiter
 * CRITICAL: Prevent code replay attacks
 */
const exchangeCodeLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 5 exchange attempts per 5 minutes
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many token exchange attempts. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
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

/**
 * @route   POST /api/v1/auth/oauth/exchange
 * @desc    Exchange authorization code for JWT tokens
 * @access  Public
 * @body    { code: string }
 */
router.post(
  '/oauth/exchange',
  exchangeCodeLimiter,
  validateBody(exchangeAuthCodeSchema),
  oauthController.exchangeAuthCode
);

export default router;
