import sharp from 'sharp';
import { logger, trackOperation } from '../utils/logger.js';
import { ValidationError } from '../utils/errors.js';

// ===================================
// COMPRESSION CONFIGURATION
// ===================================

const COMPRESSION_CONFIG = {
  AVATAR: {
    maxWidth: 800,
    maxHeight: 800,
    quality: 85,
    format: 'jpeg' as const,
  },
} as const;

// ===================================
// TYPES
// ===================================

export interface CompressionResult {
  buffer: Buffer;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  format: string;
}

// ===================================
// COMPRESSION FUNCTIONS
// ===================================

/**
 * Compress image for avatar upload
 * Reduces file size while maintaining quality
 *
 * @param buffer - Original image buffer
 * @param originalFilename - Original filename for logging
 * @returns Compressed image buffer and metadata
 */
export async function compressAvatar(
  buffer: Buffer,
  originalFilename: string
): Promise<CompressionResult> {
  const tracker = trackOperation('imageCompression.avatar', undefined, {
    originalSize: buffer.length,
    filename: originalFilename,
  });

  try {
    const originalSize = buffer.length;

    // Validate it's actually an image
    let metadata;
    try {
      metadata = await sharp(buffer).metadata();
    } catch {
      throw new ValidationError('Invalid image file');
    }

    // Compress image
    const compressed = await sharp(buffer)
      .resize(
        COMPRESSION_CONFIG.AVATAR.maxWidth,
        COMPRESSION_CONFIG.AVATAR.maxHeight,
        {
          fit: 'inside', // Maintain aspect ratio, don't crop
          withoutEnlargement: true, // Don't upscale small images
        }
      )
      .jpeg({
        quality: COMPRESSION_CONFIG.AVATAR.quality,
        progressive: true, // Progressive JPEG for better web loading
        mozjpeg: true, // Use mozjpeg for better compression
      })
      .toBuffer();

    const compressedSize = compressed.length;
    const compressionRatio = Math.round(
      ((originalSize - compressedSize) / originalSize) * 100
    );

    const result: CompressionResult = {
      buffer: compressed,
      originalSize,
      compressedSize,
      compressionRatio,
      format: 'jpeg',
    };

    tracker.success({
      originalSize,
      compressedSize,
      compressionRatio: `${compressionRatio}%`,
      originalFormat: metadata.format,
      finalFormat: 'jpeg',
    });

    logger.info('Image compressed successfully', {
      filename: originalFilename,
      originalSize: `${(originalSize / 1024).toFixed(2)}KB`,
      compressedSize: `${(compressedSize / 1024).toFixed(2)}KB`,
      saved: `${compressionRatio}%`,
      operation: 'imageCompression.avatar',
    });

    return result;
  } catch (error) {
    tracker.failure(error, {
      filename: originalFilename,
      originalSize: buffer.length,
    });
    throw error;
  }
}

/**
 * Check if file needs compression
 * Small files or already optimized files might not benefit
 *
 * @param buffer - Image buffer
 * @param mimetype - Original MIME type
 * @returns Whether compression is recommended
 */
export async function shouldCompress(
  buffer: Buffer,
  mimetype: string
): Promise<boolean> {
  // Always compress if file is large (>500KB)
  if (buffer.length > 500 * 1024) {
    return true;
  }

  // Don't compress tiny files (<50KB)
  if (buffer.length < 50 * 1024) {
    return false;
  }

  // Check if already optimized JPEG
  if (mimetype === 'image/jpeg') {
    try {
      const metadata = await sharp(buffer).metadata();
      // If already small dimensions and reasonable size, skip
      if (
        metadata.width &&
        metadata.height &&
        metadata.width <= 1000 &&
        metadata.height <= 1000
      ) {
        return false;
      }
    } catch {
      // If can't read metadata, compress anyway
      return true;
    }
  }

  // Compress PNG, WebP, GIF by default
  return true;
}

/**
 * Get compression stats for monitoring
 */
export function getCompressionStats(result: CompressionResult): string {
  const originalKB = (result.originalSize / 1024).toFixed(2);
  const compressedKB = (result.compressedSize / 1024).toFixed(2);
  return `${originalKB}KB → ${compressedKB}KB (saved ${result.compressionRatio}%)`;
}
