import { z } from 'zod';

export const oauthTokenResponseSchema = z.object({
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
export const oauthLoginInitSchema = z.object({
  provider: z.enum(['google', 'github'], {
    error: 'Provider must be google or github',
  }),
});

export const oauthRegisterInitSchema = z.object({
  provider: z.enum(['google', 'github'], {
    error: 'Provider must be google or github',
  }),
  role: z.enum(['STUDENT', 'MENTOR', 'EMPLOYER'], {
    error: 'Role must be STUDENT, MENTOR, or EMPLOYER',
  }),
});

export const exchangeAuthCodeSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
});

// Export types
export type OAuthLoginInitInput = z.infer<typeof oauthLoginInitSchema>;
export type OAuthRegisterInitInput = z.infer<typeof oauthRegisterInitSchema>;
export type ExchangeAuthCodeInput = z.infer<typeof exchangeAuthCodeSchema>;
export type OAuthTokenResponse = z.infer<typeof oauthTokenResponseSchema>;
export type GoogleProfile = z.infer<typeof googleProfileSchema>;
export type GitHubProfile = z.infer<typeof githubProfileSchema>;
export type GitHubEmail = z.infer<typeof githubEmailSchema>;
