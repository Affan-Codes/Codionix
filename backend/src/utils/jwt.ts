import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from './errors.js';
import crypto from 'crypto';

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: string;
  fingerprint?: string;
}

export interface RefreshTokenPayload {
  userId: string;
  email: string;
  role: string;
  jti: string;
  fingerprint?: string;
  tokenVersion?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenJti: string;
}

export interface DeviceFingerprint {
  ipHash: string;
  userAgentHash: string;
  combined: string;
}

/**
 * Generate unique JWT ID
 */
function generateJti(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Create device fingerprint from request metadata
 * Used to bind tokens to specific devices
 */
export function createDeviceFingerprint(
  ip: string,
  userAgent: string
): DeviceFingerprint {
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
  const uaHash = crypto.createHash('sha256').update(userAgent).digest('hex');
  const combined = crypto
    .createHash('sha256')
    .update(ipHash + uaHash)
    .digest('hex');

  return {
    ipHash,
    userAgentHash: uaHash,
    combined,
  };
}

/**
 * Verify device fingerprint matches token
 */
export function verifyDeviceFingerprint(
  tokenFingerprint: string,
  currentFingerprint: DeviceFingerprint
): boolean {
  return crypto.timingSafeEqual(
    Buffer.from(tokenFingerprint),
    Buffer.from(currentFingerprint.combined)
  );
}

/**
 * Generate access token (short-lived)
 */
export const generateAccessToken = (
  payload: AccessTokenPayload,
  fingerprint?: DeviceFingerprint
): string => {
  const tokenPayload: AccessTokenPayload = {
    ...payload,
    ...(fingerprint && { fingerprint: fingerprint.combined }),
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
  payload: Omit<RefreshTokenPayload, 'jti'>,
  fingerprint?: DeviceFingerprint,
  tokenVersion: number = 1
): { token: string; jti: string } => {
  const jti = generateJti();

  const tokenPayload: RefreshTokenPayload = {
    ...payload,
    jti,
    tokenVersion,
    ...(fingerprint && { fingerprint: fingerprint.combined }),
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
  payload: AccessTokenPayload,
  fingerprint?: DeviceFingerprint,
  tokenVersion: number = 1
): TokenPair => {
  const accessToken = generateAccessToken(payload, fingerprint);
  const refreshTokenData = generateRefreshToken(
    payload,
    fingerprint,
    tokenVersion
  );

  return {
    accessToken,
    refreshToken: refreshTokenData.token,
    refreshTokenJti: refreshTokenData.jti,
  };
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    const decoded = jwt.verify(
      token,
      env.JWT_ACCESS_SECRET
    ) as AccessTokenPayload;
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
export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  try {
    const decoded = jwt.verify(
      token,
      env.JWT_REFRESH_SECRET
    ) as RefreshTokenPayload;
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
export const decodeToken = (
  token: string
): AccessTokenPayload | RefreshTokenPayload | null => {
  try {
    return jwt.decode(token) as AccessTokenPayload | RefreshTokenPayload;
  } catch {
    return null;
  }
};
