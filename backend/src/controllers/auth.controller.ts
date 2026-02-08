import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as authService from '../services/auth.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResendVerificationInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from '../validators/auth.validator.js';
import {
  clearAuthCookies,
  getRefreshTokenFromCookies,
  setAuthCookies,
} from '../utils/cookieUtils.js';
import {
  clearCsrfToken,
  issueCsrfToken,
} from '../middleware/csrf.middleware.js';
import { getDeviceFingerprintFromRequest } from '../utils/fingerprint.js';

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const data: RegisterInput = req.body;
  const fingerprint = getDeviceFingerprintFromRequest(req);

  const result = await authService.register(data, fingerprint);

  setAuthCookies(res, result.tokens);
  issueCsrfToken(res);

  ApiResponse.created(res, {
    user: result.user,
    message: 'Registration successful. Please verify your email.',
  });
});

/**
 * Login user
 * POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const data: LoginInput = req.body;
  const fingerprint = getDeviceFingerprintFromRequest(req);

  const result = await authService.login(data, fingerprint);

  setAuthCookies(res, result.tokens);
  issueCsrfToken(res);

  ApiResponse.success(res, {
    user: result.user,
    message: 'Login successful',
  });
});

/**
 * Verify email with token
 * POST /api/v1/auth/verify-email
 */
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const data: VerifyEmailInput = req.body;
  const result = await authService.verifyEmail(data);
  ApiResponse.success(res, result);
});

/**
 * Resend verification email
 * POST /api/v1/auth/resend-verification
 */
export const resendVerification = asyncHandler(
  async (req: Request, res: Response) => {
    const data: ResendVerificationInput = req.body;
    const result = await authService.resendVerificationEmail(data);
    ApiResponse.success(res, result);
  }
);

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
export const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    const refreshToken = getRefreshTokenFromCookies(req);

    if (!refreshToken) {
      ApiResponse.error(res, 'Refresh token required', 401, 'UNAUTHORIZED');
      return;
    }

    const fingerprint = getDeviceFingerprintFromRequest(req);
    const tokens = await authService.refreshAccessToken(
      refreshToken,
      fingerprint
    );

    setAuthCookies(res, tokens);

    ApiResponse.success(res, {
      message: 'Token refreshed successfully',
    });
  }
);

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = getRefreshTokenFromCookies(req);

  clearAuthCookies(res);
  clearCsrfToken(res);

  if (!refreshToken) {
    ApiResponse.success(res, { message: 'Logged out successfully' });
    return;
  }

  await authService.logout(refreshToken);

  ApiResponse.success(res, { message: 'Logged out successfully' });
});

/**
 * Get current user
 * GET /api/v1/auth/me
 */
export const getCurrentUser = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      ApiResponse.error(res, 'User not authenticated', 401, 'UNAUTHORIZED');
      return;
    }

    ApiResponse.success(res, {
      userId: req.user.userId,
      email: req.user.email,
      role: req.user.role,
    });
  }
);

/**
 * Forgot password - send reset email
 * POST /api/v1/auth/forgot-password
 */
export const forgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const data: ForgotPasswordInput = req.body;
    const result = await authService.forgotPassword(data);
    ApiResponse.success(res, result);
  }
);

/**
 * Reset password with token
 * POST /api/v1/auth/reset-password
 */
export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const data: ResetPasswordInput = req.body;
    const result = await authService.resetPassword(data);
    ApiResponse.success(res, result);
  }
);
