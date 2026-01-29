# Authentication API

**Base URL:** `https://api.codionix.com/api/v1/auth`

All endpoints are public unless marked otherwise.

---

## Authentication Architecture

### Token System

**Access Tokens:**

- **Lifespan:** 15 minutes
- **Storage:** Client-side (memory or sessionStorage recommended)
- **Usage:** `Authorization: Bearer {access_token}` header on protected endpoints
- **Payload:** `{ userId, email, role, iat, exp }`
- **Cannot be revoked** — remains valid until expiration

**Refresh Tokens:**

- **Lifespan:** 7 days
- **Storage:** Database (server-side), client receives token in response
- **Usage:** Exchange for new access token via `/refresh` endpoint
- **Revocable:** Can be invalidated via `/logout`
- **Single-use:** Consuming a refresh token issues a new one and revokes the old

**Token Delivery:**

- **Email/Password Auth:** JSON response body
- **OAuth Auth:** URL fragment (`#access_token=...&refresh_token=...`)
- **NOT** delivered via httpOnly cookies
- Frontend responsible for secure storage

### Rate Limiting

| Endpoint Group                                               | Limit        | Window | Tracking                        |
| ------------------------------------------------------------ | ------------ | ------ | ------------------------------- |
| `/register`, `/login`, `/forgot-password`, `/reset-password` | 10 requests  | 15 min | Per IP                          |
| `/verify-email`, `/resend-verification`                      | 3 requests   | 15 min | Per IP                          |
| OAuth init (`/oauth/*/init`)                                 | 10 requests  | 15 min | Per IP                          |
| OAuth callbacks                                              | 20 requests  | 15 min | Per IP (skipped if valid state) |
| All other auth endpoints                                     | 200 requests | 15 min | Per IP                          |

**Sliding Window Behavior:**

- Timer resets individually per request, not at fixed intervals
- Example: Request at 00:00 expires at 00:15, not at next 15-min block

**Rate Limit Exceeded (429):**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many authentication attempts. Please try again in 15 minutes."
  }
}
```

**Response Headers:**

```
RateLimit-Limit: 10
RateLimit-Remaining: 7
RateLimit-Reset: 1706094900
```

---

## Email/Password Authentication

### Register

**`POST /register`**

Create new user account. Sends email verification.

**Request:**

```json
{
  "email": "student@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe",
  "role": "STUDENT"
}
```

**Field Validation:**

| Field      | Constraints                                                                              |
| ---------- | ---------------------------------------------------------------------------------------- | ------ |
| `email`    | Valid email format, unique in database                                                   |
| `password` | Min 8 chars, ≥1 uppercase, ≥1 lowercase, ≥1 number, ≥1 special char (`!@#$%^&\*(),.?":{} | <>\_`) |
| `fullName` | 2-100 characters, trimmed                                                                |
| `role`     | `STUDENT`, `MENTOR`, or `EMPLOYER` (ADMIN not allowed)                                   |

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
3. Verification email queued (asynchronous, non-blocking)
4. Refresh token stored in database
5. User can use API immediately (email verification NOT required for access)

**Error Responses:**

**409 Conflict — Email Exists:**

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
      },
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

---

### Login

**`POST /login`**

Authenticate existing user with email and password.

**Request:**

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
      "profilePictureUrl": "https://res.cloudinary.com/codionix/...",
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

**401 Unauthorized — Invalid Credentials:**

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid email or password"
  }
}
```

**Security Note:** Response is identical whether email doesn't exist or password is wrong (prevents email enumeration).

**401 Unauthorized — OAuth-Only Account:**

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
- Account has no password set (`passwordHash` is `null`)
- User must use OAuth flow to authenticate

---

### Verify Email

**`POST /verify-email`**

Verify email address using token from verification email.

**Request:**

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
4. Welcome email queued (sent immediately after verification)

**Error Responses:**

**401 Unauthorized — Invalid/Expired Token:**

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired verification token"
  }
}
```

**Causes:**

- Token doesn't exist in database
- Token expired (>24 hours old)
- Token already used (cleared after first verification)

**400 Validation Error — Already Verified:**

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

### Resend Verification Email

**`POST /resend-verification`**

Request new verification email.

**Request:**

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

**Security:** Response does NOT reveal whether email exists in database.

**Side Effects (if email exists AND unverified):**

1. New verification token generated
2. Old token invalidated
3. New verification email queued
4. 24-hour expiry set

**Behavior if email already verified:**

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

### Refresh Access Token

**`POST /refresh`**

Exchange refresh token for new access token.

**Request:**

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

**CRITICAL BEHAVIOR:**

- Old refresh token is **revoked** (marked `isRevoked: true` in database)
- New refresh token is **generated and returned**
- Both tokens returned in response (access + refresh)
- Frontend MUST replace old refresh token with new one

**Token Rotation Security:**

- Prevents refresh token reuse
- If same refresh token used twice → both sessions invalidated
- Forces clients to maintain single active session per token

**Error Responses:**

**401 Unauthorized — Invalid Token:**

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
- Token already revoked (`isRevoked: true`)
- Token expired (>7 days old)
- User deleted from database

---

### Logout

**`POST /logout`**

Revoke refresh token.

**Request:**

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

1. Refresh token marked as `isRevoked: true` in database
2. Token can no longer be used to get new access tokens

**CRITICAL LIMITATION:**

- Access token **remains valid** until expiration (max 15 minutes)
- Backend cannot revoke access tokens (stateless JWTs)
- Client MUST discard access token immediately
- For multi-device logout, client must call `/logout` for each session's refresh token

**Security Implication:**
If attacker steals access token before logout, they have up to 15 minutes of access.

---

### Get Current User

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

**Error Response (401):**

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "No token provided"
  }
}
```

---

### Forgot Password

**`POST /forgot-password`**

Request password reset email.

**Request:**

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

**Security:** Response does NOT reveal whether email exists.

**Side Effects (if email exists):**

1. Reset token generated (cryptographically random, 64 chars)
2. Reset token expiry set (1 hour from now)
3. Password reset email queued

**Token Security:**

- Single-use (cleared after successful password reset)
- 1-hour expiration
- Stored hashed in database

---

### Reset Password

**`POST /reset-password`**

Reset password using token from email.

**Request:**

```json
{
  "token": "b4e6f9a2c5d8e1f3a7b9c2d4e6f8a0b3c5d7e9f1a3b5c7d9e1f3a5b7c9e1f3a5",
  "password": "NewSecurePass456!"
}
```

**Password Validation:** Same rules as registration.

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

**To Force Re-Login Everywhere:**

1. Reset password via this endpoint
2. Call `/logout` for each active refresh token (if known)
3. OR: Admin must manually revoke all refresh tokens in database

**Error Responses:**

**401 Unauthorized — Invalid/Expired Token:**

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired reset token"
  }
}
```

---

## OAuth Authentication

### OAuth Providers

**Supported:** Google, GitHub

**Provider Configuration:**

| Provider | Callback URL                                | Required Scopes                      | Email Verification       |
| -------- | ------------------------------------------- | ------------------------------------ | ------------------------ |
| Google   | `{BACKEND_URL}/api/v1/auth/google/callback` | `userinfo.email`, `userinfo.profile` | Required                 |
| GitHub   | `{BACKEND_URL}/api/v1/auth/github/callback` | `user:email`, `read:user`            | Required (primary email) |

**Example Production Callback URLs:**

- Google: `https://api.codionix.com/api/v1/auth/google/callback`
- GitHub: `https://api.codionix.com/api/v1/auth/github/callback`

**Email Verification Requirement:**

- **Google:** User's email must be verified at Google
- **GitHub:** User's primary email must be verified at GitHub
- If email not verified at provider → OAuth flow fails with 401

### OAuth Flows

**Two Separate Flows:**

1. **LOGIN Flow** (`/oauth/login/init`)
   - For existing users ONLY
   - Authenticates via OAuth provider
   - Links provider to existing account if not already linked
   - Uses account's existing role
   - Fails if account doesn't exist

2. **REGISTER Flow** (`/oauth/register/init`)
   - For new users ONLY
   - Creates account with provider
   - Requires role selection (STUDENT, MENTOR, or EMPLOYER)
   - Fails if account already exists

**CRITICAL DISTINCTION:**

- Role is assigned ONLY during REGISTER flow
- LOGIN flow uses existing account's role
- Frontend MUST use correct flow based on whether user has account

### State Management

**Server-Side State Storage:**

- State tokens stored in-memory (single-instance deployment)
- NOT sent to client (prevents tampering)
- 5-minute expiration
- Single-use (consumed on callback)
- CSRF protection via nonce

**State Token Structure:**

```typescript
{
  provider: 'google' | 'github',
  flow: 'login' | 'register',
  role?: 'STUDENT' | 'MENTOR' | 'EMPLOYER', // Only for register flow
  nonce: string, // Random 32-char hex
  createdAt: number,
  expiresAt: number
}
```

---

### OAuth Login Flow

**Important:** Login flow is for **existing users only**. New users must use the Register flow.

**Step 1: Initialize OAuth Login**

**`POST /oauth/login/init`**

Generate OAuth authorization URL for login.

**Request:**

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
3. Provider redirects to backend callback URL

**State Token:**

- Generated server-side
- Embedded in `authUrl` as `state` parameter
- 5-minute expiration
- Contains: `{ provider: 'google', flow: 'login', nonce, timestamps }`

---

**Step 2: OAuth Callback (Backend Handles Automatically)**

**`GET /auth/google/callback`**  
**`GET /auth/github/callback`**

**Query Parameters:**

- `code`: Authorization code from provider
- `state`: State token from init
- `error`: (optional) Error code from provider
- `error_description`: (optional) Error description

**Backend Processing:**

1. Validates state token (exists, not expired, matches provider)
2. Exchanges code for access token at provider
3. Fetches user profile from provider
4. **LOGIN LOGIC (Ordered Priority):**
   - **Step A:** Check if provider ID linked (`googleId` or `githubId`) → Authenticate user with existing account
   - **Step B:** If provider ID not found, check if email exists → Link provider to existing account and authenticate
   - **Step C:** If neither provider ID nor email exists → Fail with 404, user must register first

**Success Redirect:**

```
{FRONTEND_URL}/auth/oauth/success#access_token={token}&refresh_token={token}
```

**Account Linking Details (Step B):**

When user already has account via email/password and logs in with OAuth, the provider gets linked:

```typescript
// Example: User registered with email/password, then logs in with Google
{
  googleId: 'google_provider_id', // Now linked
  // Other fields unchanged
}
```

After linking, user can authenticate using:

- Email + password
- Google OAuth
- GitHub OAuth (if also linked)

**Error Redirect:**

```
{FRONTEND_URL}/auth/oauth/error?provider={google|github}&error={code}
```

**Error Codes:**

| Code                 | Cause                                                |
| -------------------- | ---------------------------------------------------- |
| `missing_parameters` | No code or state in callback                         |
| `callback_failed`    | Backend processing error (check logs for details)    |
| `access_denied`      | User denied authorization at provider                |
| `unverified_email`   | Email not verified at provider (Google or GitHub)    |
| (Implied 404)        | No account found - user must use REGISTER flow first |

**What Happens If Account Doesn't Exist:**

- User is redirected to `/auth/oauth/error?provider={provider}&error=callback_failed`
- Error response body (if accessible): 404 Not Found - "No account exists for this email"
- **User must use OAuth Register flow to create account**

---

**Step 3: Frontend Token Extraction**

**Success URL Format:**

```
https://frontend.com/auth/oauth/success#access_token=eyJ...&refresh_token=eyJ...
```

**Extraction (JavaScript):**

```javascript
const hash = window.location.hash.substring(1); // Remove '#'
const params = new URLSearchParams(hash);
const accessToken = params.get("access_token");
const refreshToken = params.get("refresh_token");
```

**Security:**

- Tokens in URL fragment (not sent to server)
- Frontend must extract and store immediately
- Clear URL after extraction

---

### OAuth Register Flow

**Important:** Register flow is for **new users only**. Existing users must use the Login flow. The role is permanently assigned during registration and cannot be changed later via OAuth.

**Step 1: Initialize OAuth Register**

**`POST /oauth/register/init`**

Generate OAuth authorization URL for registration.

**Request:**

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

**State Token Contains:**

```typescript
{
  provider: 'github',
  flow: 'register',
  role: 'STUDENT', // User-selected role - PERMANENT
  nonce: '...',
  createdAt: ...,
  expiresAt: ...
}
```

**CRITICAL:** Role selected here is permanent and becomes the user's account role.

---

**Step 2: OAuth Callback (Backend Handles Automatically)**

**Backend Processing:**

1. Validates state token
2. Exchanges code for access token
3. Fetches user profile from provider
4. **REGISTER LOGIC - SAFETY CHECKS:**
   - Check if email exists → Fail with 409 Conflict
   - Check if provider ID already linked (`googleId` or `githubId`) → Fail with 409 Conflict
   - If both checks pass → Create new user atomically (transaction)

**Account Creation Details:**

When user doesn't exist, a new account is created with:

| Field                    | Value                              | Notes                                        |
| ------------------------ | ---------------------------------- | -------------------------------------------- |
| `email`                  | From OAuth provider (verified)     | Required, unique, taken from provider        |
| `fullName`               | From OAuth provider                | Required, taken from provider profile        |
| `role`                   | From register init request         | **PERMANENT** (STUDENT, MENTOR, or EMPLOYER) |
| `passwordHash`           | `null`                             | OAuth-only account, no password              |
| `googleId` OR `githubId` | Provider-specific ID               | Links account to provider                    |
| `isEmailVerified`        | `true`                             | Trusted directly from OAuth provider         |
| `emailVerifiedAt`        | Current timestamp                  | Set immediately                              |
| `profilePictureUrl`      | From OAuth provider (if available) | Avatar copied to profile                     |
| `bio`                    | From OAuth provider (if available) | Bio copied from provider                     |
| `skills`                 | Empty array `[]`                   | User must add skills later via profile edit  |

**Transaction Guarantee:**

User and refresh token created atomically - both succeed or both fail:

```typescript
// Both operations happen together or not at all
tx.user.create({ ... })
tx.refreshToken.create({ token, expiresAt: +7 days })
```

**Success Redirect:** Same as login flow (tokens in URL fragment)  
**Error Redirect:** Same as login flow

**Error Responses:**

**409 Conflict — Account Already Exists:**

```
{FRONTEND_URL}/auth/oauth/error?provider=google&error=callback_failed
```

Error body (if accessible): "Account already exists. Please use login instead."

**Causes:**

- Email already registered in system
- Provider ID already linked to another account

**Action for Frontend:**

User should use OAuth Login flow instead (to link the provider or authenticate with existing account).

---

### OAuth Account Linking Summary

**Linking Mechanisms:**

1. **Automatic Linking on Login:**
   - User logs in with OAuth (Login flow)
   - If provider not linked but email exists → Provider gets linked
   - User authenticated with existing account

2. **Explicit Linking (Email + Password First):**
   - User registers with email/password
   - Later uses OAuth Login → Provider linked to email account
   - User can now authenticate 3 ways: email/password, Google, GitHub

3. **Cannot Link on Register:**
   - Register flow creates new users only
   - Fails if account exists (returns 409)
   - No linking happens during registration

**Account Scenario Examples:**

| Scenario                               | Action                    | Result                                                |
| -------------------------------------- | ------------------------- | ----------------------------------------------------- |
| User has email account                 | Uses OAuth Login          | Provider linked, user authenticated                   |
| User has email account + Google linked | Uses GitHub Login         | GitHub linked, user authenticated with 3 auth methods |
| Email already exists                   | Uses OAuth Register       | Error 409 - must use Login flow                       |
| User registers via Google              | Uses GitHub in Login flow | GitHub linked, user authenticated                     |

---

### Role Assignment in OAuth

**Critical Behavior:**

- **Register Flow:** Role assigned by frontend during init request (`/oauth/register/init`)
  - Role selection is **MANDATORY**
  - Role is **PERMANENT** - cannot change via OAuth later
  - Stored in database and used for all authorization checks
- **Login Flow:** Role ignored
  - User authenticates with existing account's role
  - Role cannot be changed via OAuth
  - Must use dedicated role update endpoint if role change needed

**To Change User Role After Registration:**

- Cannot use OAuth flows
- Must use dedicated user/admin endpoint (outside scope of this doc)
- Requires authentication and authorization checks

---

### OAuth Error Handling

**Provider Authorization Errors:**

User cancels at provider:

```
{FRONTEND_URL}/auth/oauth/error?provider=google&error=access_denied
```

**Backend Processing Errors:**

State expired:

```
{FRONTEND_URL}/auth/oauth/error?provider=github&error=callback_failed
```

**Email Not Verified at Provider:**

OAuth flow fails during email validation:

```
{FRONTEND_URL}/auth/oauth/error?provider=google&error=unverified_email
```

Frontend should display: "Please verify your email at Google/GitHub first."

**Account Already Exists (REGISTER Flow):**

```
{FRONTEND_URL}/auth/oauth/error?provider=google&error=callback_failed
```

Frontend should display: "Account already exists. Please use login instead."

**Account Doesn't Exist (LOGIN Flow):**

```
{FRONTEND_URL}/auth/oauth/error?provider=github&error=callback_failed
```

Frontend should display: "No account found. Please register first."

**How to Differentiate:** Both return `callback_failed`, but:

- If user clicked "Register" button → Account exists (use login)
- If user clicked "Login" button → Account doesn't exist (use register)

---

## Session Management

### Password Reset Behavior

**What Happens:**

- ✅ Password hash updated
- ✅ Reset token cleared
- ❌ Existing refresh tokens **NOT** revoked

**Security Gap:**

- Active sessions remain valid after password reset
- If account compromised, attacker retains access until:
  - Refresh tokens expire (7 days)
  - User manually logs out each session
  - Admin manually revokes tokens in database

**Force Logout All Sessions:**

1. User resets password
2. User must call `/logout` with each active refresh token
3. If refresh tokens unknown, admin must manually delete from database

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
- OR: Admin deletes all refresh tokens for user in database

---

## Error Codes

| Code                  | HTTP Status | Description                 | Resolution                           |
| --------------------- | ----------- | --------------------------- | ------------------------------------ |
| `VALIDATION_ERROR`    | 400         | Invalid request data        | Fix request payload                  |
| `UNAUTHORIZED`        | 401         | Missing/invalid credentials | Re-authenticate                      |
| `CONFLICT`            | 409         | Resource already exists     | Use different email or login instead |
| `NOT_FOUND`           | 404         | Resource not found          | Register if new user                 |
| `RATE_LIMIT_EXCEEDED` | 429         | Too many requests           | Wait for window expiry               |
| `INTERNAL_ERROR`      | 500         | Server error                | Contact support with `errorId`       |

**All errors include:**

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "errorId": "a1b2c3d4-...", // For support
    "correlationId": "req_xyz789" // For debugging
  }
}
```

---

## Frontend Integration Guide

### Recommended Token Storage

**Access Token:**

- Store in memory (variable/state)
- OR: sessionStorage (cleared on tab close)
- AVOID: localStorage (XSS risk)

**Refresh Token:**

- Store in memory or sessionStorage
- OR: httpOnly cookie (requires backend changes)

### Token Refresh Strategy

**Proactive Refresh:**

```javascript
// Refresh token 1 minute before expiry
setTimeout(
  () => {
    fetch("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  },
  14 * 60 * 1000,
); // 14 minutes (1 min before expiry)
```

**Reactive Refresh:**

```javascript
// On 401, try refresh once
if (response.status === 401) {
  const tokens = await refreshAccessToken();
  // Retry original request with new token
}
```

---

## Critical Implementation Guidance

### Frontend Flow Decision Logic

**User clicks "Sign in with Google":**

```
Does user have existing account?
├── YES → Use Login flow: POST /oauth/login/init
└── NO → Use Register flow: POST /oauth/register/init
```

**Handling Errors:**

- **Login flow returns 404/error:** User doesn't have account → Ask user to register
- **Register flow returns 409:** Account exists → Ask user to login instead

### Important Security & Design Notes

**1. OAuth-Only Accounts Have No Password**

When user registers via OAuth:

- `passwordHash` is `null` in database
- User **cannot** login with email/password
- User **must** use OAuth to authenticate
- If user tries to login with email/password → Error: "This account uses Google login"

**2. Role is Permanent After Registration**

- Role assigned during `/oauth/register/init` is **NOT changeable** via OAuth
- User is locked into STUDENT/MENTOR/EMPLOYER role forever
- Role change must be done by:
  - User editing profile (if allowed by frontend)
  - Admin dashboard (if admin endpoint exists)
- **Frontend responsibility:** Ensure role selection UI is clear and user understands choice is permanent

**3. Password Reset Does NOT Logout Other Devices**

- When user resets password → Active sessions remain valid
- User retains access for up to 7 days (until refresh token expires)
- **Security gap:** If account compromised and password reset, hacker keeps access
- **Mitigation:** Frontend should show warning to logout other devices manually

**4. Email/Password vs OAuth Account Conflict**

- User registers with email/password → Gets account
- Same email used to login with Google (in Login flow)
- Backend **automatically links** Google to that email account
- User now has both password-based and OAuth access
- **This is intentional and safe** (email verified at both places)

**5. Provider ID Uniqueness**

- Same Google ID cannot have multiple Codionix accounts
- Same GitHub ID cannot have multiple Codionix accounts
- But same email CAN have multiple OAuth provider IDs (Google + GitHub)
- **Example:** alice@example.com → {googleId: '123', githubId: '456'}

**6. Email Changes at Provider**

- If user changes email at Google, then logs into Codionix
- Codionix will update email in database to new one
- No duplicate email issues (email is globally unique in Codionix)

### Common Mistakes & How to Avoid

**❌ Mistake 1: Using Login flow for new users**

- User tries to login without account
- Redirected to error page
- User confused about what to do next

**✓ Solution:**

- Frontend detects if user has account (from UI state or localStorage)
- Show appropriate button (Login vs Register)
- Or show both buttons side-by-side

**❌ Mistake 2: Ignoring role selection in Register flow**

- User registers as STUDENT
- User wants to change to MENTOR later
- Not possible via OAuth (role is permanent)
- User feels trapped

**✓ Solution:**

- Clear UI that role selection is permanent
- Explain role differences before selection
- If really needed, implement admin dashboard role change (external to OAuth)

**❌ Mistake 3: Storing tokens in localStorage**

- Tokens in localStorage vulnerable to XSS attacks
- Attacker steals token and has access

**✓ Solution:**

- Access token: Memory (sessionStorage at worst)
- Refresh token: SessionStorage (cleared on browser close)
- Or use httpOnly cookies (requires backend support)

**❌ Mistake 4: Not clearing URL hash after token extraction**

```javascript
// BAD: URL still contains tokens
// User bookmarks page → Tokens now in browser history
console.log(window.location.hash); // Contains tokens

// GOOD: Clear URL after extraction
history.replaceState(null, "", window.location.pathname);
```

**✓ Solution:**

- Extract tokens immediately
- Clear URL fragment with `history.replaceState()`
- Ensure tokens never visible in browser history

### OAuth Flows Recap

| Aspect            | Login Flow                                                       | Register Flow               |
| ----------------- | ---------------------------------------------------------------- | --------------------------- |
| **Endpoint Init** | `POST /oauth/login/init`                                         | `POST /oauth/register/init` |
| **Use Case**      | Existing users                                                   | New users                   |
| **Role Needed**   | No                                                               | Yes (mandatory)             |
| **Callback URL**  | `/api/v1/auth/google/callback` OR `/api/v1/auth/github/callback` | Same                        |
| **Account Check** | Must exist                                                       | Must NOT exist              |
| **Success**       | Existing account authenticated                                   | New account created         |
| **Linking**       | Automatic (if email match)                                       | Never                       |
| **Result**        | Tokens in URL fragment                                           | Tokens in URL fragment      |

---

### OAuth Integration

**Login Button Click:**

```javascript
async function handleGoogleLogin() {
  const res = await fetch("/api/v1/auth/oauth/login/init", {
    method: "POST",
    body: JSON.stringify({ provider: "google" }),
  });
  const { authUrl } = await res.json();
  window.location.href = authUrl; // Redirect to Google
}
```

**Register Button Click:**

```javascript
async function handleGithubRegister(role) {
  const res = await fetch("/api/v1/auth/oauth/register/init", {
    method: "POST",
    body: JSON.stringify({ provider: "github", role }),
  });
  const { authUrl } = await res.json();
  window.location.href = authUrl;
}
```

**Success Page:**

```javascript
// /auth/oauth/success
const hash = window.location.hash.substring(1);
const params = new URLSearchParams(hash);
const accessToken = params.get("access_token");
const refreshToken = params.get("refresh_token");

// Store tokens
sessionStorage.setItem("access_token", accessToken);
sessionStorage.setItem("refresh_token", refreshToken);

// Clear URL
window.history.replaceState({}, "", "/dashboard");
```

**Error Page:**

```javascript
// /auth/oauth/error?provider=google&error=access_denied
const params = new URLSearchParams(window.location.search);
const provider = params.get("provider");
const error = params.get("error");

// Display error to user
alert(`${provider} login failed: ${error}`);
```

---

## Common Questions

**Q: Can users have both email/password AND OAuth?**  
**A:** Yes. Users can link multiple auth methods to same account (matched by email).

**Q: What if OAuth email changes at provider?**  
**A:** Email automatically updated in database on next login (preserves account).

**Q: Can admin users be created via OAuth?**  
**A:** No. ADMIN role must be assigned manually in database. OAuth only allows STUDENT, MENTOR, EMPLOYER.

**Q: What happens if I call REGISTER flow but account exists?**  
**A:** Backend returns 409 Conflict. Frontend should redirect to login flow.

**Q: What happens if I call LOGIN flow but account doesn't exist?**  
**A:** Backend returns 404 Not Found. Frontend should redirect to register flow.

**Q: Can I change my email?**  
**A:** No. Email is immutable. Create new account if needed.

**Q: How do I logout all devices?**  
**A:** No built-in endpoint. Must call `/logout` for each refresh token. Admin can manually delete tokens from database.

**Q: Does password reset invalidate sessions?**  
**A:** No. Existing sessions remain valid. User must manually logout each session.

**Q: Can OAuth users set a password later?**  
**A:** Not supported via API. OAuth-only accounts cannot use email/password login.

**Q: What if user loses access to OAuth provider?**  
**A:** Account cannot be recovered via API. Must contact support for manual intervention.

**Q: Are refresh tokens transferable between devices?**  
**A:** Technically yes (just a string), but NOT recommended. Each device should have its own refresh token for security.
