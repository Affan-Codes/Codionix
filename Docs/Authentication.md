# Authentication API

Base URL: `https://api.codionix.com/api/v1/auth`

All endpoints are **public** unless marked otherwise.

---

## Token Architecture

**Access Tokens:**

- Lifespan: 15 minutes
- Usage: Include in `Authorization: Bearer {token}` header
- Payload: `{ userId, email, role, iat, exp }`

**Refresh Tokens:**

- Lifespan: 7 days
- Usage: Exchange for new access token via `/refresh`
- Storage: Database (revocable)

**Token Delivery:**

- Returned in JSON response body (NOT httpOnly cookies)
- Frontend responsible for storage strategy
- **Recommendation:** Memory/sessionStorage (avoid localStorage due to XSS risk)

---

## OAuth Configuration

### Provider Setup

**Google OAuth:**

- Callback URL: `{BACKEND_URL}/api/v1/auth/google/callback`
- Required scopes: `userinfo.email`, `userinfo.profile`
- Email must be verified at Google

**GitHub OAuth:**

- Callback URL: `{BACKEND_URL}/api/v1/auth/github/callback`
- Required scopes: `user:email`, `read:user`
- Primary email must be verified at GitHub

### OAuth Flow

1. **Frontend:** POST `/oauth/init` with `{ provider, role }`
2. **Backend:** Returns authorization URL with server-side state token
3. **Frontend:** Redirect user to authorization URL
4. **User:** Authorizes on provider's site
5. **Provider:** Redirects to backend callback URL
6. **Backend:** Validates state, exchanges code for tokens, creates/links user
7. **Backend:** Redirects to frontend with tokens in URL fragment

**Frontend Success Redirect:**

```
{FRONTEND_URL}/auth/oauth/success#access_token={token}&refresh_token={token}
```

**Frontend Error Redirect:**

```
{FRONTEND_URL}/auth/oauth/error?provider={google|github}&error={code}
```

**Token Extraction (Frontend):**

```javascript
const hash = window.location.hash.substring(1);
const params = new URLSearchParams(hash);
const accessToken = params.get("access_token");
const refreshToken = params.get("refresh_token");
```

### Email Verification for OAuth

**Email/Password Users:** Must verify email via `/verify-email` endpoint.

**OAuth Users (Google/GitHub):** Email verification **skipped entirely** because:

- Provider guarantees email is verified
- User created with `isEmailVerified: true`
- No verification email sent
- Welcome email sent immediately

---

## Rate Limiting

### Limits by Endpoint

| Endpoint                                                     | Limit                 | Window |
| ------------------------------------------------------------ | --------------------- | ------ |
| `/register`, `/login`, `/forgot-password`, `/reset-password` | 10 requests           | 15 min |
| `/verify-email`, `/resend-verification`                      | 3 requests            | 15 min |
| OAuth endpoints (`/oauth/init`, callbacks)                   | 10 init, 20 callbacks | 15 min |
| All other endpoints                                          | 200 requests          | 15 min |

### Behavior

**Window Type:** Sliding window (NOT fixed intervals)

**Example:**

- Request #1 at 00:00 → counter = 1
- Request #10 at 00:05 → limit reached
- At 00:15:01 → request #1 expires, counter = 9, new request allowed

**Tracking:** Per IP address (not per user)

**Response Headers:**

```
RateLimit-Limit: 10
RateLimit-Remaining: 7
RateLimit-Reset: 1706094900
```

**Rate Limit Exceeded Response (429):**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many authentication attempts. Please try again in 15 minutes."
  }
}
```

---

## Session Management

### Password Reset Behavior

**What happens on password reset:**

- ✅ Password hash updated
- ✅ Reset token cleared
- ❌ Existing refresh tokens **NOT revoked**

**Security Implication:**

- If attacker has active refresh token, password reset doesn't invalidate it
- User must manually logout all sessions via `/logout` if compromised

**To force re-login everywhere:**

1. Change password via `/reset-password`
2. Call `/logout` for each active session (requires refresh token)

### Logout Behavior

**What `/logout` does:**

- Marks refresh token as `isRevoked: true` in database
- Access token remains valid until expiry (max 15 minutes)

**Frontend must:**

- Discard both access and refresh tokens immediately
- Redirect to login page
- Clear any user state

---

## Register

**`POST /register`**

Create new user account. Sends email verification.

### Request

```json
{
  "email": "student@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe",
  "role": "STUDENT"
}
```

**Validation:**

- `email`: Valid format
- `password`: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
- `fullName`: 2-100 characters
- `role`: `STUDENT`, `MENTOR`, or `EMPLOYER`

### Success Response (201)

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

- Email verification token generated (24-hour expiry)
- Verification email queued
- Refresh token stored in database

### Errors

**409 - Email exists:**

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "User with this email already exists"
  }
}
```

**400 - Validation failed:**

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

## Login

**`POST /login`**

Authenticate with email and password.

### Request

```json
{
  "email": "student@example.com",
  "password": "SecurePass123!"
}
```

### Success Response (200)

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

### Errors

**401 - Invalid credentials:**

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid email or password"
  }
}
```

**401 - OAuth-only account:**

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "This account uses Google login. Please sign in with Google."
  }
}
```

---

## OAuth Initialization

**`POST /oauth/init`**

Start OAuth flow. Returns provider authorization URL.

### Request

```json
{
  "provider": "google",
  "role": "STUDENT"
}
```

**Options:**

- `provider`: `google` or `github`
- `role`: `STUDENT`, `MENTOR`, or `EMPLOYER`

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
    "expiresIn": 300
  }
}
```

**State Token:**

- Stored server-side (in-memory for single instance, use Redis for multi-instance)
- 5-minute expiry
- Single-use (consumed on callback)
- Contains provider + role + nonce

**Frontend Action:**

1. Redirect user to `authUrl`
2. Wait for provider callback redirect

---

## OAuth Callbacks

**`GET /auth/google/callback`**  
**`GET /auth/github/callback`**

**Called by provider, not frontend.**

### Query Parameters

- `code`: Authorization code from provider
- `state`: State token from init
- `error`: Optional error code
- `error_description`: Optional error message

### Success Behavior

Backend redirects to:

```
{FRONTEND_URL}/auth/oauth/success#access_token={token}&refresh_token={token}
```

### Error Behavior

Backend redirects to:

```
{FRONTEND_URL}/auth/oauth/error?provider={google|github}&error={code}
```

**Error Codes:**

- `missing_parameters`: No code or state
- `callback_failed`: Backend error during processing
- Provider-specific errors passed through

### Account Linking

**If email exists with password:**

- OAuth provider ID added to existing account
- Profile picture updated (if not set)
- Bio updated (if provided by OAuth)
- Returns existing user with new tokens

**If email exists with different OAuth:**

- Error (cannot link multiple OAuth providers to same email)

**If new user:**

- Account created with `isEmailVerified: true`
- No email verification required
- Welcome email sent immediately

---

## Verify Email

**`POST /verify-email`**

Verify email with token from verification email.

### Request

```json
{
  "token": "a3f5d8c9e2b1f4a7d6c8e9f2b3a4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2"
}
```

### Success Response (200)

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

- `isEmailVerified` set to `true`
- `emailVerifiedAt` timestamp recorded
- Token cleared
- Welcome email queued

### Errors

**401 - Invalid/expired:**

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired verification token"
  }
}
```

**400 - Already verified:**

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

## Resend Verification

**`POST /resend-verification`**

Request new verification email.

### Request

```json
{
  "email": "student@example.com"
}
```

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "message": "If an account exists, a verification email has been sent"
  }
}
```

**Security:** Response does not reveal if email exists.

**Side Effects (if email exists and unverified):**

- New token generated
- Old token invalidated
- Verification email queued

---

## Refresh Token

**`POST /refresh`**

Get new access token using refresh token.

### Request

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Side Effects:**

- Old refresh token revoked
- New refresh token created

**Note:** Both tokens are returned (access + refresh).

### Errors

**401 - Invalid token:**

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid refresh token"
  }
}
```

---

## Logout

**`POST /logout`**

Revoke refresh token.

### Request

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

**Side Effects:**

- Refresh token marked as `isRevoked: true`

**Note:** Access token remains valid until expiry (max 15 min).

---

## Get Current User

**`GET /me`**

Get authenticated user's basic info.

**Authentication:** Required

### Success Response (200)

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

## Forgot Password

**`POST /forgot-password`**

Request password reset email.

### Request

```json
{
  "email": "student@example.com"
}
```

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "message": "If an account with that email exists, a reset link was sent."
  }
}
```

**Security:** Response does not reveal if email exists.

**Side Effects (if email exists):**

- Reset token generated (1-hour expiry)
- Reset email queued

---

## Reset Password

**`POST /reset-password`**

Reset password with token from email.

### Request

```json
{
  "token": "b4e6f9a2c5d8e1f3a7b9c2d4e6f8a0b3c5d7e9f1a3b5c7d9e1f3a5b7c9e1f3a5",
  "password": "NewSecurePass456!"
}
```

**Validation:**

- `password`: Same rules as registration

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "message": "Password reset successful"
  }
}
```

**Side Effects:**

- Password hash updated
- Reset token cleared
- **Existing refresh tokens NOT revoked** (sessions remain active)

**To force logout all sessions:**
User must call `/logout` for each active session.

---

## Error Codes

| Code                  | HTTP | Description                     |
| --------------------- | ---- | ------------------------------- |
| `VALIDATION_ERROR`    | 400  | Invalid request data            |
| `UNAUTHORIZED`        | 401  | Missing/invalid credentials     |
| `CONFLICT`            | 409  | Resource already exists         |
| `RATE_LIMIT_EXCEEDED` | 429  | Too many requests               |
| `INTERNAL_ERROR`      | 500  | Server error (includes errorId) |

All errors include `correlationId` for debugging:

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred",
    "errorId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "correlationId": "req_xyz789"
  }
}
```
