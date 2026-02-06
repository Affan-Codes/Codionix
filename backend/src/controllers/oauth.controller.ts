import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import * as oauthService from '../services/oauth.service.js';
import { setAuthCookies } from '../utils/cookieUtils.js';
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
import { issueCsrfToken } from '../middleware/csrf.middleware.js';

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
      // Handle callback and get tokens
      const { user, tokens } = await oauthService.handleOAuthCallback(
        'google',
        code,
        state
      );

      logger.info('Google OAuth callback successful', {
        userId: user.id,
        email: user.email,
        operation: 'oauth.googleCallback',
      });

      // Set httpOnly cookies
      setAuthCookies(res, tokens);

      // Issue CSRF token for subsequent requests
      issueCsrfToken(res);

      // Redirect to frontend (cookies are already set)
      const successUrl = `${env.FRONTEND_URL}/auth/oauth/callback`;
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
      // Handle callback and get tokens
      const { user, tokens } = await oauthService.handleOAuthCallback(
        'github',
        code,
        state
      );

      logger.info('GitHub OAuth callback successful', {
        userId: user.id,
        email: user.email,
        operation: 'oauth.githubCallback',
      });

      // Set httpOnly cookies
      setAuthCookies(res, tokens);

      // Issue CSRF token for subsequent requests
      issueCsrfToken(res);

      // Redirect to frontend (cookies are already set)
      const successUrl = `${env.FRONTEND_URL}/auth/oauth/callback`;
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
  if (error instanceof NotFoundError) {
    return 'account_not_found';
  }

  if (error instanceof ConflictError) {
    return 'account_exists';
  }

  if (error instanceof UnauthorizedError) {
    const message = error.message.toLowerCase();

    if (message.includes('state') || message.includes('expired')) {
      return 'state_expired';
    }

    if (message.includes('email') && message.includes('verified')) {
      return 'email_not_verified';
    }

    if (message.includes('token')) {
      return 'invalid_token';
    }

    if (
      message.includes('fetch') ||
      message.includes('failed') ||
      message.includes('invalid response')
    ) {
      return 'provider_error';
    }

    return 'unauthorized';
  }

  if (error instanceof Error) {
    logger.error('Unmapped OAuth error type', {
      errorType: error.constructor.name,
      errorMessage: error.message,
      operation: 'oauth.errorMapping',
    });
  }

  return 'internal_error';
}
