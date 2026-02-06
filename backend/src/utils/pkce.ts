import crypto from 'crypto';
import { env } from '../config/env.js';

/**
 * Generate cryptographically secure code verifier
 */
export function generateCodeVerifier(): string {
  const length = env.PKCE_CODE_VERIFIER_LENGTH;

  // Generate random bytes
  const buffer = crypto.randomBytes(length);

  // Convert to base64url (RFC 4648 Section 5)
  // base64url uses: A-Z a-z 0-9 - _  (no padding)
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .substring(0, length);
}

/**
 * Generate code challenge from verifier
 */
export function generateCodeChallenge(verifier: string): string {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Verify code verifier against challenge
 */
export function verifyCodeChallenge(
  verifier: string,
  challenge: string
): boolean {
  const computedChallenge = generateCodeChallenge(verifier);

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(computedChallenge),
    Buffer.from(challenge)
  );
}

/**
 * Generate PKCE pair (verifier + challenge)
 *
 * Returns both for convenience
 */
export interface PKCEPair {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

export function generatePKCEPair(): PKCEPair {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256', // Always use SHA-256
  };
}
