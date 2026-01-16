import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// ===================================
// CLOUDINARY CONFIGURATION
// ===================================

/**
 * Initialize Cloudinary
 * CRITICAL: Call this once at app startup
 */
export function initializeCloudinary(): void {
  if (
    !env.CLOUDINARY_CLOUD_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET
  ) {
    logger.warn('Cloudinary not configured - file uploads will be disabled', {
      operation: 'upload.init',
      hasCloudName: !!env.CLOUDINARY_CLOUD_NAME,
      hasApiKey: !!env.CLOUDINARY_API_KEY,
      hasApiSecret: !!env.CLOUDINARY_API_SECRET,
    });
    return;
  }

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  logger.info('✅ Cloudinary initialized', {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    operation: 'upload.init',
  });
}

// ===================================
// UPLOAD CONFIGURATION
// ===================================

export const UPLOAD_CONFIG = {
  // File size limits (bytes)
  MAX_FILE_SIZE: {
    AVATAR: 5 * 1024 * 1024, // 5MB
    RESUME: 10 * 1024 * 1024, // 10MB
  },

  // Allowed MIME types
  ALLOWED_TYPES: {
    AVATAR: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const,
    RESUME: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ] as const,
  },

  // Cloudinary folders
  FOLDERS: {
    AVATARS: 'codionix/avatars',
    RESUMES: 'codionix/resumes',
  },

  // Image transformations
  TRANSFORMATIONS: {
    AVATAR: {
      width: 400,
      height: 400,
      crop: 'fill',
      gravity: 'face',
      quality: 'auto',
      fetch_format: 'auto',
    },
  },
} as const;

// ===================================
// CLOUDINARY INSTANCE
// ===================================

export { cloudinary };
