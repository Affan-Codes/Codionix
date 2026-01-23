/**
 * OAuth Type Definitions
 */

export type OAuthProvider = 'google' | 'github';

export type UserRole = 'STUDENT' | 'MENTOR' | 'EMPLOYER';

/**
 * OAuth state stored server-side
 * CRITICAL: Never store this client-side
 */
export interface OAuthState {
  provider: OAuthProvider;
  role: UserRole;
  createdAt: number;
  expiresAt: number;
  nonce: string; // Additional CSRF protection
}

/**
 * OAuth initialization request
 */
export interface OAuthInitRequest {
  provider: OAuthProvider;
  role: UserRole;
}

/**
 * OAuth initialization response
 */
export interface OAuthInitResponse {
  authUrl: string;
  expiresIn: number; // seconds
}

/**
 * Google OAuth user profile
 */
export interface GoogleProfile {
  sub: string; // Google user ID
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

/**
 * GitHub OAuth user profile
 */
export interface GitHubProfile {
  id: number;
  login: string; // username
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  html_url: string;
  company: string | null;
  location: string | null;
}

/**
 * GitHub email response
 */
export interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: string | null;
}

/**
 * Normalized OAuth user data
 */
export interface OAuthUserData {
  provider: OAuthProvider;
  providerId: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  bio?: string;
  role: UserRole;
}

/**
 * OAuth callback query parameters
 */
export interface OAuthCallbackQuery {
  code: string;
  state: string;
  error?: string;
  error_description?: string;
}

/**
 * OAuth token response from provider
 */
export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in?: number;
  refresh_token?: string;
}
