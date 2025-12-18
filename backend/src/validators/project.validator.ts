import { z } from 'zod';

/**
 * Validation schema for creating a project
 */
export const createProjectSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title must not exceed 100 characters')
    .trim(),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .trim(),
  skills: z
    .array(z.string().trim().min(1, 'Skill cannot be empty'))
    .min(1, 'At least one skill is required')
    .max(10, 'Maximum 10 skills allowed'),
  duration: z.string().min(1, 'Duration is required').trim(),
  deadline: z.iso
    .datetime('Invalid deadline format')
    .transform((str) => new Date(str)),
  projectType: z.enum(['PROJECT', 'INTERNSHIP'], {
    error: 'Type must be PROJECT or INTERNSHIP',
  }),
  stipend: z.number().positive('Stipend must be positive').nullish(),
  isRemote: z.boolean().default(true),
  difficultyLevel: z
    .enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], {
      error: 'Difficulty must be BEGINNER, INTERMEDIATE, or ADVANCED',
    })
    .default('INTERMEDIATE'),
  status: z
    .enum(['DRAFT', 'PUBLISHED', 'CLOSED'], {
      error: 'Status must be DRAFT, PUBLISHED, or CLOSED',
    })
    .default('DRAFT'),
  companyName: z.string().trim().nullish(),
  location: z.string().trim().nullish(),
  maxApplicants: z
    .number()
    .int()
    .positive('Max applicants must be positive')
    .max(100, 'Max applicants cannot exceed 100')
    .default(10),
});

/**
 * Validation schema for updating a project
 */
const updateProjectBaseSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title must not exceed 100 characters')
    .trim()
    .nullish(),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .trim()
    .nullish(),
  skills: z
    .array(z.string().trim().min(1, 'Skill cannot be empty'))
    .min(1, 'At least one skill is required')
    .max(10, 'Maximum 10 skills allowed')
    .nullish(),
  duration: z.string().min(1, 'Duration is required').trim().nullish(),
  deadline: z.iso
    .datetime('Invalid deadline format')
    .transform((str) => new Date(str))
    .nullish(),
  projectType: z.enum(['PROJECT', 'INTERNSHIP']).nullish(),
  stipend: z.number().positive('Stipend must be positive').nullish(),
  isRemote: z.boolean().nullish(),
  difficultyLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).nullish(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED']).nullish(),
  companyName: z.string().trim().nullish(),
  location: z.string().trim().nullish(),
  maxApplicants: z
    .number()
    .int()
    .positive('Max applicants must be positive')
    .max(100, 'Max applicants cannot exceed 100')
    .nullish(),
});

export const updateProjectSchema = updateProjectBaseSchema
  .strict()
  .transform((data) => {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = value;
      }
    }
    return cleaned;
  });

/**
 * Validation schema for query parameters (list projects)
 */
export const listProjectsQuerySchema = z.object({
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
  projectType: z.enum(['PROJECT', 'INTERNSHIP']).optional(),
  difficultyLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED']).optional(),
  skills: z.string().optional(),
  search: z.string().optional(),
});

/**
 * Validation schema for project ID param
 */
export const projectIdParamSchema = z.object({
  id: z.uuid('Invalid project ID'),
});

// Export types
export type CreateProjectInput = z.output<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
export type ProjectIdParam = z.infer<typeof projectIdParamSchema>;
