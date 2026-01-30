import { env } from '../config/env.js';
import { prisma } from '../config/database.js';
import { logger, trackOperation } from '../utils/logger.js';
import {
  ConflictError,
  NotFoundError,
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
  OAuthInitResponse,
  OAuthUserData,
  OAuthRegisterInitRequest,
  OAuthLoginInitRequest,
  OAuthRegisterState,
  OAuthLoginState,
} from '../types/oauth.types.js';
import {
  oauthTokenResponseSchema,
  googleProfileSchema,
  githubProfileSchema,
  githubEmailSchema,
} from '../validators/oauth.validator.js';
import { z } from 'zod';

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
 * Initialize OAuth LOGIN flow
 * MUST authenticate existing users ONLY
 */
export async function initializeOAuthLogin(
  data: OAuthLoginInitRequest
): Promise<OAuthInitResponse> {
  const tracker = trackOperation('oauth.loginInit', undefined, {
    provider: data.provider,
  });

  try {
    const { provider } = data;

    if (!['google', 'github'].includes(provider)) {
      throw new ValidationError('Invalid OAuth provider');
    }

    const stateToken = storeOAuthState({
      provider,
      flow: 'login',
    });

    const authUrl = buildAuthorizationUrl(provider, stateToken);

    tracker.success({ provider, flow: 'login' });

    return { authUrl, expiresIn: 300 };
  } catch (error) {
    tracker.failure(error, { provider: data.provider });
    throw error;
  }
}

/**
 * Initialize OAuth REGISTER flow
 * MUST create new users ONLY
 */
export async function initializeOAuthRegister(
  data: OAuthRegisterInitRequest
): Promise<OAuthInitResponse> {
  const tracker = trackOperation('oauth.registerInit', undefined, {
    provider: data.provider,
    role: data.role,
  });

  try {
    const { provider, role } = data;

    if (!['google', 'github'].includes(provider)) {
      throw new ValidationError('Invalid OAuth provider');
    }

    if (!['STUDENT', 'MENTOR', 'EMPLOYER'].includes(role)) {
      throw new ValidationError('Invalid role');
    }

    const stateToken = storeOAuthState({
      provider,
      flow: 'register',
      role,
    });

    const authUrl = buildAuthorizationUrl(provider, stateToken);

    tracker.success({ provider, flow: 'register', role });

    return { authUrl, expiresIn: 300 };
  } catch (error) {
    tracker.failure(error, { provider: data.provider, role: data.role });
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
 */
export async function handleOAuthCallback(
  provider: OAuthProvider,
  code: string,
  state: string
): Promise<{ user: any; tokens: TokenPair }> {
  const tracker = trackOperation('oauth.callback', undefined, { provider });

  try {
    const oauthState = consumeOAuthState(state);

    if (!oauthState) {
      logger.warn('Invalid or expired OAuth state', {
        provider,
        operation: 'oauth.callback',
      });
      throw new UnauthorizedError('Invalid or expired OAuth session');
    }

    if (oauthState.provider !== provider) {
      logger.error('Provider mismatch in OAuth callback', {
        expected: oauthState.provider,
        received: provider,
        operation: 'oauth.callback',
      });
      throw new UnauthorizedError('OAuth provider mismatch');
    }

    const accessToken = await exchangeCodeForToken(provider, code);
    const oauthProfile = await fetchUserProfile(provider, accessToken);

    // FLOW DISPATCH
    if (oauthState.flow === 'login') {
      return await handleOAuthLogin(oauthState, oauthProfile, tracker);
    } else {
      return await handleOAuthRegister(oauthState, oauthProfile, tracker);
    }
  } catch (error) {
    tracker.failure(error, { provider });
    throw error;
  }
}

/**
 * Handle OAuth LOGIN callback
 * MUST authenticate existing users ONLY
 * MAY link provider if missing
 */
async function handleOAuthLogin(
  _state: OAuthLoginState,
  profile: Omit<OAuthUserData, 'role'>,
  tracker: ReturnType<typeof trackOperation>
): Promise<{ user: any; tokens: TokenPair }> {
  const { provider, email, providerId } = profile;

  // ========================================
  // STEP 1: Check if OAuth provider already linked
  // ========================================
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
    logger.info('OAuth login: User authenticated via existing provider link', {
      userId: existingOAuthUser.id,
      email: existingOAuthUser.email,
      provider,
      providerId: providerId.substring(0, 8) + '...',
      operation: 'oauth.login',
      flow: 'existing_oauth_user',
    });

    // Check if email changed at provider
    if (existingOAuthUser.email !== email) {
      logger.info('OAuth email changed at provider, updating user record', {
        userId: existingOAuthUser.id,
        oldEmail: existingOAuthUser.email,
        newEmail: email,
        provider,
        operation: 'oauth.login',
      });

      const updatedUser = await prisma.user.update({
        where: { id: existingOAuthUser.id },
        data: { email },
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

      const tokens = await generateAndStoreTokens(updatedUser);

      tracker.success({
        userId: updatedUser.id,
        email: updatedUser.email,
        flow: 'existing_oauth_user',
        emailUpdated: true,
      });

      return { user: updatedUser, tokens };
    }

    // Email unchanged, proceed with authentication
    const tokens = await generateAndStoreTokens(existingOAuthUser);

    tracker.success({
      userId: existingOAuthUser.id,
      email: existingOAuthUser.email,
      flow: 'existing_oauth_user',
    });

    return { user: existingOAuthUser, tokens };
  }

  // ========================================
  // STEP 2: Check if email exists (without provider linked)
  // ========================================
  const existingEmailUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      fullName: true,
      isEmailVerified: true,
      profilePictureUrl: true,
      bio: true,
      createdAt: true,
      googleId: true,
      githubId: true,
      passwordHash: true, 
    },
  });

  if (existingEmailUser) {
    logger.info('OAuth login: Linking provider to existing email account', {
      userId: existingEmailUser.id,
      email: existingEmailUser.email,
      provider,
      providerId: providerId.substring(0, 8) + '...',
      hadPassword: !!existingEmailUser.passwordHash,
      operation: 'oauth.login',
      flow: 'linking_provider',
    });

    // Link the OAuth provider to the existing account
    const updatedUser = await prisma.user.update({
      where: { id: existingEmailUser.id },
      data: {
        ...(provider === 'google' && { googleId: providerId }),
        ...(provider === 'github' && { githubId: providerId }),
        // Optionally update profile data if missing
        ...(profile.avatarUrl && !existingEmailUser.profilePictureUrl
          ? { profilePictureUrl: profile.avatarUrl }
          : {}),
        ...(profile.bio && !existingEmailUser.bio ? { bio: profile.bio } : {}),
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

    const tokens = await generateAndStoreTokens(updatedUser);

    logger.info('OAuth provider linked successfully to email account', {
      userId: updatedUser.id,
      email: updatedUser.email,
      provider,
      operation: 'oauth.login',
    });

    tracker.success({
      userId: updatedUser.id,
      email: updatedUser.email,
      flow: 'linking_provider',
      providerLinked: provider,
    });

    return { user: updatedUser, tokens };
  }

  // ========================================
  // STEP 3: No existing account found
  // ========================================
  logger.warn('OAuth login attempt for non-existent account', {
    email,
    provider,
    providerId: providerId.substring(0, 8) + '...',
    operation: 'oauth.login',
    outcome: 'account_not_found',
  });

  throw new NotFoundError(
    'No account found with this email. Please register first.'
  );
}

/**
 * Handle OAuth REGISTER callback
 * MUST create new users ONLY
 * MUST wrap user + refresh token in transaction
 */
async function handleOAuthRegister(
  state: OAuthRegisterState,
  profile: Omit<OAuthUserData, 'role'>,
  tracker: ReturnType<typeof trackOperation>
): Promise<{ user: any; tokens: TokenPair }> {
  const { provider, email, providerId, fullName, avatarUrl, bio } = profile;
  const { role } = state;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findFirst({
        where: {
          OR: [
            { email },
            ...(provider === 'google' ? [{ googleId: providerId }] : []),
            ...(provider === 'github' ? [{ githubId: providerId }] : []),
          ],
        },
      });

      if (existingUser) {
        throw new ConflictError(
          'Account already exists. Please use login instead.'
        );
      }

      const newUser = await tx.user.create({
        data: {
          email,
          fullName,
          role,
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
          profilePictureUrl: avatarUrl ?? null,
          bio: bio ?? null,
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

      const tokenPayload: JwtPayload = {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
      };

      const tokens = generateTokenPair(tokenPayload);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await tx.refreshToken.create({
        data: {
          userId: newUser.id,
          token: tokens.refreshToken,
          expiresAt,
        },
      });

      return { user: newUser, tokens };
    });

    logger.info('New user created via OAuth', {
      userId: result.user.id,
      email: result.user.email,
      provider,
      role: result.user.role,
      operation: 'oauth.register',
    });

    tracker.success({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      flow: 'register',
    });

    return result;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      logger.error('OAuth registration race condition detected', {
        provider,
        email,
        error: error.message,
        operation: 'oauth.register',
      });

      throw new ConflictError(
        'Account already exists. Please use login instead.'
      );
    }

    throw error;
  }
}

/**
 * Helper: Generate JWT tokens and store refresh token
 */
async function generateAndStoreTokens(user: {
  id: string;
  email: string;
  role: string;
}): Promise<TokenPair> {
  const tokenPayload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const tokens = generateTokenPair(tokenPayload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt,
    },
  });

  return tokens;
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
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: env.GOOGLE_CALLBACK_URL,
          grant_type: 'authorization_code',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Google token exchange failed', {
          provider,
          statusCode: response.status,
          error: errorText,
          operation: 'oauth.exchangeToken',
        });

        throw new UnauthorizedError('Failed to fetch access token from Google');
      }

      const rawData: unknown = await response.json();
      const data = oauthTokenResponseSchema.parse(rawData);

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
        const errorText = await response.text();
        logger.error('GitHub token exchange failed', {
          provider,
          statusCode: response.status,
          error: errorText,
          operation: 'oauth.exchangeToken',
        });

        throw new UnauthorizedError('Failed to fetch access token from GitHub');
      }

      const rawData: unknown = await response.json();
      const data = oauthTokenResponseSchema.parse(rawData);

      tracker.success({ provider });
      return data.access_token;
    }

    throw new Error(`Unsupported provider: ${provider}`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Invalid OAuth token response format', {
        provider,
        errors: error.issues,
        operation: 'oauth.exchangeToken',
      });

      throw new UnauthorizedError(
        `Failed to parse token response from ${provider}`
      );
    }

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
        logger.error('Google profile fetch failed', {
          provider,
          statusCode: response.status,
          operation: 'oauth.fetchProfile',
        });

        throw new UnauthorizedError('Failed to fetch profile from Google');
      }

      const rawProfile: unknown = await response.json();
      const profile = googleProfileSchema.parse(rawProfile);

      // Validate email is verified
      if (!profile.email_verified) {
        throw new UnauthorizedError('Google email not verified');
      }

      const userData: Omit<OAuthUserData, 'role'> = {
        provider: 'google',
        providerId: profile.sub,
        email: profile.email,
        fullName: profile.name,
        ...(profile.picture && { avatarUrl: profile.picture }),
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
        logger.error('GitHub profile fetch failed', {
          provider,
          statusCode: profileResponse.status,
          operation: 'oauth.fetchProfile',
        });

        throw new UnauthorizedError('Failed to fetch profile from GitHub');
      }

      const rawProfile: unknown = await profileResponse.json();
      const profile = githubProfileSchema.parse(rawProfile);

      // Fetch emails (GitHub doesn't always include email in profile)
      const emailResponse = await fetch(GITHUB_EMAIL_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!emailResponse.ok) {
        logger.error('GitHub emails fetch failed', {
          provider,
          statusCode: emailResponse.status,
          operation: 'oauth.fetchProfile',
        });

        throw new UnauthorizedError('Failed to fetch emails from GitHub');
      }

      const rawEmails: unknown = await emailResponse.json();
      const emails = z.array(githubEmailSchema).parse(rawEmails);

      // Get primary verified email
      const primaryEmail = emails.find((e) => e.primary && e.verified);

      if (!primaryEmail) {
        throw new UnauthorizedError(
          'No verified email found on GitHub account'
        );
      }

      const userData: Omit<OAuthUserData, 'role'> = {
        provider: 'github' as const,
        providerId: profile.id.toString(),
        email: primaryEmail.email,
        fullName: profile.name || profile.login,
        ...(profile.avatar_url && { avatarUrl: profile.avatar_url }),
        ...(profile.bio && { bio: profile.bio }),
      };

      tracker.success({ provider, email: primaryEmail.email });
      return userData;
    }

    throw new Error(`Unsupported provider: ${provider}`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Invalid OAuth profile response format', {
        provider,
        errors: error.issues,
        operation: 'oauth.fetchProfile',
      });

      throw new UnauthorizedError(
        `Failed to parse profile data from ${provider}`
      );
    }

    tracker.failure(error, { provider });
    throw error;
  }
}
