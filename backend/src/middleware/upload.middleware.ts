import multer, { type FileFilterCallback } from 'multer';
import type { Request } from 'express';
import { UPLOAD_CONFIG } from '../config/upload.js';
import { ValidationError } from '../utils/errors.js';

// ===================================
// MULTER CONFIGURATION
// ===================================

/**
 * Memory storage - files stored in buffer
 * Better for cloud uploads (no disk I/O)
 */
const storage = multer.memoryStorage();

/**
 * File filter function
 * Validates file type during upload
 */
function createFileFilter(uploadType: 'avatar' | 'resume') {
  return (
    _req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
  ): void => {
    const allowedTypes =
      uploadType === 'avatar'
        ? UPLOAD_CONFIG.ALLOWED_TYPES.AVATAR
        : UPLOAD_CONFIG.ALLOWED_TYPES.RESUME;

    if ((allowedTypes as readonly string[]).includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new ValidationError(
          `Invalid file type. Allowed: ${allowedTypes.join(', ')}`
        )
      );
    }
  };
}

// ===================================
// MULTER INSTANCES
// ===================================

/**
 * Avatar upload middleware
 * Accepts single image file
 */
export const uploadAvatar = multer({
  storage,
  limits: {
    fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE.AVATAR,
    files: 1,
  },
  fileFilter: createFileFilter('avatar'),
}).single('avatar');

/**
 * Resume upload middleware
 * Accepts single document file
 */
export const uploadResume = multer({
  storage,
  limits: {
    fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE.RESUME,
    files: 1,
  },
  fileFilter: createFileFilter('resume'),
}).single('resume');

// ===================================
// ERROR HANDLER MIDDLEWARE
// ===================================

/**
 * Handle multer errors
 * Convert multer errors to our ValidationError
 */
import type { Response, NextFunction } from 'express';

export const handleMulterError = (
  err: Error,
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const uploadType = req.path.includes('avatar') ? 'avatar' : 'resume';
      const maxSize =
        uploadType === 'avatar'
          ? UPLOAD_CONFIG.MAX_FILE_SIZE.AVATAR
          : UPLOAD_CONFIG.MAX_FILE_SIZE.RESUME;
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);

      next(new ValidationError(`File too large. Maximum size: ${maxSizeMB}MB`));
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      next(new ValidationError('Unexpected file field'));
    } else {
      next(new ValidationError(`Upload error: ${err.message}`));
    }
  } else {
    next(err);
  }
};
