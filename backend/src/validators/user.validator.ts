import { z } from 'zod';

/**
 * Base schema with nullish fields
 */
export const updateProfileBaseSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters')
    .trim()
    .nullish(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .nullish(),
  bio: z
    .string()
    .max(500, 'Bio must not exceed 500 characters')
    .trim()
    .nullish(),
  linkedinUrl: z.url('Invalid LinkedIn URL').nullish(),
  githubUrl: z.url('Invalid GitHub URL').nullish(),
  skills: z
    .array(z.string().trim().min(1, 'Skill cannot be empty'))
    .max(20, 'Maximum 20 skills allowed')
    .nullish(),
});

/**
 * Schema with transform that removes undefined
 */
export const updateProfileSchema = updateProfileBaseSchema
  .strict()
  .transform((data) => {
    // Remove undefined values, keep null
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = value;
      }
    }
    return cleaned;
  });

// Export type
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
