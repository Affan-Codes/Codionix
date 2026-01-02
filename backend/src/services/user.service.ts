import { prisma } from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';
import { trackOperation } from '../utils/logger.js';
import type { UpdateProfileInput } from '../validators/user.validator.js';

// ===================================
// RESPONSE TYPES
// ===================================

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  phone: string | null;
  bio: string | null;
  profilePictureUrl: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  skills: string[];
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===================================
// SERVICE FUNCTIONS
// ===================================

/**
 * Get user profile by ID
 */
export const getUserProfile = async (userId: string): Promise<UserProfile> => {
  const tracker = trackOperation('user.getProfile', undefined, {
    userId,
  });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        bio: true,
        profilePictureUrl: true,
        linkedinUrl: true,
        githubUrl: true,
        skills: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      tracker.failure(new NotFoundError('User not found'), { userId });
      throw new NotFoundError('User not found');
    }

    tracker.success({
      userId: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.isEmailVerified,
    });

    return user;
  } catch (error) {
    if (!(error instanceof NotFoundError)) {
      tracker.failure(error, { userId });
    }
    throw error;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: string,
  data: UpdateProfileInput
): Promise<UserProfile> => {
  const tracker = trackOperation('user.updateProfile', undefined, {
    userId,
    fieldsUpdated: Object.keys(data).length,
  });

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      tracker.failure(new NotFoundError('User not found'), { userId });
      throw new NotFoundError('User not found');
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        bio: true,
        profilePictureUrl: true,
        linkedinUrl: true,
        githubUrl: true,
        skills: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    tracker.success({
      userId: updatedUser.id,
      email: updatedUser.email,
      fieldsUpdated: Object.keys(data),
      skillsCount: updatedUser.skills.length,
    });

    return updatedUser;
  } catch (error) {
    if (!(error instanceof NotFoundError)) {
      tracker.failure(error, { userId });
    }
    throw error;
  }
};

/**
 * Update profile picture URL
 */
export const updateProfilePicture = async (
  userId: string,
  profilePictureUrl: string
): Promise<UserProfile> => {
  const tracker = trackOperation('user.updateProfilePicture', undefined, {
    userId,
  });

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { profilePictureUrl },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        bio: true,
        profilePictureUrl: true,
        linkedinUrl: true,
        githubUrl: true,
        skills: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    tracker.success({
      userId: updatedUser.id,
      email: updatedUser.email,
      hasProfilePicture: !!profilePictureUrl,
    });

    return updatedUser;
  } catch (error) {
    tracker.failure(error, { userId });
    throw error;
  }
};
