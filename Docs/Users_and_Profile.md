# Users & Profiles API

**Base URL:** `https://api.codionix.com/api/v1/users`

All endpoints require authentication unless specified.

---

## Get Current User Profile

**`GET /me`**

Retrieve complete profile for authenticated user.

**Authentication:** Required

**Response Fields:**

| Field               | Type     | Description                                 | Nullable |
| ------------------- | -------- | ------------------------------------------- | -------- |
| `id`                | UUID     | Unique user identifier                      | No       |
| `email`             | string   | User's email address                        | No       |
| `fullName`          | string   | Full display name (2-100 chars)             | No       |
| `role`              | enum     | `STUDENT`, `MENTOR`, `EMPLOYER`, or `ADMIN` | No       |
| `phone`             | string   | E.164 format phone number                   | Yes      |
| `bio`               | string   | User bio (max 500 chars)                    | Yes      |
| `profilePictureUrl` | string   | Cloudinary CDN URL                          | Yes      |
| `linkedinUrl`       | string   | Full LinkedIn profile URL                   | Yes      |
| `githubUrl`         | string   | Full GitHub profile URL                     | Yes      |
| `skills`            | string[] | Array of skills (max 20, each 1-50 chars)   | No       |
| `isEmailVerified`   | boolean  | Email verification status                   | No       |
| `createdAt`         | ISO 8601 | Account creation timestamp                  | No       |
| `updatedAt`         | ISO 8601 | Last profile update timestamp               | No       |

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "student@example.com",
    "fullName": "John Doe",
    "role": "STUDENT",
    "phone": "+1-555-123-4567",
    "bio": "CS student passionate about web development",
    "profilePictureUrl": "https://res.cloudinary.com/codionix/avatars/user_1706094600_abc123.jpg",
    "linkedinUrl": "https://linkedin.com/in/johndoe",
    "githubUrl": "https://github.com/johndoe",
    "skills": ["JavaScript", "React", "Node.js", "Python"],
    "isEmailVerified": true,
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-01-24T14:20:00.000Z"
  }
}
```

**Error Response (401 Unauthorized):**

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

## Update Current User Profile

**`PATCH /me`**

Update authenticated user's profile. All fields are optional. Only provided fields are updated.

**Authentication:** Required

**Request Body (all fields optional):**

```json
{
  "fullName": "John Michael Doe",
  "phone": "+1-555-987-6543",
  "bio": "Full-stack developer with 2 years of experience",
  "linkedinUrl": "https://linkedin.com/in/johnmdoe",
  "githubUrl": "https://github.com/johnmdoe",
  "skills": ["JavaScript", "TypeScript", "React", "Node.js", "PostgreSQL"]
}
```

**Field Validation Rules:**

| Field         | Min | Max | Format                             | Notes                                      |
| ------------- | --- | --- | ---------------------------------- | ------------------------------------------ |
| `fullName`    | 2   | 100 | String                             | Trimmed automatically                      |
| `phone`       | -   | -   | E.164 (`+1-555-123-4567`)          | Must match regex: `^\+?[1-9]\d{1,14}$`     |
| `bio`         | -   | 500 | String                             | Trimmed automatically                      |
| `linkedinUrl` | -   | -   | Valid URL                          | Must be full URL with protocol             |
| `githubUrl`   | -   | -   | Valid URL                          | Must be full URL with protocol             |
| `skills`      | -   | 20  | Array of strings (each 1-50 chars) | Each skill trimmed, empty strings rejected |

**Behavior Notes:**

- **Omitted fields:** Not updated (remain unchanged)
- **`null` values:** Field is cleared (set to NULL in database)
- **Empty arrays:** Allowed for `skills` (user can have zero skills)
- **Duplicate skills:** Allowed (backend does not deduplicate)
- **Skill validation:** Each skill must be 1-50 characters after trimming

**Success Response (200 OK):**

Returns complete updated profile (same shape as `GET /me`).

**Error Response (400 Validation Error):**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "phone",
        "message": "Invalid phone number format"
      },
      {
        "field": "skills",
        "message": "Maximum 20 skills allowed"
      }
    ]
  }
}
```

**Common Validation Errors:**

| Error                                | Cause                                  | Fix                                      |
| ------------------------------------ | -------------------------------------- | ---------------------------------------- |
| `Phone must match E.164 format`      | Missing country code or invalid format | Use `+1-555-123-4567` not `555-123-4567` |
| `Maximum 20 skills allowed`          | More than 20 items in skills array     | Reduce to 20 or fewer                    |
| `Skill cannot be empty`              | Empty string in skills array           | Remove empty strings                     |
| `Bio must not exceed 500 characters` | Bio too long                           | Shorten to 500 chars max                 |

---

## Upload Profile Picture (Avatar)

**`POST /upload/avatar`**

Upload or replace user's profile picture. Old avatar is automatically deleted.

**Authentication:** Required  
**Content-Type:** `multipart/form-data`  
**Rate Limit:** 10 uploads per 15 minutes

**Request:**

- Form field name: `avatar`
- Allowed formats: JPEG, PNG, WebP, GIF
- Max file size: 5 MB

**Processing:**

1. Image validated (format, size)
2. Image compressed (if beneficial)
3. Image resized to 400×400px (cropped to fit, face-gravity)
4. Uploaded to Cloudinary
5. Old avatar deleted from Cloudinary (if exists)
6. User's `profilePictureUrl` updated in database

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Avatar uploaded successfully",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "student@example.com",
      "fullName": "John Doe",
      "role": "STUDENT",
      "profilePictureUrl": "https://res.cloudinary.com/codionix/image/upload/v1706094600/codionix/avatars/user_1706094600_abc123.jpg",
      "isEmailVerified": true,
      "createdAt": "2026-01-15T10:30:00.000Z",
      "updatedAt": "2026-01-24T15:45:00.000Z"
    },
    "upload": {
      "url": "https://res.cloudinary.com/codionix/image/upload/v1706094600/codionix/avatars/user_1706094600_abc123.jpg",
      "format": "jpg",
      "width": 400,
      "height": 400
    }
  }
}
```

**Error Responses:**

**400 - No File Uploaded:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "No file uploaded"
  }
}
```

**400 - Invalid File Type:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid file type. Allowed: image/jpeg, image/png, image/webp, image/gif"
  }
}
```

**400 - File Too Large:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "File too large. Maximum size: 5.0MB"
  }
}
```

**429 - Rate Limit:**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many uploads. Please try again in 15 minutes."
  }
}
```

**Important Notes:**

- Old avatar is deleted asynchronously (non-blocking)
- If Cloudinary deletion fails, old avatar remains but is no longer referenced
- Compression reduces file size by ~40-60% on average
- GIF animations are preserved
- Image quality: 85% (auto-optimized)

---

## Delete Profile Picture

**`DELETE /upload/avatar`**

Remove user's profile picture.

**Authentication:** Required  
**Rate Limit:** 10 requests per 15 minutes

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Avatar deleted successfully"
  }
}
```

**Side Effects:**

- Avatar deleted from Cloudinary (asynchronous)
- User's `profilePictureUrl` set to `null`
- `updatedAt` timestamp updated

**Error Response (400 - No Avatar):**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "No avatar to delete"
  }
}
```

**CRITICAL:** Endpoint throws 400 error if user has no avatar (not a silent no-op). Frontend should check if `profilePictureUrl` exists before calling.

---

## Upload Resume

**`POST /upload/resume`**

Upload resume document. Returns URL to use in job applications.

**Authentication:** Required  
**Content-Type:** `multipart/form-data`  
**Rate Limit:** 10 uploads per 15 minutes

**Request:**

- Form field name: `resume`
- Allowed formats: PDF, DOC, DOCX
- Max file size: 10 MB

**Important:** Resume URL is **NOT** stored on user profile. You must save the returned URL and include it when creating applications.

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Resume uploaded successfully",
    "upload": {
      "url": "https://res.cloudinary.com/codionix/raw/upload/v1706094600/codionix/resumes/user_1706094600_def456.pdf",
      "format": "pdf",
      "bytes": 245760
    }
  }
}
```

**Usage Flow:**

1. Upload resume via this endpoint
2. Save `upload.url` in your application state
3. Include `resumeUrl` when creating an application:
   ```json
   POST /api/v1/applications
   {
     "projectId": "...",
     "coverLetter": "...",
     "resumeUrl": "https://res.cloudinary.com/codionix/raw/upload/..."
   }
   ```

**Error Responses:**

Same as avatar upload (400 for validation, 429 for rate limit).

---

## Get Notification Preferences

**`GET /me/notification-preferences`**

Retrieve user's email notification settings.

**Authentication:** Required

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "notifyOnApplicationReceived": true,
    "notifyOnApplicationStatus": true,
    "notifyOnDeadlineReminder": true,
    "notifyOnWeeklyDigest": true,
    "notifyOnNewMessage": true
  }
}
```

**Notification Types Explained:**

| Field                         | Who Gets It         | When Triggered                            | Frequency                |
| ----------------------------- | ------------------- | ----------------------------------------- | ------------------------ |
| `notifyOnApplicationReceived` | Mentors & Employers | Someone applies to your project           | Per application          |
| `notifyOnApplicationStatus`   | Students            | Your application status changes           | Per status change        |
| `notifyOnDeadlineReminder`    | Students            | Project deadline approaching (7d, 3d, 1d) | 3 emails max per project |
| `notifyOnWeeklyDigest`        | All users           | Platform activity summary                 | Every Sunday 9 AM UTC    |
| `notifyOnNewMessage`          | All users           | New message while offline                 | Per message              |

**Default Values:**

All notification preferences default to `true` on account creation.

**Email Delivery Notes:**

- Emails queued immediately but sent asynchronously
- Deadline reminders sent at 8:00 AM UTC
- Weekly digests sent at 9:00 AM UTC on Sundays
- Message notifications sent only if recipient is offline (not connected via WebSocket)
- Max 10 emails per user per day (anti-spam protection)

---

## Update Notification Preferences

**`PATCH /me/notification-preferences`**

Update email notification settings. All fields are optional.

**Authentication:** Required

**Request Body (all fields optional):**

```json
{
  "notifyOnWeeklyDigest": false,
  "notifyOnDeadlineReminder": false
}
```

**Success Response (200 OK):**

Returns complete updated preferences (same shape as GET).

**Behavior:**

- Changes apply immediately to future notifications
- Already-queued emails will still be sent
- Omitted fields remain unchanged

---

## User Roles & Permissions

### Available Roles

| Role       | Can Apply to Projects | Can Create Projects | Can Review Applications | Can Give Feedback |
| ---------- | --------------------- | ------------------- | ----------------------- | ----------------- |
| `STUDENT`  | ✅                    | ❌                  | ❌                      | ❌                |
| `MENTOR`   | ❌                    | ✅                  | ✅ (own projects)       | ✅ (own projects) |
| `EMPLOYER` | ❌                    | ✅                  | ✅ (own projects)       | ✅ (own projects) |
| `ADMIN`    | ✅                    | ✅                  | ✅ (all projects)       | ✅ (all projects) |

**Role Assignment:**

- Role is set during registration
- Role **cannot be changed** via API (admin database access only)
- OAuth users select role during initial OAuth flow

**OAuth Users:**

- Can register via Google or GitHub (see Authentication docs)
- `passwordHash` field is `null` for OAuth-only accounts
- Cannot use email/password login (only OAuth)
- Can link multiple OAuth providers to same account (e.g., both Google + GitHub)

---

## Email Mutability

### Via API

**User Profile Endpoint (PATCH /me):**

- Email field **NOT** included in update validator
- Email **CANNOT** be changed via `PATCH /me`

### Via OAuth Login

**Automatic Email Update:**

- If OAuth provider email changes, backend automatically updates user email
- Happens during OAuth login flow
- Example: User changes email at Google → next Google login updates Codionix email
- This is the **ONLY** way email can change after account creation

**Code Evidence:**

```typescript
// oauth.service.ts - handleOAuthLogin()
if (existingOAuthUser.email !== email) {
  await prisma.user.update({
    where: { id: existingOAuthUser.id },
    data: { email }, // Auto-update from provider
  });
}
```

**Summary:**

- Email is immutable via API endpoints
- Email MAY auto-update during OAuth login if provider email changed
- Email/password users: Email is permanently fixed (no update mechanism)
- OAuth users: Email syncs with OAuth provider

---

## Common Questions

**Q: Can users have both email/password AND OAuth?**  
**A:** Yes. Users can link multiple auth methods to same account (matched by email).

**Q: What if OAuth email changes at provider?**  
**A:** Email automatically updated in database on next OAuth login (preserves account).

**Q: Can admin users be created via OAuth?**  
**A:** No. ADMIN role must be assigned manually in database. OAuth only allows STUDENT, MENTOR, EMPLOYER.

**Q: Can I change my email?**  
**A:**

- Email/password users: No way to change email
- OAuth users: Email automatically syncs with OAuth provider on login

**Q: Can I change my role?**  
**A:** No. Role cannot be changed via API. Admin must update database directly.

**Q: Are skills case-sensitive?**  
**A:** Yes. "JavaScript" and "javascript" are treated as different skills. No deduplication or normalization is performed.

**Q: Can I clear my bio or phone number?**  
**A:** Yes. Send `"bio": null` or `"phone": null` in PATCH /me request.

**Q: Can I have zero skills?**  
**A:** Yes. Send `"skills": []` to clear all skills.

**Q: Can I upload the same resume for multiple applications?**  
**A:** Yes. Resume URL can be reused across applications. Upload once, use many times.

**Q: What happens to my data if I'm rate-limited?**  
**A:** Nothing. Rate limit blocks the request entirely. No partial updates occur.

**Q: What happens if I delete avatar but deletion from Cloudinary fails?**  
**A:** Old avatar remains in Cloudinary but is no longer referenced in your profile. Your `profilePictureUrl` is still set to `null`.

**Q: Can I upload a new avatar if I already have one?**  
**A:** Yes. Old avatar is automatically deleted and replaced with new one.

**Q: Will uploading a new avatar fail if I don't have an existing avatar?**  
**A:** No. Upload works regardless of whether you have an existing avatar.

**Q: Will deleting avatar fail if I don't have an avatar?**  
**A:** Yes. DELETE /avatar throws 400 error if `profilePictureUrl` is `null`. Frontend should check before calling.

---

## Error Codes Reference

| Code                  | HTTP Status | Description                       |
| --------------------- | ----------- | --------------------------------- |
| `VALIDATION_ERROR`    | 400         | Request validation failed         |
| `UNAUTHORIZED`        | 401         | Missing or invalid authentication |
| `NOT_FOUND`           | 404         | User not found                    |
| `RATE_LIMIT_EXCEEDED` | 429         | Too many requests                 |
| `INTERNAL_ERROR`      | 500         | Server error (contact support)    |

All error responses include `errorId` and `correlationId` for support.
