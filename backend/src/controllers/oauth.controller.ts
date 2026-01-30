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
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors.js';

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

      // Map Google errors to our error codes
      const errorCode = mapProviderErrorToCode(error);
      const errorUrl = `${env.FRONTEND_URL}/auth/oauth/error?provider=google&error=${errorCode}`;
      return res.redirect(errorUrl);
    }

    // Validate required parameters
    if (!code || !state) {
      logger.error('Missing code or state in Google callback', {
        hasCode: !!code,
        hasState: !!state,
        operation: 'oauth.googleCallback',
      });

      const errorUrl = `${env.FRONTEND_URL}/auth/oauth/error?provider=google&error=invalid_request`;
      return res.redirect(errorUrl);
    }

    try {
      const { tokens } = await oauthService.handleOAuthCallback(
        'google',
        code,
        state
      );

      // Redirect to frontend with tokens
      const successUrl = `${env.FRONTEND_URL}/auth/oauth/success#access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}`;

      res.redirect(successUrl);
    } catch (error) {
      logger.error('Google OAuth callback failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error?.constructor.name,
        operation: 'oauth.googleCallback',
      });

      // Map application errors to specific error codes
      const errorCode = mapApplicationErrorToCode(error);
      const errorUrl = `${env.FRONTEND_URL}/auth/oauth/error?provider=google&error=${errorCode}`;
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

      const errorCode = mapProviderErrorToCode(error);
      const errorUrl = `${env.FRONTEND_URL}/auth/oauth/error?provider=github&error=${errorCode}`;
      return res.redirect(errorUrl);
    }

    // Validate required parameters
    if (!code || !state) {
      logger.error('Missing code or state in GitHub callback', {
        hasCode: !!code,
        hasState: !!state,
        operation: 'oauth.githubCallback',
      });

      const errorUrl = `${env.FRONTEND_URL}/auth/oauth/error?provider=github&error=invalid_request`;
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
        errorType: error?.constructor.name,
        operation: 'oauth.githubCallback',
      });

      const errorCode = mapApplicationErrorToCode(error);
      const errorUrl = `${env.FRONTEND_URL}/auth/oauth/error?provider=github&error=${errorCode}`;
      res.redirect(errorUrl);
    }
  }
);

/**
 * Map provider OAuth errors to our error codes
 */
function mapProviderErrorToCode(providerError: string): string {
  const errorMap: Record<string, string> = {
    access_denied: 'access_denied',
    unauthorized_client: 'unauthorized_client',
    invalid_scope: 'invalid_scope',
    server_error: 'provider_error',
    temporarily_unavailable: 'provider_unavailable',
  };

  return errorMap[providerError] || 'provider_error';
}

/**
 * Map application errors to specific error codes
 */
function mapApplicationErrorToCode(error: unknown): string {
  // Account doesn't exist - user needs to register
  if (error instanceof NotFoundError) {
    return 'account_not_found';
  }

  // Account already exists - user needs to login
  if (error instanceof ConflictError) {
    return 'account_exists';
  }

  // Authorization errors - check message for specifics
  if (error instanceof UnauthorizedError) {
    const message = error.message.toLowerCase();

    // OAuth state expired or invalid
    if (message.includes('state') || message.includes('expired')) {
      return 'state_expired';
    }

    // Email not verified at provider
    if (message.includes('email') && message.includes('verified')) {
      return 'email_not_verified';
    }

    // Invalid token from provider
    if (message.includes('token')) {
      return 'invalid_token';
    }

    // Generic unauthorized
    // Provider or profile fetch failures should be surfaced as provider errors
    if (
      message.includes('fetch') ||
      message.includes('failed') ||
      message.includes('invalid response')
    ) {
      return 'provider_error';
    }

    return 'unauthorized';
  }

  // Unknown error - log for investigation
  if (error instanceof Error) {
    logger.error('Unmapped OAuth error type', {
      errorType: error.constructor.name,
      errorMessage: error.message,
      operation: 'oauth.errorMapping',
    });
  }

  return 'internal_error';
}
