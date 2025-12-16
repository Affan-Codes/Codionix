import { prisma } from '../config/database.js';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors.js';
import {
  generateTokenPair,
  verifyRefreshToken,
  type JwtPayload,
  type TokenPair,
} from '../utils/jwt.js';
import { logger } from '../utils/logger.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import type { LoginInput, RegisterInput } from '../validators/auth.validator.js';

// ===================================
// TYPES
// ===================================

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    isEmailVerified: boolean;
    profilePictureUrl: string | null;
    createdAt: Date;
  };
  tokens: TokenPair;
}

// ===================================
// SERVICE FUNCTIONS
// ===================================

/**
 * Register a new user
 */
export const register = async (data: RegisterInput): Promise<AuthResponse> => {
  const { email, password, fullName, role } = data;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName,
      role,
      skills: [],
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isEmailVerified: true,
      profilePictureUrl: true,
      createdAt: true,
    },
  });

  // Generate tokens
  const tokenPayload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const tokens = generateTokenPair(tokenPayload);

  // Store refresh token
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt,
    },
  });

  logger.info(`User registered: ${user.email}`);

  return {
    user,
    tokens,
  };
};

/**
 * Login user
 */
export const login = async (data: LoginInput): Promise<AuthResponse> => {
  const { email, password } = data;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      fullName: true,
      role: true,
      isEmailVerified: true,
      profilePictureUrl: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Verify password
  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Generate tokens
  const tokenPayload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const tokens = generateTokenPair(tokenPayload);

  // Store refresh token
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt,
    },
  });

  const { passwordHash, ...userWithoutPassword } = user;

  logger.info(`User logged in: ${user.email}`);

  return { user: userWithoutPassword, tokens };
};

/**
 * Refresh access token
 */
export const refreshAccessToken = async (token: string): Promise<TokenPair> => {
  // Verify refresh token
  const payload = verifyRefreshToken(token);

  // Check database
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token },
  });

  if (!storedToken || storedToken.isRevoked) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  if (storedToken.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token expired');
  }

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Generate new tokens
  const tokenPayload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const newTokens = generateTokenPair(tokenPayload);

  // Token rotation: revoke old, create new
  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { token },
      data: { isRevoked: true },
    }),
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: newTokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  logger.info(`Token refreshed: ${user.email}`);

  return newTokens;
};

/**
 * Logout user (revoke refresh token)
 */
export const logout = async (token: string): Promise<void> => {
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token },
  });

  if (!storedToken) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  await prisma.refreshToken.update({
    where: { token },
    data: { isRevoked: true },
  });

  logger.info(`User logged out: ${storedToken.userId}`);
};

/**
 * Clean expired tokens (cron job helper)
 */
export const cleanupExpiredTokens = async (): Promise<number> => {
  const result = await prisma.refreshToken.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: new Date() } }, { isRevoked: true }],
    },
  });

  logger.info(`Cleaned ${result.count} expired tokens`);
  return result.count;
};
