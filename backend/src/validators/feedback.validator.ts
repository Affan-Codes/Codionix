import { z } from 'zod';

/**
 * Validation schema for creating feedback
 */
export const createFeedbackSchema = z.object({
  applicationId: z.uuid('Invalid application ID'),
  rating: z
    .number()
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must not exceed 5'),
  feedbackText: z
    .string()
    .min(20, 'Feedback must be at least 20 characters')
    .max(2000, 'Feedback must not exceed 2000 characters')
    .trim(),
  strengths: z
    .array(z.string().trim().min(1, 'Strength cannot be empty'))
    .min(1, 'At least one strength is required')
    .max(10, 'Maximum 10 strengths allowed'),
  improvements: z
    .array(z.string().trim().min(1, 'Improvement cannot be empty'))
    .min(1, 'At least one improvement is required')
    .max(10, 'Maximum 10 improvements allowed'),
  isPublic: z.boolean().default(false),
});

/**
 * Validation schema for updating feedback
 */
export const updateFeedbackSchema = z.object({
  rating: z
    .number()
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must not exceed 5')
    .optional(),
  feedbackText: z
    .string()
    .min(20, 'Feedback must be at least 20 characters')
    .max(2000, 'Feedback must not exceed 2000 characters')
    .trim()
    .optional(),
  strengths: z
    .array(z.string().trim().min(1, 'Strength cannot be empty'))
    .min(1, 'At least one strength is required')
    .max(10, 'Maximum 10 strengths allowed')
    .optional(),
  improvements: z
    .array(z.string().trim().min(1, 'Improvement cannot be empty'))
    .min(1, 'At least one improvement is required')
    .max(10, 'Maximum 10 improvements allowed')
    .optional(),
  isPublic: z.boolean().optional(),
});

/**
 * Validation schema for query parameters
 */
export const listFeedbackQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().positive())
    .default(1),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().int().positive().max(100))
    .default(10),
  studentId: z.uuid('Invalid student ID').optional(),
  mentorId: z.uuid('Invalid mentor ID').optional(),
  isPublic: z
    .string()
    .optional()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional(),
});

/**
 * Validation schema for feedback ID param
 */
export const feedbackIdParamSchema = z.object({
  id: z.uuid('Invalid feedback ID'),
});

// Export types
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
export type UpdateFeedbackInput = z.infer<typeof updateFeedbackSchema>;
export type ListFeedbackQuery = z.infer<typeof listFeedbackQuerySchema>;
export type FeedbackIdParam = z.infer<typeof feedbackIdParamSchema>;
