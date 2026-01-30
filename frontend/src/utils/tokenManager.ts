import { STORAGE_KEYS } from "@/constants";

export interface StoredTokens {
  refreshToken: string | null;
}

export interface TokenMetadata {
  expiresAt: number | null; // Unix timestamp (ms)
  issuedAt: number | null; // Unix timestamp (ms)
}

/**
 * Get refresh token from sessionStorage
 *
 * CRITICAL: Access token is NOT stored (memory-only in AuthContext)
 */
export function getRefreshToken(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  } catch (error) {
    // sessionStorage unavailable (private mode, quota exceeded)
    console.error("Failed to read refresh token:", error);
    return null;
  }
}

/**
 * Store refresh token in sessionStorage
 *
 * ROTATION SAFETY:
 * - Called after successful /refresh or /login
 * - Old token automatically replaced
 * - If write fails, old token remains (better than losing both)
 */
export function setRefreshToken(token: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  } catch (error) {
    console.error("Failed to store refresh token:", error);
  }
}

/**
 * Remove refresh token from sessionStorage
 */
export function clearRefreshToken(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  } catch (error) {
    console.error("Failed to clear refresh token:", error);
  }
}

/**
 * Get cached user data from sessionStorage
 */
export function getCachedUser(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEYS.USER);
  } catch (error) {
    console.error("Failed to read cached user:", error);
    return null;
  }
}

/**
 * Cache user data in sessionStorage
 */
export function setCachedUser(userData: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEYS.USER, userData);
  } catch (error) {
    console.error("Failed to cache user data:", error);
  }
}

/**
 * Remove cached user data from sessionStorage
 */
export function clearCachedUser(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.USER);
  } catch (error) {
    console.error("Failed to clear cached user:", error);
  }
}

/**
 * Clear ALL auth data atomically
 */
export function clearAllAuthData(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.USER);
    // Note: Access token cleared separately in AuthContext (memory-only)
  } catch (error) {
    console.error("Failed to clear auth data:", error);
    // Force clear via bulk operation
    try {
      sessionStorage.clear(); // Nuclear option
    } catch {
      // Even this failed — browser storage completely broken
      console.error("CRITICAL: Cannot clear sessionStorage");
    }
  }
}

/**
 * Check if user has valid session (refresh token exists)
 */
export function hasActiveSession(): boolean {
  return !!getRefreshToken();
}

/**
 * Calculate access token expiry time
 */
export function getAccessTokenExpiry(token: string): number {
  try {
    // Decode JWT (base64 payload)
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));

    // exp is in seconds, convert to milliseconds
    return decoded.exp * 1000;
  } catch (error) {
    // JWT decode failed — use 15-minute default
    console.warn("Failed to decode access token, using 15-min default");
    return Date.now() + 15 * 60 * 1000; // 15 minutes from now
  }
}

/**
 * Check if access token is expired or about to expire
 */
export function isTokenExpiringSoon(
  expiryTime: number,
  bufferSeconds: number = 60,
): boolean {
  const now = Date.now();
  const buffer = bufferSeconds * 1000; // Convert to ms
  return expiryTime - now <= buffer;
}
