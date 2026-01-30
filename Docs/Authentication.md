# Authentication API - Production Documentation

**Base URL:** `https://api.codionix.com/api/v1/auth`

**Last Updated:** January 2026  
**API Version:** v1

---

## Table of Contents

1. [Authentication Architecture](#authentication-architecture)
2. [Email/Password Authentication](#emailpassword-authentication)
3. [OAuth Authentication](#oauth-authentication)
4. [Session Management](#session-management)
5. [Error Handling](#error-handling)
6. [Security Considerations](#security-considerations)

---

## Authentication Architecture

### Token System

Codionix uses a dual-token JWT system for authentication:

**Access Tokens:**

- **Lifespan:** 15 minutes
- **Purpose:** API authentication
- **Storage:** Client memory or sessionStorage (NOT localStorage)
- **Usage:** `Authorization: Bearer {access_token}` header
- **Payload:** `{ userId, email, role, iat, exp }`
- **Revocation:** Cannot be revoked (stateless)

**Refresh Tokens:**

- **Lifespan:** 7 days
- **Purpose:** Obtain new access tokens
- **Storage:** Database (server-side) + client-side reference
- **Usage:** POST to `/refresh` endpoint
- **Revocation:** Can be revoked via `/logout` or database
- **Rotation:** Single-use tokens (new token issued on refresh)

**Token Delivery Methods:**

| Auth Method    | Delivery                                             | Security                                          |
| -------------- | ---------------------------------------------------- | ------------------------------------------------- |
| Email/Password | JSON response body                                   | HTTPS only                                        |
| OAuth          | URL fragment (`#access_token=...&refresh_token=...`) | Not sent to server, requires immediate extraction |

### Rate Limiting

All auth endpoints have strict rate limiting to prevent abuse:

| Endpoint Group                          | Limit       | Window | Scope  |
| --------------------------------------- | ----------- | ------ | ------ |
| `/register`, `/login`                   | 10 requests | 15 min | Per IP |
| `/verify-email`, `/resend-verification` | 3 requests  | 15 min | Per IP |
| `/forgot-password`, `/reset-password`   | 10 requests | 15 min | Per IP |
| OAuth init (`/oauth/*/init`)            | 10 requests | 15 min | Per IP |
| OAuth callbacks                         | 20 requests | 15 min | Per IP |

**Rate Limit Headers:**

```
RateLimit-Limit: 10
RateLimit-Remaining: 7
RateLimit-Reset: 1706094900
```

**Rate Limit Exceeded (429):**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many attempts. Try again in 15 minutes.",
    "errorId": "uuid",
    "correlationId": "req_xyz"
  }
}
```

---

## Email/Password Authentication

### 1. Register

**`POST /register`**

Create a new user account and send email verification.

**Request Body:**

```json
{
  "email": "student@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe",
  "role": "STUDENT"
}
```

**Field Validation:**

| Field      | Rules                                                                                 |
| ---------- | ------------------------------------------------------------------------------------- | ------ |
| `email`    | Valid email format, unique in system                                                  |
| `password` | ≥8 chars, ≥1 uppercase, ≥1 lowercase, ≥1 number, ≥1 special char (`!@#$%^&\*(),.?":{} | <>\_`) |
| `fullName` | 2-100 characters, trimmed                                                             |
| `role`     | `STUDENT`, `MENTOR`, or `EMPLOYER` (ADMIN not allowed via API)                        |

**Success Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "student@example.com",
      "fullName": "John Doe",
      "role": "STUDENT",
      "isEmailVerified": false,
      "profilePictureUrl": null,
      "createdAt": "2026-01-24T10:30:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**Side Effects:**

1. User created with `isEmailVerified: false`
2. Email verification token generated (24-hour expiry)
3. Verification email queued asynchronously
4. Refresh token stored in database
5. **User can access API immediately** (verification NOT required for authentication)

**Error Responses:**

**409 Conflict - Email Exists:**

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "User with this email already exists"
  }
}
```

**400 Validation Error:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "password",
        "message": "Password must contain at least one uppercase letter"
      }
    ]
  }
}
```

---

### 2. Login

**`POST /login`**

Authenticate with email and password.

**Request Body:**

```json
{
  "email": "student@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "student@example.com",
      "fullName": "John Doe",
      "role": "STUDENT",
      "isEmailVerified": true,
      "profilePictureUrl": "https://res.cloudinary.com/...",
      "createdAt": "2026-01-20T10:30:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**Error Responses:**

**401 Unauthorized - Invalid Credentials:**

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid email or password"
  }
}
```

> **Security Note:** Response is identical whether email doesn't exist or password is wrong (prevents email enumeration).

**401 Unauthorized - OAuth-Only Account:**

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "This account uses Google login. Please sign in with Google."
  }
}
```

**When This Occurs:**

- User registered via OAuth (Google or GitHub)
- Account has no password (`passwordHash` is `null`)
- User must use OAuth to authenticate

---

### 3. Email Verification

**`POST /verify-email`**

Verify email address using token from verification email.

**Request Body:**

```json
{
  "token": "a3f5d8c9e2b1f4a7d6c8e9f2b3a4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2"
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Email verified successfully",
    "email": "student@example.com"
  }
}
```

**Side Effects:**

1. `isEmailVerified` set to `true`
2. `emailVerifiedAt` timestamp recorded
3. Verification token cleared (single-use)
4. Welcome email queued

**Error Responses:**

**401 Unauthorized - Invalid/Expired Token:**

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired verification token"
  }
}
```

**400 Validation Error - Already Verified:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email already verified"
  }
}
```

---

### 4. Resend Verification Email

**`POST /resend-verification`**

Request a new verification email.

**Request Body:**

```json
{
  "email": "student@example.com"
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "If an account exists, a verification email has been sent"
  }
}
```

> **Security Note:** Response does NOT reveal whether email exists in database.

**Side Effects (if email exists AND unverified):**

1. New verification token generated
2. Old token invalidated
3. New verification email queued
4. 24-hour expiry set

---

### 5. Refresh Access Token

**`POST /refresh`**

Exchange refresh token for new access token.

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**CRITICAL BEHAVIOR - Token Rotation:**

1. Old refresh token is **revoked** (`isRevoked: true` in database)
2. New refresh token is **generated and returned**
3. Both tokens (access + refresh) returned in response
4. **Frontend MUST replace old refresh token with new one**

**Security Mechanism:**

- Prevents refresh token reuse
- If same token used twice → both sessions invalidated
- Forces single active session per token

**Error Responses:**

**401 Unauthorized - Invalid Token:**

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid refresh token"
  }
}
```

**Causes:**

- Token not found in database
- Token already revoked
- Token expired (>7 days old)
- User deleted

---

### 6. Logout

**`POST /logout`**

Revoke refresh token to end session.

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

**Side Effects:**

1. Refresh token marked as `isRevoked: true`
2. Token can no longer generate new access tokens

**CRITICAL LIMITATION:**

- Access token **remains valid** until expiration (max 15 minutes)
- Backend cannot revoke access tokens (stateless JWTs)
- Client MUST discard access token immediately
- Attacker with stolen access token has ≤15 minutes of access

---

### 7. Password Reset

**`POST /forgot-password`**

Request password reset email.

**Request Body:**

```json
{
  "email": "student@example.com"
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "If an account with that email exists, a reset link was sent."
  }
}
```

> **Security Note:** Response does NOT reveal whether email exists.

**Side Effects (if email exists):**

1. Reset token generated (64-char hex)
2. Reset expiry set (1 hour)
3. Password reset email queued

---

**`POST /reset-password`**

Reset password using token from email.

**Request Body:**

```json
{
  "token": "b4e6f9a2c5d8e1f3a7b9c2d4e6f8a0b3c5d7e9f1a3b5c7d9e1f3a5b7c9e1f3a5",
  "password": "NewSecurePass456!"
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Password reset successful"
  }
}
```

**Side Effects:**

1. Password hash updated
2. Reset token cleared (single-use)
3. **Existing refresh tokens NOT revoked** (sessions remain active)

**CRITICAL SECURITY GAP:**

- Changing password does NOT invalidate active sessions
- If account compromised, attacker's sessions remain valid
- User MUST manually logout all sessions

---

### 8. Get Current User

**`GET /me`**

Get authenticated user's basic profile.

**Authentication:** Required (access token)

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "student@example.com",
    "role": "STUDENT"
  }
}
```

---

## OAuth Authentication

### Supported Providers

| Provider | Callback URL                                | Required Scopes                      | Email Verification       |
| -------- | ------------------------------------------- | ------------------------------------ | ------------------------ |
| Google   | `{BACKEND_URL}/api/v1/auth/google/callback` | `userinfo.email`, `userinfo.profile` | Required                 |
| GitHub   | `{BACKEND_URL}/api/v1/auth/github/callback` | `user:email`, `read:user`            | Required (primary email) |

**Email Verification Enforcement:**

- **Google:** User's email must be verified at Google
- **GitHub:** User's primary email must be verified at GitHub
- If email not verified → OAuth flow fails with error

---

### OAuth Flow Types

Codionix has **TWO DISTINCT** OAuth flows:

#### 1. LOGIN Flow

**Endpoint:** `POST /oauth/login/init`  
**Purpose:** Authenticate existing users OR link provider to existing account

**Behavior:**

- **If OAuth provider already linked** → Authenticate with existing account
- **If email exists (no provider linked)** → **AUTOMATICALLY LINK** provider + authenticate
- **If neither exists** → Error (must register first)

**Key Feature:** Automatic provider linking to email-based accounts

#### 2. REGISTER Flow

**Endpoint:** `POST /oauth/register/init`  
**Purpose:** Create new user accounts

**Behavior:**

- **If email OR provider exists** → Error (must login instead)
- **If neither exists** → Create new user with selected role
- **Role selection is PERMANENT** (assigned during registration)

---

### OAuth State Management

**Server-Side State Storage:**

- State tokens stored in-memory (single-instance deployment)
- 5-minute expiration
- Single-use (consumed on callback)
- CSRF protection via nonce

**State Token Structure:**

```typescript
{
  provider: 'google' | 'github',
  flow: 'login' | 'register',
  role?: 'STUDENT' | 'MENTOR' | 'EMPLOYER', // Only for register
  nonce: string, // Random 32-char hex
  createdAt: number,
  expiresAt: number
}
```

---

### OAuth Login Flow (Existing Users)

**Step 1: Initialize Login**

**`POST /oauth/login/init`**

**Request Body:**

```json
{
  "provider": "google"
}
```

**Validation:**

- `provider`: Must be `google` or `github`

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&state=...",
    "expiresIn": 300
  }
}
```

**Frontend Action:**

1. Redirect user to `authUrl`
2. User authorizes at provider
3. Provider redirects to backend callback

---

**Step 2: OAuth Callback (Automatic)**

**`GET /auth/google/callback`**  
**`GET /auth/github/callback`**

**Query Parameters:**

- `code`: Authorization code from provider
- `state`: State token from init
- `error`: (optional) Error from provider
- `error_description`: (optional) Error description

**Backend Processing:**

1. Validates state token (exists, not expired, matches provider)
2. Exchanges code for access token
3. Fetches user profile from provider
4. **LOGIN LOGIC (Priority Order):**

```
A. Check if provider ID exists (googleId/githubId)
   ↓ YES → Authenticate existing OAuth account
   ↓ NO → Continue to B

B. Check if email exists in system
   ↓ YES → LINK provider to account + Authenticate
   ↓ NO → Continue to C

C. No match found
   → Error: Account doesn't exist (must register)
```

**Account Linking Details (Step B):**

When user has email-based account and logs in with OAuth:

```typescript
// Before: User registered with email/password
{
  email: 'user@example.com',
  passwordHash: 'bcrypt_hash',
  googleId: null,
  githubId: null
}

// After: User logs in with Google
{
  email: 'user@example.com',
  passwordHash: 'bcrypt_hash',
  googleId: 'google_provider_id_123', // ← LINKED
  githubId: null,
  profilePictureUrl: 'https://...' // ← Updated if was null
}
```

**Result:** User can now authenticate via:

- Email + password
- Google OAuth
- GitHub OAuth (if later linked)

---

**Step 3: Success/Error Redirect**

**Success Redirect:**

```
{FRONTEND_URL}/auth/oauth/success#access_token={token}&refresh_token={token}
```

**Error Redirect:**

```
{FRONTEND_URL}/auth/oauth/error?provider={provider}&error={code}
```

**Error Codes:**

| Code                 | Meaning                          | User Action             |
| -------------------- | -------------------------------- | ----------------------- |
| `access_denied`      | User denied authorization        | Try again               |
| `account_not_found`  | No account exists for this email | Use Register flow       |
| `state_expired`      | OAuth state expired (>5 min)     | Start flow again        |
| `email_not_verified` | Email not verified at provider   | Verify at Google/GitHub |
| `invalid_request`    | Missing code or state parameters | Contact support         |
| `internal_error`     | Backend processing error         | Contact support         |

---

**Step 4: Frontend Token Extraction**

```javascript
// Extract tokens from URL fragment
const hash = window.location.hash.substring(1); // Remove '#'
const params = new URLSearchParams(hash);
const accessToken = params.get("access_token");
const refreshToken = params.get("refresh_token");

// CRITICAL: Clear URL immediately
window.history.replaceState(null, "", "/dashboard");

// Store tokens securely
sessionStorage.setItem("access_token", accessToken);
sessionStorage.setItem("refresh_token", refreshToken);
```

---

### OAuth Register Flow (New Users)

**Step 1: Initialize Register**

**`POST /oauth/register/init`**

**Request Body:**

```json
{
  "provider": "github",
  "role": "STUDENT"
}
```

**Validation:**

- `provider`: Must be `google` or `github`
- `role`: Must be `STUDENT`, `MENTOR`, or `EMPLOYER` (ADMIN not allowed)

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "authUrl": "https://github.com/login/oauth/authorize?client_id=...&state=...",
    "expiresIn": 300
  }
}
```

**CRITICAL:** Role selected here is **PERMANENT** and becomes the user's account role.

---

**Step 2: OAuth Callback (Automatic)**

**Backend Processing:**

1. Validates state token
2. Exchanges code for access token
3. Fetches user profile
4. **REGISTER LOGIC - Safety Checks:**

```
A. Check if email exists
   ↓ YES → Error 409 (must login instead)
   ↓ NO → Continue to B

B. Check if provider ID exists (googleId/githubId)
   ↓ YES → Error 409 (must login instead)
   ↓ NO → Continue to C

C. Both checks pass
   → Create new user (atomic transaction)
```

**Account Creation:**

```typescript
{
  email: 'user@example.com', // From OAuth provider
  fullName: 'John Doe', // From OAuth provider
  role: 'STUDENT', // From register init request - PERMANENT
  passwordHash: null, // OAuth-only account
  googleId: 'google_123', // OR githubId
  isEmailVerified: true, // Trusted from OAuth
  emailVerifiedAt: new Date(),
  profilePictureUrl: 'https://...', // From provider
  bio: 'Developer', // From provider (if available)
  skills: [] // Empty, user adds later
}
```

**Transaction Safety:**

User and refresh token created atomically:

```typescript
await tx.user.create({ ... })
await tx.refreshToken.create({ token, expiresAt: +7 days })
// ↑ Both succeed or both fail
```

**Success Redirect:** Same as login flow (tokens in URL fragment)

**Error Codes:**

| Code             | Meaning                     | User Action        |
| ---------------- | --------------------------- | ------------------ |
| `account_exists` | Email or provider ID exists | Use Login flow     |
| (other errors)   | Same as login flow          | Same as login flow |

---

### OAuth Account Linking Scenarios

| Scenario                       | Flow Used    | Result                                                     |
| ------------------------------ | ------------ | ---------------------------------------------------------- |
| User has email account         | Login        | Provider linked automatically, authenticated               |
| User has email + Google linked | GitHub Login | GitHub linked, user authenticated (now has 3 auth methods) |
| Email already exists           | Register     | Error 409 - must use Login                                 |
| User registered via Google     | GitHub Login | GitHub linked, authenticated                               |
| Same Google ID exists          | Register     | Error 409 - must use Login                                 |

**Multi-Auth Example:**

User can authenticate via:

1. Email + password (if `passwordHash` exists)
2. Google OAuth (if `googleId` exists)
3. GitHub OAuth (if `githubId` exists)

**Provider ID Uniqueness:**

- Same Google ID → Only ONE Codionix account
- Same GitHub ID → Only ONE Codionix account
- Same email → Only ONE Codionix account (but can have multiple providers)

---

### Email Changes at Provider

**What Happens:**

If user changes email at Google/GitHub, then logs into Codionix:

```typescript
// Before
{ email: 'old@example.com', googleId: '123' }

// After login with Google (email changed to new@example.com)
{ email: 'new@example.com', googleId: '123' }
```

**Safety:** No duplicate email issues (email is unique in database)

---

## Session Management

### Password Reset Behavior

**What Changes:**

- ✅ Password hash updated
- ✅ Reset token cleared

**What Does NOT Change:**

- ❌ Existing refresh tokens remain valid
- ❌ Active sessions continue working

**Security Gap:**

- If account compromised → attacker's sessions remain valid
- User must manually logout all sessions

**Force Logout All Sessions:**

1. User resets password
2. User calls `/logout` with each active refresh token
3. OR: Admin manually deletes refresh tokens from database

---

### Multi-Device Logout

**Logout Single Device:**

```
POST /logout
{ "refreshToken": "..." }
```

**Logout All Devices:**

- No built-in endpoint
- Client must track all refresh tokens
- Call `/logout` for each token

---

## Error Handling

### Standard Error Response

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "errorId": "a1b2c3d4-...",
    "correlationId": "req_xyz789",
    "details": [] // Optional, for validation errors
  }
}
```

### Error Codes

| Code                  | HTTP | Description                 | Resolution                     |
| --------------------- | ---- | --------------------------- | ------------------------------ |
| `VALIDATION_ERROR`    | 400  | Invalid request data        | Fix request payload            |
| `UNAUTHORIZED`        | 401  | Missing/invalid credentials | Re-authenticate                |
| `FORBIDDEN`           | 403  | Insufficient permissions    | Check user role                |
| `NOT_FOUND`           | 404  | Resource not found          | Register if new user           |
| `CONFLICT`            | 409  | Resource already exists     | Use login instead of register  |
| `RATE_LIMIT_EXCEEDED` | 429  | Too many requests           | Wait for window expiry         |
| `INTERNAL_ERROR`      | 500  | Server error                | Contact support with `errorId` |

---

## Security Considerations

### Token Storage Best Practices

**Access Token:**

- ✅ Store in memory (React state)
- ✅ OR sessionStorage (cleared on tab close)
- ❌ NEVER localStorage (XSS vulnerability)

**Refresh Token:**

- ✅ Store in memory or sessionStorage
- ✅ OR httpOnly cookie (requires backend changes)
- ❌ NEVER localStorage (XSS vulnerability)

### Token Refresh Strategy

**Proactive Refresh (Recommended):**

```javascript
// Refresh 1 minute before expiry
setTimeout(
  () => {
    refreshAccessToken();
  },
  14 * 60 * 1000,
); // 14 minutes
```

**Reactive Refresh:**

```javascript
// On 401, try refresh once
if (response.status === 401) {
  const tokens = await refreshAccessToken();
  // Retry original request with new token
}
```

### OAuth Security Notes

**URL Fragment Security:**

- Tokens in URL fragment (after `#`)
- Fragment NOT sent to server, NOT logged
- Frontend MUST extract and clear immediately
- Use `history.replaceState()` to clear URL

**State Token Security:**

- Server-side storage (tamper-proof)
- 5-minute expiration
- Single-use consumption
- CSRF protection via nonce

### Common Security Pitfalls

**❌ Storing tokens in localStorage:**

- Vulnerable to XSS attacks
- Attacker can steal tokens via malicious scripts

**❌ Not clearing URL after OAuth:**

- Tokens visible in browser history
- User can accidentally bookmark authenticated URLs

**❌ Reusing refresh tokens:**

- Token rotation prevents this
- Same token used twice → both sessions invalidated

**❌ Assuming password reset logs out users:**

- Password reset does NOT invalidate sessions
- User must manually logout all devices

---

## Common Integration Questions

**Q: Can users have both email/password AND OAuth?**  
**A:** Yes. Users can link multiple auth methods to the same account (matched by email).

**Q: What if OAuth email changes at provider?**  
**A:** Email automatically updated in database on next login.

**Q: Can ADMIN users be created via OAuth?**  
**A:** No. ADMIN role must be assigned manually in database.

**Q: What happens if I use REGISTER flow but account exists?**  
**A:** Backend returns 409 Conflict with error code `account_exists`. Use LOGIN flow instead.

**Q: What happens if I use LOGIN flow but account doesn't exist?**  
**A:** Backend returns 404 Not Found with error code `account_not_found`. Use REGISTER flow instead.

**Q: Can I change my email?**  
**A:** No. Email is immutable. Create new account if needed.

**Q: Does password reset invalidate sessions?**  
**A:** No. Existing sessions remain valid. User must manually logout each session.

**Q: Can OAuth users set a password later?**  
**A:** Not supported via API. OAuth-only accounts cannot use email/password login.

**Q: What if user loses access to OAuth provider?**  
**A:** Account cannot be recovered via API. Contact support for manual intervention.

**Q: How do I logout all devices?**  
**A:** No built-in endpoint. Call `/logout` for each refresh token, or contact admin.

---

**Document Version:** 2.0  
**Last Reviewed:** January 2026  
**Maintained By:** Codionix Backend Team
