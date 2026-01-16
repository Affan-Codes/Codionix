import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { UPLOAD_CONFIG } from '../config/upload.js';
import { logger, trackOperation } from '../utils/logger.js';
import { ValidationError } from '../utils/errors.js';

// ===================================
// TYPES
// ===================================

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
}

export type UploadType = 'avatar' | 'resume';

// ===================================
// VALIDATION HELPERS
// ===================================

/**
 * Validate file type based on upload type
 */
function validateFileType(mimetype: string, uploadType: UploadType): void {
  const allowedTypes =
    uploadType === 'avatar'
      ? UPLOAD_CONFIG.ALLOWED_TYPES.AVATAR
      : UPLOAD_CONFIG.ALLOWED_TYPES.RESUME;

  if (!(allowedTypes as readonly string[]).includes(mimetype)) {
    throw new ValidationError(
      `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
    );
  }
}

/**
 * Validate file size based on upload type
 */
function validateFileSize(size: number, uploadType: UploadType): void {
  const maxSize =
    uploadType === 'avatar'
      ? UPLOAD_CONFIG.MAX_FILE_SIZE.AVATAR
      : UPLOAD_CONFIG.MAX_FILE_SIZE.RESUME;

  if (size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    throw new ValidationError(`File too large. Maximum size: ${maxSizeMB}MB`);
  }
}

/**
 * Generate unique filename with timestamp
 */
function generateUniqueFilename(
  userId: string,
  _uploadType: UploadType
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${userId}_${timestamp}_${random}`;
}

// ===================================
// UPLOAD FUNCTIONS
// ===================================

/**
 * Upload file to Cloudinary
 *
 * @param file - Multer file object
 * @param userId - User ID for namespacing
 * @param uploadType - Type of upload (avatar or resume)
 * @returns Upload result with URL and metadata
 */
export async function uploadFile(
  file: Express.Multer.File,
  userId: string,
  uploadType: UploadType
): Promise<UploadResult> {
  const tracker = trackOperation('upload.file', undefined, {
    userId,
    uploadType,
    filename: file.originalname,
    size: file.size,
    mimetype: file.mimetype,
  });

  try {
    // Validate file
    validateFileType(file.mimetype, uploadType);
    validateFileSize(file.size, uploadType);

    // Determine folder and options
    const folder =
      uploadType === 'avatar'
        ? UPLOAD_CONFIG.FOLDERS.AVATARS
        : UPLOAD_CONFIG.FOLDERS.RESUMES;

    const publicId = generateUniqueFilename(userId, uploadType);

    // Upload options
    const uploadOptions: Record<string, any> = {
      folder,
      public_id: publicId,
      resource_type: 'auto',
      overwrite: false,
    };

    // Add transformations for images
    if (uploadType === 'avatar') {
      uploadOptions.transformation = UPLOAD_CONFIG.TRANSFORMATIONS.AVATAR;
    }

    // Upload to Cloudinary from buffer
    const result: UploadApiResponse = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) reject(error);
          else if (result) resolve(result);
          else reject(new Error('Upload failed - no result'));
        }
      );

      uploadStream.end(file.buffer);
    });

    const uploadResult: UploadResult = {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    };

    tracker.success({
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
    });

    return uploadResult;
  } catch (error) {
    tracker.failure(error, {
      userId,
      uploadType,
      filename: file.originalname,
    });
    throw error;
  }
}

/**
 * Delete file from Cloudinary
 *
 * @param publicId - Cloudinary public ID
 * @param uploadType - Type of upload (for resource type)
 */
export async function deleteFile(
  publicId: string,
  uploadType: UploadType
): Promise<void> {
  const tracker = trackOperation('upload.delete', undefined, {
    publicId,
    uploadType,
  });

  try {
    // Determine resource type
    const resourceType = uploadType === 'avatar' ? 'image' : 'raw';

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error(`Cloudinary deletion failed: ${result.result}`);
    }

    tracker.success({
      publicId,
      result: result.result,
    });
  } catch (error) {
    tracker.failure(error, { publicId, uploadType });
    throw error;
  }
}

/**
 * Replace existing file (delete old, upload new)
 *
 * @param file - New file to upload
 * @param userId - User ID
 * @param uploadType - Type of upload
 * @param oldPublicId - Public ID of old file to delete (optional)
 */
export async function replaceFile(
  file: Express.Multer.File,
  userId: string,
  uploadType: UploadType,
  oldPublicId?: string
): Promise<UploadResult> {
  const tracker = trackOperation('upload.replace', undefined, {
    userId,
    uploadType,
    hasOldFile: !!oldPublicId,
  });

  try {
    // Upload new file first
    const newFile = await uploadFile(file, userId, uploadType);

    // Delete old file if exists (fire and forget)
    if (oldPublicId) {
      deleteFile(oldPublicId, uploadType).catch((error) => {
        logger.warn('Failed to delete old file (non-critical)', {
          publicId: oldPublicId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    }

    tracker.success({
      newUrl: newFile.url,
      oldPublicId: oldPublicId || 'none',
    });

    return newFile;
  } catch (error) {
    tracker.failure(error, { userId, uploadType });
    throw error;
  }
}

/**
 * Extract public ID from Cloudinary URL
 *
 * @param url - Cloudinary URL
 * @returns Public ID or null
 */
export function extractPublicIdFromUrl(url: string): string | null {
  try {
    // Example URL: https://res.cloudinary.com/cloud/image/upload/v1234/codionix/avatars/user_123.jpg
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Check if Cloudinary is configured
 */
export function isCloudinaryConfigured(): boolean {
  return !!(
    cloudinary.config().cloud_name &&
    cloudinary.config().api_key &&
    cloudinary.config().api_secret
  );
}
