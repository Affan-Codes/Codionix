import { z } from 'zod';

export const googleTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  scope: z.string(),
  expires_in: z.number().optional(),
  refresh_token: z.string().optional(),
});

export const googleProfileSchema = z.object({
  sub: z.string(),
  email: z.email(),
  email_verified: z.boolean(),
  name: z.string(),
  picture: z.string().optional(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
});

export const githubTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  scope: z.string(),
});

export const githubProfileSchema = z.object({
  id: z.number(),
  login: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  bio: z.string().nullable(),
  html_url: z.string(),
  company: z.string().nullable(),
  location: z.string().nullable(),
});

export const githubEmailSchema = z.object({
  email: z.email(),
  primary: z.boolean(),
  verified: z.boolean(),
  visibility: z.string().nullable(),
});

export const githubEmailsSchema = z.array(githubEmailSchema);

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
