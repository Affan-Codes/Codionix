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
  type TokenPair,
  type DeviceFingerprint,
} from '../utils/jwt.js';
import {
  storeOAuthState,
  consumeOAuthState,
} from '../utils/oauthStateStore.js';
import { generatePKCEPair } from '../utils/pkce.js';
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

// OAuth URLs
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_PROFILE_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_PROFILE_URL = 'https://api.github.com/user';
const GITHUB_EMAIL_URL = 'https://api.github.com/user/emails';

// OAuth scopes
const GOOGLE_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

const GITHUB_SCOPES = ['user:email', 'read:user'];

interface OAuthUser {
  id: string;
  email: string;
  role: string;
  fullName: string;
  isEmailVerified: boolean;
  profilePictureUrl: string | null;
  bio: string | null;
  createdAt: Date;
}

/**
 * Initialize OAuth LOGIN flow with PKCE
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

    const pkce = generatePKCEPair();

    // Store state as signed JWT (stateless)
    const stateToken = await storeOAuthState({
      provider,
      flow: 'login',
      codeVerifier: pkce.codeVerifier,
    } as Omit<OAuthLoginState, 'createdAt' | 'expiresAt' | 'nonce'>);

    const authUrl = buildAuthorizationUrl(
      provider,
      stateToken,
      pkce.codeChallenge
    );

    tracker.success({ provider, flow: 'login' });

    return { authUrl, expiresIn: 600 };
  } catch (error) {
    tracker.failure(error, { provider: data.provider });
    throw error;
  }
}

/**
 * Initialize OAuth REGISTER flow with PKCE
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

    const pkce = generatePKCEPair();

    // Store state as signed JWT (stateless)
    const stateToken = await storeOAuthState({
      provider,
      flow: 'register',
      role,
      codeVerifier: pkce.codeVerifier,
    } as Omit<OAuthRegisterState, 'createdAt' | 'expiresAt' | 'nonce'>);

    const authUrl = buildAuthorizationUrl(
      provider,
      stateToken,
      pkce.codeChallenge
    );

    tracker.success({ provider, flow: 'register', role });

    return { authUrl, expiresIn: 600 };
  } catch (error) {
    tracker.failure(error, { provider: data.provider, role: data.role });
    throw error;
  }
}

/**
 * Build OAuth authorization URL with PKCE
 */
function buildAuthorizationUrl(
  provider: OAuthProvider,
  state: string,
  codeChallenge: string
): string {
  if (provider === 'google') {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: env.GOOGLE_CALLBACK_URL,
      response_type: 'code',
      scope: GOOGLE_SCOPES.join(' '),
      state,
      access_type: 'online',
      prompt: 'select_account',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
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
      // GitHub doesn't support PKCE yet, but we validate on our end
    });

    return `${GITHUB_AUTH_URL}?${params.toString()}`;
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

/**
 * Handle OAuth callback and return tokens
 */
export async function handleOAuthCallback(
  provider: OAuthProvider,
  code: string,
  state: string,
  fingerprint: DeviceFingerprint
): Promise<{ user: OAuthUser; tokens: TokenPair }> {
  const tracker = trackOperation('oauth.callback', undefined, { provider });

  try {
    // Consume state from signed JWT (stateless)
    const oauthState = await consumeOAuthState(state);

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

    const codeVerifier = oauthState.codeVerifier;

    // Exchange code for access token
    const accessToken = await exchangeCodeForToken(
      provider,
      code,
      codeVerifier
    );

    // Fetch user profile
    const oauthProfile = await fetchUserProfile(provider, accessToken);

    // Flow dispatch
    let user: OAuthUser;
    let tokens: TokenPair;

    if (oauthState.flow === 'login') {
      const result = await handleOAuthLogin(
        oauthState,
        oauthProfile,
        fingerprint,
        tracker
      );
      user = result.user;
      tokens = result.tokens;
    } else {
      const result = await handleOAuthRegister(
        oauthState,
        oauthProfile,
        fingerprint,
        tracker
      );
      user = result.user;
      tokens = result.tokens;
    }

    tracker.success({
      provider,
      userId: user.id,
      flow: oauthState.flow,
    });

    return { user, tokens };
  } catch (error) {
    tracker.failure(error, { provider });
    throw error;
  }
}

/**
 * Exchange authorization code for access token with PKCE
 */
async function exchangeCodeForToken(
  provider: OAuthProvider,
  code: string,
  codeVerifier: string
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
          code_verifier: codeVerifier,
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
        headers: { Authorization: `Bearer ${accessToken}` },
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

/**
 * LOGIN HANDLER
 */
async function handleOAuthLogin(
  _state: OAuthLoginState,
  profile: Omit<OAuthUserData, 'role'>,
  fingerprint: DeviceFingerprint,
  tracker: ReturnType<typeof trackOperation>
): Promise<{ user: OAuthUser; tokens: TokenPair }> {
  const { provider, email, providerId } = profile;

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
    logger.info('OAuth login: Existing user authenticated', {
      userId: existingOAuthUser.id,
      email: existingOAuthUser.email,
      provider,
      operation: 'oauth.login',
    });

    const tokens = generateTokenPair(
      {
        userId: existingOAuthUser.id,
        email: existingOAuthUser.email,
        role: existingOAuthUser.role,
      },
      fingerprint
    );

    // Store refresh token with JTI + fingerprint
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        userId: existingOAuthUser.id,
        jti: tokens.refreshTokenJti,
        fingerprint: fingerprint.combined,
        expiresAt,
      },
    });

    tracker.success({
      userId: existingOAuthUser.id,
      email: existingOAuthUser.email,
      flow: 'login',
    });

    return { user: existingOAuthUser, tokens };
  }

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
    logger.info('OAuth login: Linking provider to existing account', {
      userId: existingEmailUser.id,
      email: existingEmailUser.email,
      provider,
      operation: 'oauth.login',
    });

    const updatedUser = await prisma.user.update({
      where: { id: existingEmailUser.id },
      data: {
        ...(provider === 'google' && { googleId: providerId }),
        ...(provider === 'github' && { githubId: providerId }),
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

    const tokens = generateTokenPair(
      {
        userId: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
      },
      fingerprint
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        userId: updatedUser.id,
        jti: tokens.refreshTokenJti,
        fingerprint: fingerprint.combined,
        expiresAt,
      },
    });

    tracker.success({
      userId: updatedUser.id,
      email: updatedUser.email,
      flow: 'login_link',
    });

    return { user: updatedUser, tokens };
  }

  logger.warn('OAuth login: No account found', {
    email,
    provider,
    operation: 'oauth.login',
  });

  throw new NotFoundError(
    'No account found with this email. Please register first.'
  );
}

/**
 * REGISTER HANDLER
 */
async function handleOAuthRegister(
  state: OAuthRegisterState,
  profile: Omit<OAuthUserData, 'role'>,
  fingerprint: DeviceFingerprint,
  tracker: ReturnType<typeof trackOperation>
): Promise<{ user: OAuthUser; tokens: TokenPair }> {
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

      const tokens = generateTokenPair(
        {
          userId: newUser.id,
          email: newUser.email,
          role: newUser.role,
        },
        fingerprint
      );

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await tx.refreshToken.create({
        data: {
          userId: newUser.id,
          jti: tokens.refreshTokenJti,
          fingerprint: fingerprint.combined,
          expiresAt,
        },
      });

      return { user: newUser, tokens };
    });

    logger.info('OAuth register: New user created', {
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
      logger.error('OAuth registration race condition', {
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
