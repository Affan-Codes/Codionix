import { env } from './env.js';
import type { CookieOptions } from 'express';

export interface CookieType {
  type: 'refresh' | 'access' | 'csrf';
}

/**
 * Get standardized cookie options
 * Ensures consistency across auth, CSRF, and utility modules
 */
export function getCookieOptions(
  cookieType: 'refresh' | 'access' | 'csrf'
): CookieOptions {
  const baseOptions: CookieOptions = {
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none',
    domain: env.COOKIE_DOMAIN,
    path: '/',
  };

  switch (cookieType) {
    case 'refresh':
      return {
        ...baseOptions,
        httpOnly: true,
        maxAge: env.COOKIE_MAX_AGE,
        signed: true,
      };

    case 'access':
      return {
        ...baseOptions,
        httpOnly: true,
        maxAge: 15 * 60 * 1000,
        signed: true,
      };

    case 'csrf':
      return {
        ...baseOptions,
        httpOnly: false,
        maxAge: 24 * 60 * 60 * 1000,
        signed: false,
      };

    default:
      throw new Error(`Unknown cookie type: ${cookieType}`);
  }
}

/**
 * Get options for clearing cookies
 * Used during logout
 */
export function getClearCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none',
    domain: env.COOKIE_DOMAIN,
    path: '/',
  };
}
