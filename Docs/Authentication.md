# Authentication API

Base URL: `https://api.codionix.com/api/v1/auth`

All authentication endpoints are **public** unless specified. Rate limiting applies to prevent abuse.

---

## Overview

Codionix uses **JWT-based authentication** with access/refresh token pairs:

- **Access tokens**: Short-lived (15 minutes), included in `Authorization: Bearer <token>` header
- **Refresh tokens**: Long-lived (7 days), used to obtain new access tokens
- **Email verification**: Required before full platform access

**Authentication flow:**

1. Register → Receive verification email
2. Verify email → Account activated
3. Login → Receive access + refresh tokens
4. Use access token for API requests
5. Refresh access token when expired

---

## Rate Limits

| Endpoint                                                     | Limit                     |
| ------------------------------------------------------------ | ------------------------- |
| `/register`, `/login`, `/forgot-password`, `/reset-password` | 10 requests / 15 minutes  |
| `/verify-email`, `/resend-verification`                      | 3 requests / 15 minutes   |
| All other endpoints                                          | 200 requests / 15 minutes |

---

## Register

**`POST /register`**

Create a new user account. Sends verification email automatically.

### Request Body

```json
{
  "email": "student@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe",
  "role": "STUDENT"
}
```

| Field      | Type   | Required | Constraints                                                     |
| ---------- | ------ | -------- | --------------------------------------------------------------- |
| `email`    | string | Yes      | Valid email format                                              |
| `password` | string | Yes      | Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char |
| `fullName` | string | Yes      | 2-100 characters                                                |
| `role`     | enum   | Yes      | `STUDENT`, `MENTOR`, or `EMPLOYER`                              |

### Success Response (201 Created)

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

**Side effects:**

- User created in database with `isEmailVerified: false`
- Email verification token generated (24-hour expiry)
- Verification email queued for delivery
- Refresh token stored in database

### Error Responses

**409 Conflict** - Email already exists

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "User with this email already exists"
  }
}
```

**400 Validation Error** - Invalid input

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

### Request Body

```json
{
  "email": "student@example.com",
  "password": "SecurePass123!"
}
```

### Success Response (200 OK)

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

**Side effects:**

- New refresh token created and stored
- User's `updatedAt` timestamp updated

### Error Responses

**401 Unauthorized** - Invalid credentials

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid email or password"
  }
}
```

**401 Unauthorized** - OAuth-only account

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

Start OAuth flow (Google or GitHub). Returns authorization URL to redirect user.

### Request Body

```json
{
  "provider": "google",
  "role": "STUDENT"
}
```

| Field      | Type | Required | Options                         |
| ---------- | ---- | -------- | ------------------------------- |
| `provider` | enum | Yes      | `google`, `github`              |
| `role`     | enum | Yes      | `STUDENT`, `MENTOR`, `EMPLOYER` |

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
    "expiresIn": 300
  }
}
```

**Instructions:**

1. Redirect user to `authUrl`
2. User authorizes on provider's site
3. Provider redirects back to `/auth/oauth/{provider}/callback`
4. Backend handles callback and redirects to frontend with tokens in URL fragment

**Frontend callback handling:**

```javascript
// Provider redirects to: https://yourapp.com/auth/oauth/success#access_token=...&refresh_token=...
const hash = window.location.hash.substring(1);
const params = new URLSearchParams(hash);
const accessToken = params.get("access_token");
const refreshToken = params.get("refresh_token");
```

### Error Response

**400 Validation Error**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Provider must be google or github"
  }
}
```

---

## Verify Email

**`POST /verify-email`**

Verify email address with token from verification email.

### Request Body

```json
{
  "token": "a3f5d8c9e2b1f4a7d6c8e9f2b3a4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2"
}
```

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "message": "Email verified successfully",
    "email": "student@example.com"
  }
}
```

**Side effects:**

- `isEmailVerified` set to `true`
- `emailVerifiedAt` timestamp recorded
- Verification token cleared
- Welcome email queued

### Error Responses

**401 Unauthorized** - Invalid/expired token

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired verification token"
  }
}
```

**400 Validation Error** - Already verified

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

## Resend Verification Email

**`POST /resend-verification`**

Request new verification email.

### Request Body

```json
{
  "email": "student@example.com"
}
```

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "message": "If an account exists, a verification email has been sent"
  }
}
```

**Note:** Response is intentionally vague to prevent email enumeration attacks.

**Side effects (if email exists and not verified):**

- New verification token generated
- Old token invalidated
- Verification email queued

---

## Refresh Token

**`POST /refresh`**

Obtain new access token using refresh token.

### Request Body

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Side effects:**

- Old refresh token revoked
- New refresh token created and stored

### Error Responses

**401 Unauthorized** - Invalid/expired/revoked token

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

Revoke refresh token (invalidates session).

### Request Body

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

**Side effects:**

- Refresh token marked as revoked in database

**Note:** Access tokens remain valid until expiry (15 minutes). Client should discard both tokens immediately.

---

## Get Current User

**`GET /me`**

Get authenticated user's basic info.

**Authentication:** Required (access token)

### Success Response (200 OK)

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

### Error Response

**401 Unauthorized** - Missing/invalid token

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

## Forgot Password

**`POST /forgot-password`**

Request password reset email.

### Request Body

```json
{
  "email": "student@example.com"
}
```

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "message": "If an account with that email exists, a reset link was sent."
  }
}
```

**Note:** Response is intentionally vague to prevent email enumeration.

**Side effects (if email exists):**

- Password reset token generated (1-hour expiry)
- Reset email queued

---

## Reset Password

**`POST /reset-password`**

Reset password using token from reset email.

### Request Body

```json
{
  "token": "b4e6f9a2c5d8e1f3a7b9c2d4e6f8a0b3c5d7e9f1a3b5c7d9e1f3a5b7c9e1f3a5",
  "password": "NewSecurePass456!"
}
```

| Field      | Type   | Constraints            |
| ---------- | ------ | ---------------------- |
| `token`    | string | Reset token from email |
| `password` | string | Same as registration   |

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "message": "Password reset successful"
  }
}
```

**Side effects:**

- Password hash updated
- Reset token cleared
- All existing refresh tokens remain valid

### Error Response

**401 Unauthorized** - Invalid/expired token

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

## Authentication Header Format

All protected endpoints require:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Access token payload:**

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "student@example.com",
  "role": "STUDENT",
  "iat": 1706094600,
  "exp": 1706095500
}
```

---

## Error Codes Reference

| Code                  | HTTP Status | Description                                 |
| --------------------- | ----------- | ------------------------------------------- |
| `VALIDATION_ERROR`    | 400         | Request body/params failed validation       |
| `UNAUTHORIZED`        | 401         | Missing, invalid, or expired credentials    |
| `CONFLICT`            | 409         | Resource already exists (duplicate email)   |
| `RATE_LIMIT_EXCEEDED` | 429         | Too many requests                           |
| `INTERNAL_ERROR`      | 500         | Server error (includes errorId for support) |

All error responses include `correlationId` for debugging:

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
