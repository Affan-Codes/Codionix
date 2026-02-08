import { Router } from 'express';
import { validateBody } from '../middleware/validate.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validators/auth.validator.js';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import oauthRoutes from './oauth.routes.js';
import { csrfProtection } from '../middleware/csrf.middleware.js';

const router = Router();

// ===================================
// RATE LIMITERS
// ===================================

/**
 * Strict rate limiting for email verification endpoints
 */
const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 3,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message:
        'Too many verification attempts. Please try again in 15 minutes.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip || ''),
});

/**
 * Standard rate limiting for auth endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message:
        'Too many authentication attempts. Please try again in 15 minutes.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip || ''),
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 refreshes per 15 minutes (2 per minute average)
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many token refresh attempts. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ipKey = ipKeyGenerator(req.ip || '');
    const cookieFingerprint = req.signedCookies?.refresh_token
      ? req.signedCookies.refresh_token.substring(0, 16)
      : 'anonymous';
    return `${ipKey}:${cookieFingerprint}`;
  },
});

// ===================================
// OAUTH ROUTES (MOUNTED FIRST)
// ===================================

/**
 * Mount OAuth routes
 * Includes: /login/init, /register/init, /google/callback, /github/callback
 */
router.use(oauthRoutes);

// ===================================
// PUBLIC ROUTES
// ===================================

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user (sends verification email)
 * @access  Public
 * @csrf    Not required (no prior session exists)
 */
router.post(
  '/register',
  authLimiter,
  validateBody(registerSchema),
  authController.register
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 * @csrf    Not required (no prior session exists)
 */
router.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  authController.login
);

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify email with token
 * @access  Public
 * @csrf    Not required (token-based verification)
 */
router.post(
  '/verify-email',
  verificationLimiter,
  validateBody(verifyEmailSchema),
  authController.verifyEmail
);

/**
 * @route   POST /api/v1/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public
 * @csrf    Not required (email-based flow)
 */
router.post(
  '/resend-verification',
  verificationLimiter,
  validateBody(resendVerificationSchema),
  authController.resendVerification
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public (but requires valid refresh token in cookie)
 * @csrf    Protected (prevents CSRF-based token theft)
 */
router.post(
  '/refresh',
  refreshLimiter,
  csrfProtection,
  authController.refreshToken
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (revoke refresh token)
 * @access  Public (but requires refresh token in cookie)
 * @csrf    Protected (prevents CSRF-based logout attacks)
 */
router.post('/logout', csrfProtection, authController.logout);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 * @csrf    Not required (email-based flow)
 */
router.post(
  '/forgot-password',
  authLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 * @csrf    Not required (token-based reset)
 */
router.post(
  '/reset-password',
  authLimiter,
  validateBody(resetPasswordSchema),
  authController.resetPassword
);

// ===================================
// PROTECTED ROUTES
// ===================================

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user
 * @access  Protected
 * @csrf    Not required (read-only operation)
 */
router.get('/me', authenticate, authController.getCurrentUser);

export default router;
