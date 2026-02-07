import { env } from '../config/env.js';
import { logger } from './logger.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { OAuthRegisterState, OAuthState } from '../types/oauth.types.js';

const STATE_EXPIRY_SECONDS = Math.floor(env.OAUTH_STATE_EXPIRY_MS / 1000);
const STATE_SECRET = env.JWT_REFRESH_SECRET;

/**
 * Generate cryptographically secure nonce
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 *  Create signed JWT containing OAuth state
 */
export async function storeOAuthState(
  state: Omit<OAuthState, 'createdAt' | 'expiresAt' | 'nonce'>
): Promise<string> {
  const nonce = generateNonce();
  const now = Math.floor(Date.now() / 1000); // Unix timestamp

  let fullState: OAuthState;

  if (state.flow === 'login') {
    fullState = {
      provider: state.provider,
      flow: 'login',
      nonce,
      codeVerifier: state.codeVerifier,
      createdAt: now * 1000,
      expiresAt: now * 1000 + env.OAUTH_STATE_EXPIRY_MS,
    };
  } else {
    const registerState = state as Omit<
      OAuthRegisterState,
      'createdAt' | 'expiresAt' | 'nonce'
    >;

    fullState = {
      provider: registerState.provider,
      flow: 'register',
      role: registerState.role,
      nonce,
      codeVerifier: registerState.codeVerifier,
      createdAt: now * 1000,
      expiresAt: now * 1000 + env.OAUTH_STATE_EXPIRY_MS,
    };
  }

  try {
    // Sign state as JWT
    const token = jwt.sign(fullState, STATE_SECRET, {
      expiresIn: STATE_EXPIRY_SECONDS,
      issuer: 'codionix-oauth',
      audience: 'oauth-callback',
    });

    logger.debug('OAuth state created (stateless)', {
      provider: state.provider,
      flow: state.flow,
      hasPkceVerifier: !!state.codeVerifier,
      ttl: `${STATE_EXPIRY_SECONDS}s`,
      operation: 'oauth.storeState',
    });

    return token;
  } catch (error) {
    logger.error('Failed to create OAuth state JWT', {
      error: error instanceof Error ? error.message : 'Unknown',
      operation: 'oauth.storeState',
    });
    throw new Error('Failed to create OAuth state');
  }
}

/**
 * Verify and decode OAuth state from JWT
 */
export async function consumeOAuthState(
  token: string
): Promise<OAuthState | null> {
  try {
    // Verify JWT signature and expiration
    const decoded = jwt.verify(token, STATE_SECRET, {
      issuer: 'codionix-oauth',
      audience: 'oauth-callback',
    }) as OAuthState;

    // Double-check expiration (defense in depth)
    if (decoded.expiresAt < Date.now()) {
      logger.warn('OAuth state expired (timestamp check)', {
        provider: decoded.provider,
        ageMs: Date.now() - decoded.createdAt,
        operation: 'oauth.consumeState',
        outcome: 'expired',
      });
      return null;
    }

    logger.debug('OAuth state consumed (stateless)', {
      provider: decoded.provider,
      flow: decoded.flow,
      hasPkceVerifier: !!decoded.codeVerifier,
      ageMs: Date.now() - decoded.createdAt,
      operation: 'oauth.consumeState',
    });

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('OAuth state JWT expired', {
        operation: 'oauth.consumeState',
        outcome: 'expired',
      });
      return null;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid OAuth state JWT', {
        error: error.message,
        operation: 'oauth.consumeState',
        outcome: 'invalid',
      });
      return null;
    }

    logger.error('Failed to verify OAuth state JWT', {
      error: error instanceof Error ? error.message : 'Unknown',
      operation: 'oauth.consumeState',
    });
    return null;
  }
}
