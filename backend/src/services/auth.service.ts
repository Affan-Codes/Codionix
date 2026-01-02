import { prisma } from '../config/database.js';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../utils/errors.js';
import {
  generateTokenPair,
  verifyRefreshToken,
  type JwtPayload,
  type TokenPair,
} from '../utils/jwt.js';
import { logExternalCall, logger, trackOperation } from '../utils/logger.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResendVerificationInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from '../validators/auth.validator.js';
import crypto from 'crypto';
import {
  sendEmailVerification,
  sendPasswordResetEmail,
} from './email.service.js';

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
  const tracker = trackOperation('auth.register', undefined, {
    email: data.email,
    role: data.role,
  });

  try {
    const { email, password, fullName, role } = data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      logger.warn('Registration attempted with existing email', {
        operation: 'auth.register',
        email,
        outcome: 'conflict',
      });
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate email verification token
    const verificationToken = generateSecureToken();
    const verificationExpiry = new Date();
    verificationExpiry.setHours(verificationExpiry.getHours() + 24); // 24 hours

    // Generate tokens BEFORE transaction
    const tokenPayload: JwtPayload = {
      userId: '', // Will be filled after user creation
      email,
      role,
    };

    // Atomic transaction for user + refresh token
    const result = await prisma.$transaction(async (tx) => {
      // Create User
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          fullName,
          role,
          skills: [],
          isEmailVerified: false,
          emailVerificationToken: verificationToken,
          emailVerificationExpiry: verificationExpiry,
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

      // Update token payload with real user ID
      tokenPayload.userId = user.id;

      // Generate token pair
      const tokens = generateTokenPair(tokenPayload);

      // Store refresh token in same transaction
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          token: tokens.refreshToken,
          expiresAt,
        },
      });

      return { user, tokens };
    });

    // Send email AFTER transaction, non-blocking
    const emailStart = Date.now();

    try {
      sendEmailVerification(result.user.email, verificationToken);
      logExternalCall(
        'email',
        'sendVerification',
        Date.now() - emailStart,
        true,
        {
          recipient: result.user.email,
          operation: 'auth.register',
        }
      );
    } catch (emailError) {
      // Log but don't fail registration
      logExternalCall(
        'email',
        'sendVerification',
        Date.now() - emailStart,
        false,
        {
          recipient: result.user.email,
          operation: 'auth.register',
          errorMessage:
            emailError instanceof Error ? emailError.message : 'Unknown error',
        }
      );
    }

    tracker.success({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      emailVerificationSent: true,
    });

    return result;
  } catch (error) {
    tracker.failure(error, {
      email: data.email,
      role: data.role,
    });
    throw error;
  }
};

/**
 * Login user
 */
export const login = async (data: LoginInput): Promise<AuthResponse> => {
  const tracker = trackOperation('auth.login', undefined, {
    email: data.email,
  });

  try {
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
      logger.warn('Login attempted with non-existent email', {
        operation: 'auth.login',
        email,
        outcome: 'unauthorized',
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    // Verify password
    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      logger.warn('Login attempted with invalid password', {
        operation: 'auth.login',
        userId: user.id,
        email,
        outcome: 'unauthorized',
      });
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

    tracker.success({
      userId: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.isEmailVerified,
    });

    return { user: userWithoutPassword, tokens };
  } catch (error) {
    tracker.failure(error, {
      email: data.email,
    });
    throw error;
  }
};

/**
 * Verify email with token
 * CRITICAL: Single-use token that expires after 24 hours
 */
export const verifyEmail = async (
  data: VerifyEmailInput
): Promise<{ message: string; email: string }> => {
  const tracker = trackOperation('auth.verifyEmail');

  try {
    const { token } = data;

    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      logger.warn('Email verification attempted with invalid token', {
        operation: 'auth.verifyEmail',
        outcome: 'unauthorized',
      });
      throw new UnauthorizedError('Invalid or expired verification token');
    }

    // Check if already verified
    if (user.isEmailVerified) {
      logger.warn('Email verification attempted for already verified user', {
        operation: 'auth.verifyEmail',
        userId: user.id,
        email: user.email,
        outcome: 'validation_error',
      });
      throw new ValidationError('Email already verified');
    }

    // Mark email as verified and clear token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    });

    tracker.success({
      userId: user.id,
      email: user.email,
    });

    return {
      message: 'Email verified successfully',
      email: user.email,
    };
  } catch (error) {
    tracker.failure(error);
    throw error;
  }
};

/**
 * Resend verification email
 */
export const resendVerificationEmail = async (
  data: ResendVerificationInput
): Promise<{ message: string }> => {
  const tracker = trackOperation('auth.resendVerification', undefined, {
    email: data.email,
  });

  try {
    const { email } = data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists
      tracker.warn('Resend attempted for non-existent email', { email });
      return {
        message: 'If an account exists, a verification email has been sent',
      };
    }

    // Check if already verified
    if (user.isEmailVerified) {
      logger.warn('Resend verification for already verified user', {
        operation: 'auth.resendVerification',
        userId: user.id,
        email,
      });
      throw new ValidationError('Email already verified');
    }

    // Generate new verification token
    const verificationToken = generateSecureToken();
    const verificationExpiry = new Date();
    verificationExpiry.setHours(verificationExpiry.getHours() + 24);

    // Update user with new token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
      },
    });

    // Non-blocking email send
    const emailStart = Date.now();

    try {
      sendEmailVerification(user.email, verificationToken);
      logExternalCall(
        'email',
        'sendVerification',
        Date.now() - emailStart,
        true,
        {
          recipient: user.email,
          operation: 'auth.resendVerification',
        }
      );
    } catch (emailError) {
      logExternalCall(
        'email',
        'sendVerification',
        Date.now() - emailStart,
        false,
        {
          recipient: user.email,
          operation: 'auth.resendVerification',
          errorMessage:
            emailError instanceof Error ? emailError.message : 'Unknown error',
        }
      );
    }

    tracker.success({
      userId: user.id,
      email: user.email,
    });

    return {
      message: 'If an account exists, a verification email has been sent',
    };
  } catch (error) {
    tracker.failure(error, { email: data.email });
    throw error;
  }
};

/**
 * Refresh access token
 */
export const refreshAccessToken = async (token: string): Promise<TokenPair> => {
  const tracker = trackOperation('auth.refreshToken');

  try {
    // Verify refresh token
    const payload = verifyRefreshToken(token);

    const result = await prisma.$transaction(async (tx) => {
      // Lock the row for update
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token },
      });

      if (!storedToken || storedToken.isRevoked) {
        logger.warn('Token refresh attempted with invalid token', {
          operation: 'auth.refreshToken',
          outcome: 'unauthorized',
        });
        throw new UnauthorizedError('Invalid refresh token');
      }

      if (storedToken.expiresAt < new Date()) {
        logger.warn('Token refresh attempted with expired token', {
          operation: 'auth.refreshToken',
          userId: storedToken.userId,
          outcome: 'unauthorized',
        });
        throw new UnauthorizedError('Refresh token expired');
      }

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, role: true },
      });

      if (!user) {
        logger.error('Token refresh for non-existent user', {
          operation: 'auth.refreshToken',
          userId: payload.userId,
          outcome: 'not_found',
        });
        throw new NotFoundError('User not found');
      }

      // Generate new tokens
      const tokenPayload: JwtPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      const newTokens = generateTokenPair(tokenPayload);

      // Revoke the old token
      await tx.refreshToken.update({
        where: { token },
        data: { isRevoked: true },
      });

      // Create new Token
      await tx.refreshToken.create({
        data: {
          userId: user.id,
          token: newTokens.refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return { newTokens, user };
    });

    tracker.success({
      userId: result.user.id,
      email: result.user.email,
    });

    return result.newTokens;
  } catch (error) {
    tracker.failure(error);
    throw error;
  }
};

/**
 * Logout user (revoke refresh token)
 */
export const logout = async (token: string): Promise<void> => {
  const tracker = trackOperation('auth.logout');

  try {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!storedToken) {
      logger.warn('Logout attempted with invalid token', {
        operation: 'auth.logout',
        outcome: 'unauthorized',
      });
      throw new UnauthorizedError('Invalid refresh token');
    }

    await prisma.refreshToken.update({
      where: { token },
      data: { isRevoked: true },
    });

    tracker.success({
      userId: storedToken.userId,
    });
  } catch (error) {
    tracker.failure(error);
    throw error;
  }
};

/**
 * Forgot password - send reset email
 */
export const forgotPassword = async (
  data: ForgotPasswordInput
): Promise<{ message: string }> => {
  const tracker = trackOperation('auth.forgotPassword', undefined, {
    email: data.email,
  });

  try {
    const { email } = data;

    const user = await prisma.user.findUnique({ where: { email } });

    // Don't reveal if email exists (security best practice)
    if (!user) {
      tracker.warn('Password reset for non-existent email', { email });
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

    // Non-blocking email send
    const emailStart = Date.now();
    try {
      sendPasswordResetEmail(user.email, resetToken);
      logExternalCall(
        'email',
        'sendPasswordReset',
        Date.now() - emailStart,
        true,
        {
          recipient: user.email,
          operation: 'auth.forgotPassword',
        }
      );
    } catch (emailError) {
      logExternalCall(
        'email',
        'sendPasswordReset',
        Date.now() - emailStart,
        false,
        {
          recipient: user.email,
          operation: 'auth.forgotPassword',
          errorMessage:
            emailError instanceof Error ? emailError.message : 'Unknown error',
        }
      );
    }

    tracker.success({ userId: user.id, email: user.email });

    return {
      message: 'If an account with that email exists, a reset link was sent.',
    };
  } catch (error) {
    tracker.failure(error, { email: data.email });
    throw error;
  }
};

/**
 * Reset password with token
 */
export const resetPassword = async (
  data: ResetPasswordInput
): Promise<{ message: string }> => {
  const tracker = trackOperation('auth.resetPassword');

  try {
    const { token, password } = data;

    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      logger.warn('Password reset attempted with invalid token', {
        operation: 'auth.resetPassword',
        outcome: 'unauthorized',
      });
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

    tracker.success({ userId: user.id, email: user.email });

    return { message: 'Password reset successful' };
  } catch (error) {
    tracker.failure(error);
    throw error;
  }
};

/**
 * Clean expired tokens (cron job helper)
 */
export const cleanupExpiredTokens = async (): Promise<number> => {
  const tracker = trackOperation('auth.cleanupTokens');

  try {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { isRevoked: true }],
      },
    });

    tracker.success({ tokensDeleted: result.count });

    return result.count;
  } catch (error) {
    tracker.failure(error);
    throw error;
  }
};
