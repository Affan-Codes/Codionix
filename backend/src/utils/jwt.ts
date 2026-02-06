import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from './errors.js';
import crypto from 'crypto';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  jti: string;
  tokenVersion?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenId: string;
}

/**
 * Generate unique JWT ID
 */
function generateJti(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate access token (short-lived)
 */
export const generateAccessToken = (
  payload: Omit<JwtPayload, 'jti'>
): string => {
  const tokenPayload: JwtPayload = {
    ...payload,
    jti: generateJti(),
  };

  // @ts-ignore - jsonwebtoken types have issues with newer TypeScript
  return jwt.sign(tokenPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  });
};

/**
 * Generate refresh token (long-lived)
 */
export const generateRefreshToken = (
  payload: Omit<JwtPayload, 'jti'>,
  tokenVersion: number = 1
): { token: string; jti: string } => {
  const jti = generateJti();

  const tokenPayload: JwtPayload = {
    ...payload,
    jti,
    tokenVersion,
  };

  // @ts-ignore - jsonwebtoken types have issues with newer TypeScript
  const token = jwt.sign(tokenPayload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY,
  });

  return { token, jti };
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (
  payload: Omit<JwtPayload, 'jti' | 'tokenVersion'>,
  tokenVersion: number = 1
): TokenPair => {
  const accessToken = generateAccessToken(payload);
  const refreshTokenData = generateRefreshToken(payload, tokenVersion);

  return {
    accessToken,
    refreshToken: refreshTokenData.token,
    refreshTokenId: refreshTokenData.jti,
  };
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Access token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid access token');
    }
    throw new UnauthorizedError('Token verification failed');
  }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Refresh token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid refresh token');
    }
    throw new UnauthorizedError('Token verification failed');
  }
};

/**
 * Decode token without verification (for debugging)
 */
export const decodeToken = (token: string): JwtPayload | null => {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
};
