/**
 * OAuth Controllers
 */

import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import * as oauthService from '../services/oauth.service.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type {
  OAuthLoginInitInput,
  OAuthRegisterInitInput,
} from '../validators/oauth.validator.js';

interface OAuthCallbackQuery {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

/**
 * Initialize OAuth LOGIN flow
 * POST /api/v1/auth/oauth/login/init
 */
export const initOAuthLogin = asyncHandler(
  async (req: Request, res: Response) => {
    const { provider } = req.body as OAuthLoginInitInput;

    const result = await oauthService.initializeOAuthLogin({ provider });

    ApiResponse.success(res, result);
  }
);
/**
 * Initialize OAuth REGISTER flow
 * POST /api/v1/auth/oauth/register/init
 */
export const initOAuthRegister = asyncHandler(
  async (req: Request, res: Response) => {
    const { provider, role } = req.body as OAuthRegisterInitInput;

    const result = await oauthService.initializeOAuthRegister({
      provider,
      role,
    });

    ApiResponse.success(res, result);
  }
);

/**
 * Handle Google OAuth callback
 * GET /api/v1/auth/google/callback
 */
export const googleCallback = asyncHandler(
  async (req: Request, res: Response) => {
    const { code, state, error, error_description } =
      req.query as OAuthCallbackQuery;

    // Check for OAuth errors from Google
    if (error) {
      logger.warn('Google OAuth error', {
        error,
        description: error_description,
        operation: 'oauth.googleCallback',
      });

      // Redirect to frontend with error
      const errorUrl = `${env.FRONTEND_URL}/auth/oauth/error?provider=google&error=${encodeURIComponent(error)}`;
      return res.redirect(errorUrl);
    }

    // Validate required parameters
    if (!code || !state) {
      logger.error('Missing code or state in Google callback', {
        hasCode: !!code,
        hasState: !!state,
        operation: 'oauth.googleCallback',
      });

      const errorUrl = `${env.FRONTEND_URL}/auth/oauth/error?provider=google&error=missing_parameters`;
      return res.redirect(errorUrl);
    }

    try {
      const { tokens } = await oauthService.handleOAuthCallback(
        'google',
        code,
        state
      );

      // Redirect to frontend with tokens
      // SECURITY: Tokens in URL fragment (not sent to server, not logged)
      const successUrl = `${env.FRONTEND_URL}/auth/oauth/success#access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}`;

      res.redirect(successUrl);
    } catch (error) {
      logger.error('Google OAuth callback failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        operation: 'oauth.googleCallback',
      });

      const errorUrl = `${env.FRONTEND_URL}/auth/oauth/error?provider=google&error=callback_failed`;
      res.redirect(errorUrl);
    }
  }
);

/**
 * Handle GitHub OAuth callback
 * GET /api/v1/auth/github/callback
 */
export const githubCallback = asyncHandler(
  async (req: Request, res: Response) => {
    const { code, state, error, error_description } =
      req.query as OAuthCallbackQuery;

    // Check for OAuth errors from GitHub
    if (error) {
      logger.warn('GitHub OAuth error', {
        error,
        description: error_description,
        operation: 'oauth.githubCallback',
      });

      const errorUrl = `${env.FRONTEND_URL}/auth/oauth/error?provider=github&error=${encodeURIComponent(error)}`;
      return res.redirect(errorUrl);
    }

    // Validate required parameters
    if (!code || !state) {
      logger.error('Missing code or state in GitHub callback', {
        hasCode: !!code,
        hasState: !!state,
        operation: 'oauth.githubCallback',
      });

      const errorUrl = `${env.FRONTEND_URL}/auth/oauth/error?provider=github&error=missing_parameters`;
      return res.redirect(errorUrl);
    }

    try {
      const { tokens } = await oauthService.handleOAuthCallback(
        'github',
        code,
        state
      );

      // Redirect to frontend with tokens
      const successUrl = `${env.FRONTEND_URL}/auth/oauth/success#access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}`;

      res.redirect(successUrl);
    } catch (error) {
      logger.error('GitHub OAuth callback failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        operation: 'oauth.githubCallback',
      });

      const errorUrl = `${env.FRONTEND_URL}/auth/oauth/error?provider=github&error=callback_failed`;
      res.redirect(errorUrl);
    }
  }
);
