import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as authService from '../services/auth.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import type {
  LoginInput,
  LogoutInput,
  RefreshTokenInput,
  RegisterInput,
} from '../validators/auth.validator.js';

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const data: RegisterInput = req.body;
  const result = await authService.register(data);
  ApiResponse.created(res, result);
});

/**
 * Login user
 * POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const data: LoginInput = req.body;
  const result = await authService.login(data);
  ApiResponse.success(res, result);
});

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken }: RefreshTokenInput = req.body;
  const tokens = await authService.refreshAccessToken(refreshToken);
  ApiResponse.success(res, tokens);
});

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken }: LogoutInput = req.body;
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
