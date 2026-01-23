import { z } from 'zod';

/**
 * OAuth initialization request
 */
export const oauthInitSchema = z.object({
  provider: z.enum(['google', 'github'], {
    error: 'Provider must be google or github',
  }),
  role: z.enum(['STUDENT', 'MENTOR', 'EMPLOYER'], {
    error: 'Role must be STUDENT, MENTOR, or EMPLOYER',
  }),
});

/**
 * OAuth callback query parameters
 */
export const oauthCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State is required'),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

// Export types
export type OAuthInitInput = z.infer<typeof oauthInitSchema>;
export type OAuthCallbackInput = z.infer<typeof oauthCallbackSchema>;
