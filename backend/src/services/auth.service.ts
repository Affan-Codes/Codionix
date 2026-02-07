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
  type DeviceFingerprint,
  type TokenPair,
} from '../utils/jwt.js';
import { logger, trackOperation } from '../utils/logger.js';
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
  sendEmailVerificationNotification,
  sendPasswordResetNotification,
  sendWelcomeNotification,
} from './notification.service.js';
import {
  detectTokenReuse,
  isTokenRevoked,
  revokeToken,
  verifyTokenFingerprint,
} from './tokenRevocation.service.js';

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

const generateSecureToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// ===================================
// SERVICE FUNCTIONS
// ===================================

/**
 * Register a new user
 */
export const register = async (
  data: RegisterInput,
  fingerprint?: DeviceFingerprint
): Promise<AuthResponse> => {
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

    // Atomic transaction
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

      // Generate token pair with device fingerprint
      const tokens = generateTokenPair(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        fingerprint
      );

      // Store refresh token (JTI only) with fingerprint
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          jti: tokens.refreshTokenJti,
          fingerprint: fingerprint?.combined || null,
          expiresAt,
          isRevoked: false,
        },
      });

      return { user, tokens };
    });

    // Send verification email (after transaction commits)
    sendEmailVerificationNotification(result.user.email, verificationToken);

    tracker.success({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      verificationEmailQueued: true,
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
export const login = async (
  data: LoginInput,
  fingerprint?: DeviceFingerprint
): Promise<AuthResponse> => {
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
        googleId: true,
        githubId: true,
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

    // Check if this is an OAuth-only account
    if (!user.passwordHash) {
      const oauthProviders = [];
      if (user.googleId) oauthProviders.push('Google');
      if (user.githubId) oauthProviders.push('GitHub');

      logger.warn('Login attempted on OAuth-only account', {
        operation: 'auth.login',
        userId: user.id,
        email,
        providers: oauthProviders,
        outcome: 'unauthorized',
      });

      throw new UnauthorizedError(
        `This account uses ${oauthProviders.join(' or ')} login. Please sign in with ${oauthProviders[0]}.`
      );
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

    // Atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // Generate tokens with device fingerprint
      const tokens = generateTokenPair(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        fingerprint
      );

      // Store refresh token (JTI only) with fingerprint
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          jti: tokens.refreshTokenJti,
          fingerprint: fingerprint?.combined || null,
          expiresAt,
          isRevoked: false,
        },
      });

      return tokens;
    });

    const { passwordHash, ...userWithoutPassword } = user;

    tracker.success({
      userId: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.isEmailVerified,
    });

    return { user: userWithoutPassword, tokens: result };
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

    // Send welcome email
    sendWelcomeNotification(user.id);

    tracker.success({
      userId: user.id,
      email: user.email,
      welcomeEmailQueued: true,
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

    // Send verification email
    sendEmailVerificationNotification(user.email, verificationToken);

    tracker.success({
      userId: user.id,
      email: user.email,
      verificationEmailQueued: true,
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
export const refreshAccessToken = async (
  token: string,
  fingerprint?: DeviceFingerprint
): Promise<TokenPair> => {
  const tracker = trackOperation('auth.refreshToken');

  try {
    // Verify refresh token
    const payload = verifyRefreshToken(token);

    // Check for token reuse (theft detection)
    const isReused = await detectTokenReuse(payload.jti, payload.userId);

    if (isReused) {
      logger.error('🚨 TOKEN THEFT DETECTED - All user tokens revoked', {
        userId: payload.userId,
        email: payload.email,
        jti: payload.jti,
        operation: 'auth.refreshToken',
        severity: 'critical',
      });

      throw new UnauthorizedError(
        'Token reuse detected. All sessions have been revoked. Please log in again.'
      );
    }

    // Check if token is revoked
    const revoked = await isTokenRevoked(payload.jti);

    if (revoked) {
      logger.warn('Token refresh attempted with revoked token', {
        operation: 'auth.refreshToken',
        jti: payload.jti,
        outcome: 'unauthorized',
      });
      throw new UnauthorizedError('Refresh token has been revoked');
    }

    // Verify device fingerprint
    if (fingerprint && payload.fingerprint) {
      const fingerprintValid = await verifyTokenFingerprint(
        payload.jti,
        fingerprint.combined
      );

      if (!fingerprintValid) {
        logger.error(
          'Token fingerprint mismatch - possible session hijacking',
          {
            userId: payload.userId,
            jti: payload.jti,
            operation: 'auth.refreshToken',
            severity: 'high',
          }
        );

        throw new UnauthorizedError(
          'Device fingerprint mismatch. Please log in again.'
        );
      }
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

    // ATOMIC TOKEN ROTATION
    const result = await prisma.$transaction(async (tx) => {
      // Revoke old token
      await tx.refreshToken.updateMany({
        where: { jti: payload.jti },
        data: { isRevoked: true },
      });

      // Generate new tokens
      const newTokens = generateTokenPair(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        fingerprint
      );

      // Store new refresh token (JTI only) with fingerprint
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          jti: newTokens.refreshTokenJti,
          fingerprint: fingerprint?.combined || null,
          expiresAt,
          isRevoked: false,
        },
      });

      return newTokens;
    });

    tracker.success({
      userId: user.id,
      email: user.email,
    });

    return result;
  } catch (error) {
    tracker.failure(error);
    throw error;
  }
};

/**
 * Logout user (revoke refresh token)
 */
export const logout = async (refreshToken: string): Promise<void> => {
  const tracker = trackOperation('auth.logout');

  try {
    // Verify token to get JTI
    const payload = verifyRefreshToken(refreshToken);
    // Revoke token
    await revokeToken(payload.jti);

    tracker.success({
      userId: payload.userId,
      jti: payload.jti,
    });
  } catch (error) {
    // Log but don't throw - logout should always succeed
    logger.warn('Logout attempted with invalid token', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
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

    // Send password reset email using new notification system
    sendPasswordResetNotification(user.email, resetToken);

    tracker.success({
      userId: user.id,
      email: user.email,
      resetEmailQueued: true,
    });

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
