import type { Response } from 'express';
import { env } from '../config/env.js';

const COOKIE_NAMES = {
  REFRESH_TOKEN: 'refresh_token',
  ACCESS_TOKEN: 'access_token',
} as const;

/**
 * Set refresh token cookie (httpOnly, long-lived)
 */
export function setRefreshTokenCookie(
  res: Response,
  refreshToken: string
): void {
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN,
    path: '/',
    maxAge: env.COOKIE_MAX_AGE,
    signed: true,
  });
}

/**
 * Set access token cookie (httpOnly, short-lived)
 */
export function setAccessTokenCookie(res: Response, accessToken: string): void {
  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN,
    path: '/',
    maxAge: 15 * 60 * 1000, // 15 minutes
    signed: true,
  });
}

/**
 * Set both tokens at once
 */
export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string }
): void {
  setAccessTokenCookie(res, tokens.accessToken);
  setRefreshTokenCookie(res, tokens.refreshToken);
}

/**
 * Clear all auth cookies (logout)
 */
export function clearAuthCookies(res: Response): void {
  const cookieOptions = {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none',
    domain: env.COOKIE_DOMAIN,
    path: '/',
  };

  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, cookieOptions);
  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, cookieOptions);
}

/**
 * Get refresh token from signed cookies
 */
export function getRefreshTokenFromCookies(
  signedCookies: Record<string, string>
): string | null {
  return signedCookies[COOKIE_NAMES.REFRESH_TOKEN] || null;
}

/**
 * Get access token from signed cookies
 */
export function getAccessTokenFromCookies(
  signedCookies: Record<string, string>
): string | null {
  return signedCookies[COOKIE_NAMES.ACCESS_TOKEN] || null;
}
