# Users & Profiles API

Base URL: `https://api.codionix.com/api/v1/users`

All endpoints require authentication unless specified.

---

## Get Current User Profile

**`GET /me`**

Retrieve full profile for authenticated user.

**Authentication:** Required

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "student@example.com",
    "fullName": "John Doe",
    "role": "STUDENT",
    "phone": "+1-555-123-4567",
    "bio": "Computer Science student passionate about web development",
    "profilePictureUrl": "https://res.cloudinary.com/codionix/avatars/user_123.jpg",
    "linkedinUrl": "https://linkedin.com/in/johndoe",
    "githubUrl": "https://github.com/johndoe",
    "skills": ["JavaScript", "React", "Node.js", "Python"],
    "isEmailVerified": true,
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-01-24T14:20:00.000Z"
  }
}
```

### Field Descriptions

| Field               | Type     | Description                                 |
| ------------------- | -------- | ------------------------------------------- |
| `id`                | UUID     | Unique user identifier                      |
| `email`             | string   | User's email (verified or not)              |
| `fullName`          | string   | Full display name                           |
| `role`              | enum     | `STUDENT`, `MENTOR`, `EMPLOYER`, or `ADMIN` |
| `phone`             | string?  | E.164 format phone number                   |
| `bio`               | string?  | Max 500 characters                          |
| `profilePictureUrl` | string?  | Cloudinary CDN URL                          |
| `linkedinUrl`       | string?  | Full LinkedIn profile URL                   |
| `githubUrl`         | string?  | Full GitHub profile URL                     |
| `skills`            | string[] | Max 20 skills, each 1-50 chars              |
| `isEmailVerified`   | boolean  | Email verification status                   |
| `createdAt`         | ISO 8601 | Account creation timestamp                  |
| `updatedAt`         | ISO 8601 | Last profile update                         |

---

## Update Current User Profile

**`PATCH /me`**

Update authenticated user's profile. All fields are optional.

**Authentication:** Required

### Request Body

```json
{
  "fullName": "John Michael Doe",
  "phone": "+1-555-987-6543",
  "bio": "Full-stack developer with 2 years of experience in React and Node.js",
  "linkedinUrl": "https://linkedin.com/in/johnmdoe",
  "githubUrl": "https://github.com/johnmdoe",
  "skills": ["JavaScript", "TypeScript", "React", "Node.js", "PostgreSQL"]
}
```

### Validation Rules

| Field         | Constraints                                  |
| ------------- | -------------------------------------------- |
| `fullName`    | 2-100 characters                             |
| `phone`       | Valid E.164 format (e.g., `+1-555-123-4567`) |
| `bio`         | Max 500 characters                           |
| `linkedinUrl` | Valid URL                                    |
| `githubUrl`   | Valid URL                                    |
| `skills`      | Array of 1-20 strings, each 1-50 chars       |

**Note:** Fields set to `null` will be cleared. Omitted fields remain unchanged.

### Success Response (200 OK)

Returns full updated profile (same shape as GET /me).

### Error Responses

**400 Validation Error**

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

---

## Upload Profile Picture

**`POST /upload/avatar`**

Upload user's profile picture. Replaces existing avatar if present.

**Authentication:** Required  
**Content-Type:** `multipart/form-data`

### Request

Form field: `avatar`

**Constraints:**

- Max file size: 5 MB
- Allowed formats: JPEG, PNG, WebP, GIF
- Auto-resized to 400x400px
- Auto-compressed to JPEG

### Example (cURL)

```bash
curl -X POST https://api.codionix.com/api/v1/upload/avatar \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "avatar=@profile.jpg"
```

### Success Response (200 OK)

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
      "profilePictureUrl": "https://res.cloudinary.com/codionix/avatars/user_1706094600_abc123.jpg",
      ...
    },
    "upload": {
      "url": "https://res.cloudinary.com/codionix/avatars/user_1706094600_abc123.jpg",
      "format": "jpg",
      "width": 400,
      "height": 400
    }
  }
}
```

**Side effects:**

- Old avatar deleted from Cloudinary (if exists)
- User's `profilePictureUrl` updated
- Image compressed and optimized

### Error Responses

**400 Validation Error** - No file uploaded

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "No file uploaded"
  }
}
```

**400 Validation Error** - Invalid file type

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid file type. Allowed: image/jpeg, image/png, image/webp, image/gif"
  }
}
```

**400 Validation Error** - File too large

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "File too large. Maximum size: 5.0MB"
  }
}
```

**429 Rate Limit** - Too many uploads

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many uploads. Please try again in 15 minutes."
  }
}
```

**Rate limit:** 10 uploads per 15 minutes

---

## Delete Profile Picture

**`DELETE /upload/avatar`**

Remove user's profile picture.

**Authentication:** Required

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "message": "Avatar deleted successfully"
  }
}
```

**Side effects:**

- Avatar deleted from Cloudinary
- User's `profilePictureUrl` set to `null`

### Error Response

**400 Validation Error** - No avatar to delete

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "No avatar to delete"
  }
}
```

---

## Upload Resume

**`POST /upload/resume`**

Upload resume document. Returns URL to include in job applications.

**Authentication:** Required  
**Content-Type:** `multipart/form-data`

### Request

Form field: `resume`

**Constraints:**

- Max file size: 10 MB
- Allowed formats: PDF, DOC, DOCX

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "message": "Resume uploaded successfully",
    "upload": {
      "url": "https://res.cloudinary.com/codionix/resumes/user_1706094600_def456.pdf",
      "format": "pdf",
      "bytes": 245760
    }
  }
}
```

**Note:** Resume URL is NOT stored on user profile. Include it when creating applications.

**Rate limit:** 10 uploads per 15 minutes

---

## Get Notification Preferences

**`GET /me/notification-preferences`**

Retrieve user's email notification settings.

**Authentication:** Required

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "notifyOnApplicationReceived": true,
    "notifyOnApplicationStatus": true,
    "notifyOnDeadlineReminder": true,
    "notifyOnWeeklyDigest": false,
    "notifyOnNewMessage": true
  }
}
```

### Notification Types

| Field                         | Description                                                    | Default |
| ----------------------------- | -------------------------------------------------------------- | ------- |
| `notifyOnApplicationReceived` | Email when someone applies to your project (mentors/employers) | `true`  |
| `notifyOnApplicationStatus`   | Email when your application status changes (students)          | `true`  |
| `notifyOnDeadlineReminder`    | Email reminders before project deadlines (7d, 3d, 1d)          | `true`  |
| `notifyOnWeeklyDigest`        | Weekly summary email every Sunday                              | `true`  |
| `notifyOnNewMessage`          | Email when receiving messages while offline                    | `true`  |

---

## Update Notification Preferences

**`PATCH /me/notification-preferences`**

Update email notification settings. All fields optional.

**Authentication:** Required

### Request Body

```json
{
  "notifyOnWeeklyDigest": false,
  "notifyOnDeadlineReminder": false
}
```

### Success Response (200 OK)

Returns full updated preferences (same shape as GET).

**Side effects:**

- Future notifications respect new settings immediately
- In-flight queued emails still sent

---

## User Roles & Permissions

### Role Hierarchy

```
ADMIN > EMPLOYER = MENTOR > STUDENT
```

### Role Capabilities

| Action              | STUDENT | MENTOR   | EMPLOYER | ADMIN         |
| ------------------- | ------- | -------- | -------- | ------------- |
| Apply to projects   | ✅      | ❌       | ❌       | ✅            |
| Create projects     | ❌      | ✅       | ✅       | ✅            |
| Review applications | ❌      | ✅ (own) | ✅ (own) | ✅ (all)      |
| Give feedback       | ❌      | ✅ (own) | ✅ (own) | ✅ (all)      |
| View analytics      | Limited | Own data | Own data | Platform-wide |
| Access admin panel  | ❌      | ❌       | ❌       | ✅            |

**Note:** Role cannot be changed after registration (except by admin).

---

## Error Codes Reference

| Code                  | HTTP Status | Description                |
| --------------------- | ----------- | -------------------------- |
| `VALIDATION_ERROR`    | 400         | Invalid request data       |
| `UNAUTHORIZED`        | 401         | Missing/invalid auth token |
| `NOT_FOUND`           | 404         | User not found             |
| `RATE_LIMIT_EXCEEDED` | 429         | Too many upload requests   |
| `INTERNAL_ERROR`      | 500         | Server error               |
