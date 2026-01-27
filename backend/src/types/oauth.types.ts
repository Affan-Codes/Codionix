export type OAuthProvider = 'google' | 'github';

export type UserRole = 'STUDENT' | 'MENTOR' | 'EMPLOYER';

/**
 * OAuth state stored server-side
 * CRITICAL: Never store this client-side
 */
export interface OAuthLoginInitRequest {
  provider: OAuthProvider;
}

export interface OAuthRegisterInitRequest {
  provider: OAuthProvider;
  role: Exclude<UserRole, 'ADMIN'>; // Only STUDENT, MENTOR, EMPLOYER
}

export interface OAuthLoginState {
  provider: OAuthProvider;
  flow: 'login';
  createdAt: number;
  expiresAt: number;
  nonce: string;
}

export interface OAuthRegisterState {
  provider: OAuthProvider;
  flow: 'register';
  role: Exclude<UserRole, 'ADMIN'>;
  createdAt: number;
  expiresAt: number;
  nonce: string;
}

export type OAuthState = OAuthLoginState | OAuthRegisterState;

/**
 * OAuth initialization response
 */
export interface OAuthInitResponse {
  authUrl: string;
  expiresIn: number; // seconds
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
