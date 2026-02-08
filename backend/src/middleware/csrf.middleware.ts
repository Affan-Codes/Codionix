import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors.js';
import crypto from 'crypto';
import { getClearCookieOptions, getCookieOptions } from '../config/cookie.js';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate cryptographically secure CSRF token
 */
function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Set CSRF token cookie
 */
export function setCsrfTokenCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE_NAME, token, getCookieOptions('csrf'));
}

/**
 * Generate and set CSRF token
 * Call this when user logs in
 */
export function issueCsrfToken(res: Response): string {
  const token = generateCsrfToken();
  setCsrfTokenCookie(res, token);
  return token;
}

/**
 * Clear CSRF token cookie
 * Call this when user logs out
 */
export function clearCsrfToken(res: Response): void {
  res.clearCookie(CSRF_COOKIE_NAME, getClearCookieOptions());
}

/**
 * CSRF Protection Middleware
 */
export const csrfProtection = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF if no user session (not authenticated)
  if (!req.signedCookies?.access_token && !req.signedCookies?.refresh_token) {
    return next();
  }

  // Get CSRF token from cookie
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];

  // Get CSRF token from header
  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

  // Both must exist
  if (!cookieToken || !headerToken) {
    throw new UnauthorizedError('CSRF token missing');
  }

  // Both must match (constant-time comparison to prevent timing attacks)
  if (
    !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))
  ) {
    throw new UnauthorizedError('CSRF token mismatch');
  }

  next();
};

/**
 * Optional CSRF middleware that doesn't throw
 * Sets req.csrfValid = true/false instead
 */
export const optionalCsrfProtection = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

  if (!cookieToken || !headerToken) {
    (req as any).csrfValid = false;
    return next();
  }

  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(headerToken)
    );
    (req as any).csrfValid = isValid;
  } catch {
    (req as any).csrfValid = false;
  }

  next();
};
