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
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '../validators/auth.validator.js';
import crypto from 'crypto';
import { sendPasswordResetEmail } from './email.service.js';

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
// HELPER FUNCTIONS
// ===================================

/**
 * Generate secure random token
 */
const generateSecureToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

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
 * Forgot password - send reset email
 */
export const forgotPassword = async (
  data: ForgotPasswordInput
): Promise<{ message: string }> => {
  const { email } = data;

  const user = await prisma.user.findUnique({ where: { email } });

  // Don't reveal if email exists (security best practice)
  if (!user) {
    logger.warn(`Password reset requested for non-existent email: ${email}`);
    return {
      message: 'If an account with that email exists, a reset link was sent.',
    };
  }

  // Generate reset token
  const resetToken = generateSecureToken();
  const resetExpiry = new Date();
  resetExpiry.setHours(resetExpiry.getHours() + 1);

  // Store token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: resetToken,
      passwordResetExpiry: resetExpiry,
    },
  });

  // Send email
  await sendPasswordResetEmail(user.email, resetToken);

  logger.info(`Password reset email sent: ${user.email}`);

  return {
    message: 'If an account with that email exists, a reset link was sent.',
  };
};

/**
 * Reset password with token
 */
/**
 * Reset password with token
 */
export const resetPassword = async (
  data: ResetPasswordInput
): Promise<{ message: string }> => {
  const { token, password } = data;

  // Find user with valid token
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid or expired reset token');
  }

  // Hash new password
  const passwordHash = await hashPassword(password);

  // Update password and clear reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiry: null,
    },
  });

  logger.info(`Password reset successful: ${user.email}`);

  return { message: 'Password reset successful' };
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
