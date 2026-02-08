const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'creditCard',
  'ssn',
  'cvv',
] as const;

const SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'x-api-key',
  'x-auth-token',
] as const;

/**
 * Sanitize request/response body for logging
 * Redacts sensitive fields to prevent credential leakage
 */
export function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') return body;

  const sanitized = { ...body };

  for (const field of SENSITIVE_FIELDS) {
    if (field in sanitized) {
      sanitized[field] = '***REDACTED***';
    }
  }

  // Also sanitize nested error details
  if (sanitized.error && typeof sanitized.error === 'object') {
    sanitized.error = { ...sanitized.error };
    for (const field of SENSITIVE_FIELDS) {
      if (field in sanitized.error) {
        sanitized.error[field] = '***REDACTED***';
      }
    }
  }

  return sanitized;
}

/**
 * Sanitize HTTP headers for logging
 * Redacts Authorization, Cookie, and other sensitive headers
 */
export function sanitizeHeaders(headers: any): any {
  if (!headers || typeof headers !== 'object') return {};

  const sanitized = { ...headers };

  for (const header of SENSITIVE_HEADERS) {
    if (header in sanitized) {
      sanitized[header] = '***REDACTED***';
    }
  }

  return sanitized;
}
