import { z } from 'zod';

/**
 * Validation schema for creating an application
 */
export const createApplicationSchema = z.object({
  projectId: z.uuid('Invalid project ID'),
  coverLetter: z
    .string()
    .min(50, 'Cover letter must be at least 50 characters')
    .max(1000, 'Cover letter must not exceed 1000 characters')
    .trim(),
  resumeUrl: z.url('Invalid resume URL').nullish(),
});

/**
 * Validation schema for updating application status
 */
export const updateApplicationStatusSchema = z.object({
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED']),
  rejectionReason: z
    .string()
    .min(10, 'Rejection reason must be at least 10 characters')
    .max(500, 'Rejection reason must not exceed 500 characters')
    .trim()
    .nullish(),
});

/**
 * Validation schema for query parameters
 */
export const listApplicationsQuerySchema = z.object({
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
  status: z
    .enum(['PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED'])
    .optional(),
  projectId: z.uuid('Invalid project ID').optional(),
  studentId: z.uuid('Invalid student ID').optional(),
});

/**
 * Validation schema for application ID param
 */
export const applicationIdParamSchema = z.object({
  id: z.uuid('Invalid application ID'),
});

/**
 * Validation schema for project ID param
 */
export const projectIdParamSchema = z.object({
  id: z.uuid('Invalid project ID'),
});

// Export types
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationStatusInput = z.infer<
  typeof updateApplicationStatusSchema
>;
export type ListApplicationsQuery = z.infer<typeof listApplicationsQuerySchema>;
export type ApplicationIdParam = z.infer<typeof applicationIdParamSchema>;
export type ProjectIdParam = z.infer<typeof projectIdParamSchema>;
