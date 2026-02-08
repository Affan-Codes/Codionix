import type { Request } from 'express';
import { createDeviceFingerprint, type DeviceFingerprint } from './jwt.js';

/**
 * Extract device fingerprint from HTTP request
 */
export function getDeviceFingerprintFromRequest(
  req: Request
): DeviceFingerprint {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  return createDeviceFingerprint(ip, userAgent);
}
