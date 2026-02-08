import type { Response, Request } from 'express';
import { getClearCookieOptions, getCookieOptions } from '../config/cookie.js';

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
  res.cookie(
    COOKIE_NAMES.REFRESH_TOKEN,
    refreshToken,
    getCookieOptions('refresh')
  );
}

/**
 * Set access token cookie (httpOnly, short-lived)
 */
export function setAccessTokenCookie(res: Response, accessToken: string): void {
  res.cookie(
    COOKIE_NAMES.ACCESS_TOKEN,
    accessToken,
    getCookieOptions('access')
  );
}

/**
 * Set both auth cookies at once
 */
export function setAuthCookies(
  res: Response,
  tokens: {
    accessToken: string;
    refreshToken: string;
  }
): void {
  setAccessTokenCookie(res, tokens.accessToken);
  setRefreshTokenCookie(res, tokens.refreshToken);
}

/**
 * Clear all auth cookies (logout)
 */
export function clearAuthCookies(res: Response): void {
  const clearOptions = getClearCookieOptions();

  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, clearOptions);
  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, clearOptions);
}

/**
 * Get refresh token from signed cookies
 */
export function getRefreshTokenFromCookies(req: Request): string | null {
  return req.signedCookies?.[COOKIE_NAMES.REFRESH_TOKEN] || null;
}

/**
 * Get access token from signed cookies
 */
export function getAccessTokenFromCookies(req: Request): string | null {
  return req.signedCookies?.[COOKIE_NAMES.ACCESS_TOKEN] || null;
}
