/**
 * OAuth Service
 *
 * Production-grade OAuth 2.0 implementation for Google and GitHub
 *
 * SECURITY FEATURES:
 * - Server-side state storage (tamper-proof)
 * - Single-use state tokens (replay protection)
 * - 5-minute expiration (prevents stale state attacks)
 * - CSRF protection via nonce
 * - Email verification from providers
 */

import { env } from '../config/env.js';
import { prisma } from '../config/database.js';
import { logger, trackOperation } from '../utils/logger.js';
import {
  ConflictError,
  UnauthorizedError,
  ValidationError,
} from '../utils/errors.js';
import {
  generateTokenPair,
  type JwtPayload,
  type TokenPair,
} from '../utils/jwt.js';
import {
  storeOAuthState,
  consumeOAuthState,
} from '../utils/oauthStateStore.js';
import type {
  OAuthProvider,
  OAuthInitRequest,
  OAuthInitResponse,
  GoogleProfile,
  GitHubProfile,
  GitHubEmail,
  OAuthUserData,
  OAuthTokenResponse,
} from '../types/oauth.types.js';

// ===================================
// OAUTH URLS
// ===================================

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_PROFILE_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_PROFILE_URL = 'https://api.github.com/user';
const GITHUB_EMAIL_URL = 'https://api.github.com/user/emails';

// ===================================
// OAUTH SCOPES
// ===================================

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

const GITHUB_SCOPES = ['user:email', 'read:user'];

// ===================================
// INITIALIZATION
// ===================================

/**
 * Initialize OAuth flow
 *
 * @param data - Provider and role selection
 * @returns Authorization URL with state token
 */
export async function initializeOAuth(
  data: OAuthInitRequest
): Promise<OAuthInitResponse> {
  const tracker = trackOperation('oauth.init', undefined, {
    provider: data.provider,
    role: data.role,
  });

  try {
    const { provider, role } = data;

    // Validate provider
    if (!['google', 'github'].includes(provider)) {
      throw new ValidationError('Invalid OAuth provider');
    }

    // Validate role
    if (!['STUDENT', 'MENTOR', 'EMPLOYER'].includes(role)) {
      throw new ValidationError('Invalid role');
    }

    // Store state server-side
    const stateToken = storeOAuthState({ provider, role });

    // Build authorization URL
    const authUrl = buildAuthorizationUrl(provider, stateToken);

    tracker.success({
      provider,
      role,
      stateToken: stateToken.substring(0, 8) + '...',
    });

    return {
      authUrl,
      expiresIn: 300, // 5 minutes
    };
  } catch (error) {
    tracker.failure(error, {
      provider: data.provider,
      role: data.role,
    });
    throw error;
  }
}

/**
 * Build OAuth authorization URL
 */
function buildAuthorizationUrl(provider: OAuthProvider, state: string): string {
  if (provider === 'google') {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: env.GOOGLE_CALLBACK_URL,
      response_type: 'code',
      scope: GOOGLE_SCOPES.join(' '),
      state,
      access_type: 'online',
      prompt: 'select_account',
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  if (provider === 'github') {
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: env.GITHUB_CALLBACK_URL,
      scope: GITHUB_SCOPES.join(' '),
      state,
      allow_signup: 'true',
    });

    return `${GITHUB_AUTH_URL}?${params.toString()}`;
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

// ===================================
// CALLBACK HANDLING
// ===================================

/**
 * Handle OAuth callback
 *
 * @param provider - OAuth provider
 * @param code - Authorization code from provider
 * @param state - State token from our init
 * @returns User data and JWT tokens
 */
export async function handleOAuthCallback(
  provider: OAuthProvider,
  code: string,
  state: string
): Promise<{ user: any; tokens: TokenPair }> {
  const tracker = trackOperation('oauth.callback', undefined, { provider });

  try {
    // Validate and consume state (single-use)
    const oauthState = consumeOAuthState(state);

    if (!oauthState) {
      logger.warn('Invalid or expired OAuth state', {
        provider,
        state: state.substring(0, 8) + '...',
        operation: 'oauth.callback',
        outcome: 'invalid_state',
      });
      throw new UnauthorizedError('Invalid or expired OAuth session');
    }

    // Verify provider matches
    if (oauthState.provider !== provider) {
      logger.error('Provider mismatch in OAuth callback', {
        expected: oauthState.provider,
        received: provider,
        operation: 'oauth.callback',
        outcome: 'provider_mismatch',
      });
      throw new UnauthorizedError('OAuth provider mismatch');
    }

    // Exchange code for access token
    const accessToken = await exchangeCodeForToken(provider, code);

    // Get user profile from provider
    const oauthUser = await fetchUserProfile(provider, accessToken);

    // Add role from state
    const userData: OAuthUserData = {
      ...oauthUser,
      role: oauthState.role,
    };

    // Create or update user in database
    const { user, isNewUser } = await upsertOAuthUser(userData);

    // Generate JWT tokens
    const tokenPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const tokens = generateTokenPair(tokenPayload);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt,
      },
    });

    tracker.success({
      provider,
      userId: user.id,
      email: user.email,
      role: user.role,
      isNewUser,
    });

    return { user, tokens };
  } catch (error) {
    tracker.failure(error, { provider });
    throw error;
  }
}

// ===================================
// TOKEN EXCHANGE
// ===================================

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(
  provider: OAuthProvider,
  code: string
): Promise<string> {
  const tracker = trackOperation('oauth.exchangeToken', undefined, {
    provider,
  });

  try {
    if (provider === 'google') {
      const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: env.GOOGLE_CALLBACK_URL,
          grant_type: 'authorization_code',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google token exchange failed: ${error}`);
      }

      const data: OAuthTokenResponse = await response.json();
      tracker.success({ provider });
      return data.access_token;
    }

    if (provider === 'github') {
      const response = await fetch(GITHUB_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          code,
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          redirect_uri: env.GITHUB_CALLBACK_URL,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`GitHub token exchange failed: ${error}`);
      }

      const data: OAuthTokenResponse = await response.json();
      tracker.success({ provider });
      return data.access_token;
    }

    throw new Error(`Unsupported provider: ${provider}`);
  } catch (error) {
    tracker.failure(error, { provider });
    throw error;
  }
}

// ===================================
// PROFILE FETCHING
// ===================================

/**
 * Fetch user profile from OAuth provider
 */
async function fetchUserProfile(
  provider: OAuthProvider,
  accessToken: string
): Promise<Omit<OAuthUserData, 'role'>> {
  const tracker = trackOperation('oauth.fetchProfile', undefined, { provider });

  try {
    if (provider === 'google') {
      const response = await fetch(GOOGLE_PROFILE_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Google profile');
      }

      const profile: GoogleProfile = await response.json();

      // Validate email is verified
      if (!profile.email_verified) {
        throw new UnauthorizedError('Google email not verified');
      }

      const userData = {
        provider: 'google' as const,
        providerId: profile.sub,
        email: profile.email,
        fullName: profile.name,
        avatarUrl: profile.picture,
      };

      tracker.success({ provider, email: profile.email });
      return userData;
    }

    if (provider === 'github') {
      // Fetch profile
      const profileResponse = await fetch(GITHUB_PROFILE_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch GitHub profile');
      }

      const profile: GitHubProfile = await profileResponse.json();

      // Fetch emails (GitHub doesn't always include email in profile)
      const emailResponse = await fetch(GITHUB_EMAIL_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!emailResponse.ok) {
        throw new Error('Failed to fetch GitHub emails');
      }

      const emails: GitHubEmail[] = await emailResponse.json();

      // Get primary verified email
      const primaryEmail = emails.find((e) => e.primary && e.verified);

      if (!primaryEmail) {
        throw new UnauthorizedError(
          'No verified email found on GitHub account'
        );
      }

      const userData = {
        provider: 'github' as const,
        providerId: profile.id.toString(),
        email: primaryEmail.email,
        fullName: profile.name || profile.login,
        avatarUrl: profile.avatar_url || undefined,
        bio: profile.bio || undefined,
      };

      tracker.success({ provider, email: primaryEmail.email });
      return userData;
    }

    throw new Error(`Unsupported provider: ${provider}`);
  } catch (error) {
    tracker.failure(error, { provider });
    throw error;
  }
}

// ===================================
// USER UPSERT
// ===================================

/**
 * Create or update user from OAuth data
 */
async function upsertOAuthUser(
  data: OAuthUserData
): Promise<{ user: any; isNewUser: boolean }> {
  const tracker = trackOperation('oauth.upsertUser', undefined, {
    provider: data.provider,
    email: data.email,
  });

  try {
    const { provider, providerId, email, fullName, avatarUrl, bio, role } =
      data;

    // Check if user exists with this OAuth provider
    const existingOAuthUser = await prisma.user.findFirst({
      where:
        provider === 'google'
          ? { googleId: providerId }
          : { githubId: providerId },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        isEmailVerified: true,
        profilePictureUrl: true,
        bio: true,
        createdAt: true,
      },
    });

    if (existingOAuthUser) {
      // User exists with this OAuth provider - just return
      tracker.success({
        userId: existingOAuthUser.id,
        email: existingOAuthUser.email,
        isNewUser: false,
      });

      return { user: existingOAuthUser, isNewUser: false };
    }

    // Check if user exists with this email (email/password account)
    const existingEmailUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        googleId: true,
        githubId: true,
      },
    });

    if (existingEmailUser) {
      // User has email/password account - link OAuth provider
      const updatedUser = await prisma.user.update({
        where: { id: existingEmailUser.id },
        data: {
          ...(provider === 'google' && { googleId: providerId }),
          ...(provider === 'github' && { githubId: providerId }),
          // Update profile picture if not set
          ...(avatarUrl &&
          !existingEmailUser.googleId &&
          !existingEmailUser.githubId
            ? { profilePictureUrl: avatarUrl }
            : {}),
          // Update bio if not set
          ...(bio && { bio }),
        },
        select: {
          id: true,
          email: true,
          role: true,
          fullName: true,
          isEmailVerified: true,
          profilePictureUrl: true,
          bio: true,
          createdAt: true,
        },
      });

      logger.info('OAuth provider linked to existing account', {
        userId: updatedUser.id,
        email: updatedUser.email,
        provider,
        operation: 'oauth.upsertUser',
      });

      tracker.success({
        userId: updatedUser.id,
        email: updatedUser.email,
        isNewUser: false,
        linked: true,
      });

      return { user: updatedUser, isNewUser: false };
    }

    // New user - create account
    const newUser = await prisma.user.create({
      data: {
        email,
        fullName,
        role,
        isEmailVerified: true, // OAuth providers verify email
        emailVerifiedAt: new Date(),
        profilePictureUrl: avatarUrl,
        bio,
        skills: [],
        ...(provider === 'google' && { googleId: providerId }),
        ...(provider === 'github' && { githubId: providerId }),
      },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        isEmailVerified: true,
        profilePictureUrl: true,
        bio: true,
        createdAt: true,
      },
    });

    logger.info('New user created via OAuth', {
      userId: newUser.id,
      email: newUser.email,
      provider,
      role: newUser.role,
      operation: 'oauth.upsertUser',
    });

    tracker.success({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      isNewUser: true,
    });

    return { user: newUser, isNewUser: true };
  } catch (error) {
    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      logger.error('OAuth user creation race condition', {
        provider: data.provider,
        email: data.email,
        error: error.message,
        operation: 'oauth.upsertUser',
      });

      throw new ConflictError('Account with this email already exists');
    }

    tracker.failure(error, {
      provider: data.provider,
      email: data.email,
    });
    throw error;
  }
}
