// ===================================
// RESPONSE TYPES
// ===================================

import { prisma } from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type { UpdateProfileInput } from '../validators/user.validator.js';

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
    throw new NotFoundError('User not found');
  }

  return user;
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: string,
  data: UpdateProfileInput
): Promise<UserProfile> => {
  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
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

  logger.info(`User profile updated: ${updatedUser.email}`);

  return updatedUser;
};

/**
 * Update profile picture URL
 */
export const updateProfilePicture = async (
  userId: string,
  profilePictureUrl: string
): Promise<UserProfile> => {
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

  logger.info(`Profile picture updated for user: ${updatedUser.email}`);

  return updatedUser;
};
