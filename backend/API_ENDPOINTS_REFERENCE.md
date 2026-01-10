# Codionix API Endpoints Reference

**Base URL:** `http://localhost:5000/api/v1`

---

## 🔐 Authentication Endpoints

### POST `/auth/register`

**Purpose:** Register a new user and send verification email  
**Rate Limit:** 10 requests per 15 minutes

**Frontend Sends:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe",
  "role": "STUDENT" | "MENTOR" | "EMPLOYER"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "STUDENT",
      "isEmailVerified": false,
      "profilePictureUrl": null,
      "createdAt": "2024-01-10T12:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    }
  }
}
```

**Error Response (409):**

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "User with this email already exists"
  }
}
```

---

### POST `/auth/login`

**Purpose:** Login user and get access tokens  
**Rate Limit:** 10 requests per 15 minutes

**Frontend Sends:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "STUDENT",
      "isEmailVerified": true,
      "profilePictureUrl": "https://...",
      "createdAt": "2024-01-10T12:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    }
  }
}
```

**Error Response (401):**

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid email or password"
  }
}
```

---

### POST `/auth/verify-email`

**Purpose:** Verify user's email with token from email  
**Rate Limit:** 3 requests per 15 minutes

**Frontend Sends:**

```json
{
  "token": "64-char-hex-token-from-email"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Email verified successfully",
    "email": "user@example.com"
  }
}
```

**Error Response (401):**

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired verification token"
  }
}
```

---

### POST `/auth/resend-verification`

**Purpose:** Resend verification email  
**Rate Limit:** 3 requests per 15 minutes

**Frontend Sends:**

```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "If an account exists, a verification email has been sent"
  }
}
```

---

### POST `/auth/refresh`

**Purpose:** Get new access token using refresh token

**Frontend Sends:**

```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "accessToken": "new-eyJhbGc...",
    "refreshToken": "new-eyJhbGc..."
  }
}
```

**Error Response (401):**

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

### POST `/auth/logout`

**Purpose:** Logout user and revoke refresh token

**Frontend Sends:**

```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

### POST `/auth/forgot-password`

**Purpose:** Send password reset email  
**Rate Limit:** 10 requests per 15 minutes

**Frontend Sends:**

```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "If an account with that email exists, a reset link was sent."
  }
}
```

---

### POST `/auth/reset-password`

**Purpose:** Reset password with token from email  
**Rate Limit:** 10 requests per 15 minutes

**Frontend Sends:**

```json
{
  "token": "64-char-hex-token-from-email",
  "password": "NewSecurePass123!"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Password reset successful"
  }
}
```

**Error Response (401):**

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

### GET `/auth/me`

**Purpose:** Get current authenticated user  
**Auth Required:** Yes (Bearer token)

**Frontend Sends:**

```
Headers:
  Authorization: Bearer eyJhbGc...
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "role": "STUDENT"
  }
}
```

---

## 👤 User Endpoints

### GET `/users/me`

**Purpose:** Get current user's full profile  
**Auth Required:** Yes

**Frontend Sends:**

```
Headers:
  Authorization: Bearer eyJhbGc...
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "STUDENT",
    "phone": "+1234567890",
    "bio": "Full stack developer...",
    "profilePictureUrl": "https://...",
    "linkedinUrl": "https://linkedin.com/in/...",
    "githubUrl": "https://github.com/...",
    "skills": ["JavaScript", "React", "Node.js"],
    "isEmailVerified": true,
    "createdAt": "2024-01-10T12:00:00.000Z",
    "updatedAt": "2024-01-10T12:00:00.000Z"
  }
}
```

---

### PATCH `/users/me`

**Purpose:** Update current user's profile  
**Auth Required:** Yes

**Frontend Sends:**

```json
{
  "fullName": "John Smith",
  "phone": "+1234567890",
  "bio": "Updated bio...",
  "linkedinUrl": "https://linkedin.com/in/johnsmith",
  "githubUrl": "https://github.com/johnsmith",
  "skills": ["JavaScript", "TypeScript", "React"]
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Smith",
    "role": "STUDENT",
    "phone": "+1234567890",
    "bio": "Updated bio...",
    "profilePictureUrl": "https://...",
    "linkedinUrl": "https://linkedin.com/in/johnsmith",
    "githubUrl": "https://github.com/johnsmith",
    "skills": ["JavaScript", "TypeScript", "React"],
    "isEmailVerified": true,
    "createdAt": "2024-01-10T12:00:00.000Z",
    "updatedAt": "2024-01-10T14:30:00.000Z"
  }
}
```

---

### POST `/users/me/avatar`

**Purpose:** Upload profile picture  
**Auth Required:** Yes

**Frontend Sends:**

```json
{
  "profilePictureUrl": "https://cloudinary.com/..."
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "profilePictureUrl": "https://cloudinary.com/..."
    // ... rest of user fields
  }
}
```

---

## 📋 Project Endpoints

### GET `/projects`

**Purpose:** List all published projects with filters (PUBLIC)

**Frontend Sends:**

```
Query Params:
  ?page=1
  &limit=10
  &projectType=PROJECT | INTERNSHIP
  &difficultyLevel=BEGINNER | INTERMEDIATE | ADVANCED
  &status=PUBLISHED
  &skills=JavaScript,React
  &search=web%20development
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "title": "E-commerce Platform",
        "description": "Build a full-stack e-commerce...",
        "skills": ["React", "Node.js", "PostgreSQL"],
        "duration": "3 months",
        "deadline": "2024-06-01T00:00:00.000Z",
        "projectType": "PROJECT",
        "stipend": "5000.00",
        "isRemote": true,
        "difficultyLevel": "INTERMEDIATE",
        "status": "PUBLISHED",
        "companyName": "Tech Corp",
        "location": "Remote",
        "maxApplicants": 10,
        "currentApplicants": 5,
        "createdAt": "2024-01-10T12:00:00.000Z",
        "updatedAt": "2024-01-10T12:00:00.000Z",
        "createdBy": {
          "id": "uuid",
          "fullName": "Jane Mentor",
          "role": "MENTOR"
        }
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

### GET `/projects/:id`

**Purpose:** Get single project by ID (PUBLIC)

**Frontend Sends:**

```
URL Param: /projects/uuid-here
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "E-commerce Platform",
    "description": "Build a full-stack e-commerce...",
    "skills": ["React", "Node.js", "PostgreSQL"],
    "duration": "3 months",
    "deadline": "2024-06-01T00:00:00.000Z",
    "projectType": "PROJECT",
    "stipend": "5000.00",
    "isRemote": true,
    "difficultyLevel": "INTERMEDIATE",
    "status": "PUBLISHED",
    "companyName": "Tech Corp",
    "location": "Remote",
    "maxApplicants": 10,
    "currentApplicants": 5,
    "createdAt": "2024-01-10T12:00:00.000Z",
    "updatedAt": "2024-01-10T12:00:00.000Z",
    "createdBy": {
      "id": "uuid",
      "fullName": "Jane Mentor",
      "role": "MENTOR"
    }
  }
}
```

**Error Response (404):**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Project not found"
  }
}
```

---

### POST `/projects`

**Purpose:** Create new project  
**Auth Required:** Yes (MENTOR or EMPLOYER only)

**Frontend Sends:**

```json
{
  "title": "E-commerce Platform",
  "description": "Build a full-stack e-commerce application with payment integration...",
  "skills": ["React", "Node.js", "PostgreSQL"],
  "duration": "3 months",
  "deadline": "2024-06-01T00:00:00.000Z",
  "projectType": "PROJECT",
  "stipend": 5000,
  "isRemote": true,
  "difficultyLevel": "INTERMEDIATE",
  "status": "DRAFT",
  "companyName": "Tech Corp",
  "location": "Remote",
  "maxApplicants": 10
}
```

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "E-commerce Platform",
    // ... all project fields
    "createdBy": {
      "id": "uuid",
      "fullName": "Jane Mentor",
      "role": "MENTOR"
    }
  }
}
```

**Error Response (400):**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "title",
        "message": "Title must be at least 5 characters"
      }
    ]
  }
}
```

---

### PATCH `/projects/:id`

**Purpose:** Update project (owner only)  
**Auth Required:** Yes (Project owner)

**Frontend Sends:**

```json
{
  "title": "Updated E-commerce Platform",
  "description": "Updated description...",
  "status": "PUBLISHED"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Updated E-commerce Platform"
    // ... all updated project fields
  }
}
```

**Error Response (403):**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to update this project"
  }
}
```

---

### DELETE `/projects/:id`

**Purpose:** Delete project (owner only)  
**Auth Required:** Yes (Project owner)

**Frontend Sends:**

```
URL Param: /projects/uuid-here
Headers:
  Authorization: Bearer eyJhbGc...
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Project deleted successfully"
  }
}
```

---

### GET `/projects/my-projects`

**Purpose:** Get current user's created projects  
**Auth Required:** Yes (MENTOR or EMPLOYER)

**Frontend Sends:**

```
Headers:
  Authorization: Bearer eyJhbGc...
```

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "E-commerce Platform",
      // ... all project fields
      "createdBy": {
        "id": "uuid",
        "fullName": "Jane Mentor",
        "role": "MENTOR"
      }
    }
  ]
}
```

---

### GET `/projects/:id/applications`

**Purpose:** Get all applications for a project (owner only)  
**Auth Required:** Yes (Project owner)

**Frontend Sends:**

```
URL Param: /projects/uuid-here/applications
Headers:
  Authorization: Bearer eyJhbGc...
```

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "coverLetter": "I am interested in this project...",
      "resumeUrl": "https://...",
      "status": "PENDING",
      "appliedAt": "2024-01-10T12:00:00.000Z",
      "reviewedAt": null,
      "rejectionReason": null,
      "project": {
        "id": "uuid",
        "title": "E-commerce Platform",
        "projectType": "PROJECT",
        "status": "PUBLISHED",
        "createdById": "uuid",
        "currentApplicants": 5
      },
      "student": {
        "id": "uuid",
        "fullName": "John Student",
        "email": "student@example.com",
        "skills": ["React", "Node.js"]
      },
      "reviewer": null
    }
  ]
}
```

---

## 📝 Application Endpoints

### POST `/applications`

**Purpose:** Apply to a project  
**Auth Required:** Yes (STUDENT only)

**Frontend Sends:**

```json
{
  "projectId": "uuid",
  "coverLetter": "I am very interested in this project because...",
  "resumeUrl": "https://cloudinary.com/resume.pdf"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "coverLetter": "I am very interested...",
    "resumeUrl": "https://...",
    "status": "PENDING",
    "appliedAt": "2024-01-10T12:00:00.000Z",
    "reviewedAt": null,
    "rejectionReason": null,
    "project": {
      "id": "uuid",
      "title": "E-commerce Platform",
      "projectType": "PROJECT",
      "status": "PUBLISHED",
      "createdById": "uuid",
      "currentApplicants": 6
    },
    "student": {
      "id": "uuid",
      "fullName": "John Student",
      "email": "student@example.com",
      "skills": ["React", "Node.js"]
    },
    "reviewer": null
  }
}
```

**Error Response (409):**

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "You have already applied to this project"
  }
}
```

**Error Response (400):**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Project has reached maximum applicants"
  }
}
```

---

### GET `/applications`

**Purpose:** List all applications with filters  
**Auth Required:** Yes

**Frontend Sends:**

```
Query Params:
  ?page=1
  &limit=10
  &status=PENDING | UNDER_REVIEW | ACCEPTED | REJECTED
  &projectId=uuid
  &studentId=uuid
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "coverLetter": "I am interested...",
        "resumeUrl": "https://...",
        "status": "PENDING",
        "appliedAt": "2024-01-10T12:00:00.000Z",
        "reviewedAt": null,
        "rejectionReason": null,
        "project": {
          "id": "uuid",
          "title": "E-commerce Platform",
          "projectType": "PROJECT",
          "status": "PUBLISHED",
          "createdById": "uuid",
          "currentApplicants": 5
        },
        "student": {
          "id": "uuid",
          "fullName": "John Student",
          "email": "student@example.com",
          "skills": ["React", "Node.js"]
        },
        "reviewer": null
      }
    ],
    "pagination": {
      "total": 25,
      "page": 1,
      "limit": 10,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

### GET `/applications/:id`

**Purpose:** Get single application by ID  
**Auth Required:** Yes

**Frontend Sends:**

```
URL Param: /applications/uuid-here
Headers:
  Authorization: Bearer eyJhbGc...
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "coverLetter": "I am interested...",
    "resumeUrl": "https://...",
    "status": "PENDING",
    "appliedAt": "2024-01-10T12:00:00.000Z",
    "reviewedAt": null,
    "rejectionReason": null,
    "project": {
      "id": "uuid",
      "title": "E-commerce Platform",
      "projectType": "PROJECT",
      "status": "PUBLISHED",
      "createdById": "uuid",
      "currentApplicants": 5
    },
    "student": {
      "id": "uuid",
      "fullName": "John Student",
      "email": "student@example.com",
      "skills": ["React", "Node.js"]
    },
    "reviewer": null
  }
}
```

---

### PATCH `/applications/:id/status`

**Purpose:** Update application status (project owner only)  
**Auth Required:** Yes (Project owner)

**Frontend Sends:**

```json
{
  "status": "ACCEPTED" | "REJECTED" | "UNDER_REVIEW",
  "rejectionReason": "We decided to go with another candidate..."
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "coverLetter": "I am interested...",
    "resumeUrl": "https://...",
    "status": "REJECTED",
    "appliedAt": "2024-01-10T12:00:00.000Z",
    "reviewedAt": "2024-01-11T10:30:00.000Z",
    "rejectionReason": "We decided to go with another candidate...",
    "project": {
      "id": "uuid",
      "title": "E-commerce Platform",
      "projectType": "PROJECT",
      "status": "PUBLISHED",
      "createdById": "uuid",
      "currentApplicants": 5
    },
    "student": {
      "id": "uuid",
      "fullName": "John Student",
      "email": "student@example.com",
      "skills": ["React", "Node.js"]
    },
    "reviewer": {
      "id": "uuid",
      "fullName": "Jane Mentor"
    }
  }
}
```

**Error Response (400):**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Rejection reason is required when rejecting"
  }
}
```

---

### GET `/applications/my-applications`

**Purpose:** Get current student's applications  
**Auth Required:** Yes (STUDENT only)

**Frontend Sends:**

```
Headers:
  Authorization: Bearer eyJhbGc...
```

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "coverLetter": "I am interested...",
      "resumeUrl": "https://...",
      "status": "PENDING",
      "appliedAt": "2024-01-10T12:00:00.000Z"
      // ... full application object
    }
  ]
}
```

---

# Feedback & Health Endpoints - Complete Documentation

---

## 💬 FEEDBACK ENDPOINTS

### POST `/feedback`

**Purpose:** Create feedback for an application  
**Auth Required:** Yes (MENTOR or EMPLOYER - project owner only)

**Frontend Sends:**

```json
{
  "applicationId": "uuid",
  "rating": 4,
  "feedbackText": "Great application! The candidate showed strong understanding of React and Node.js. Their portfolio projects demonstrate solid full-stack capabilities.",
  "strengths": [
    "Strong technical skills",
    "Good communication",
    "Impressive portfolio"
  ],
  "improvements": [
    "Could improve on system design",
    "More project examples needed",
    "Better documentation"
  ],
  "isPublic": false
}
```

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "fb-uuid-123",
    "rating": 4,
    "feedbackText": "Great application! The candidate showed strong understanding of React and Node.js. Their portfolio projects demonstrate solid full-stack capabilities.",
    "strengths": [
      "Strong technical skills",
      "Good communication",
      "Impressive portfolio"
    ],
    "improvements": [
      "Could improve on system design",
      "More project examples needed",
      "Better documentation"
    ],
    "isPublic": false,
    "createdAt": "2024-01-10T12:00:00.000Z",
    "updatedAt": "2024-01-10T12:00:00.000Z",
    "application": {
      "id": "app-uuid-456",
      "studentId": "student-uuid-789",
      "projectId": "proj-uuid-101",
      "status": "REJECTED",
      "project": {
        "id": "proj-uuid-101",
        "title": "E-commerce Platform",
        "createdById": "mentor-uuid-202"
      },
      "student": {
        "id": "student-uuid-789",
        "fullName": "John Student",
        "email": "student@example.com"
      }
    },
    "mentor": {
      "id": "mentor-uuid-202",
      "fullName": "Jane Mentor",
      "role": "MENTOR"
    }
  }
}
```

**Error Response (409):**

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Feedback already exists for this application"
  }
}
```

**Error Response (400):**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Feedback can only be provided for accepted or rejected applications"
  }
}
```

**Error Response (403):**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Only the project owner can provide feedback"
  }
}
```

---

### GET `/feedback`

**Purpose:** List all feedback with filters (PUBLIC - only public feedback unless authenticated)

**Frontend Sends:**

```
Query Params:
  ?page=1
  &limit=10
  &studentId=uuid
  &mentorId=uuid
  &isPublic=true
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "fb-uuid-123",
        "rating": 5,
        "feedbackText": "Excellent candidate with strong problem-solving skills...",
        "strengths": ["Quick learner", "Team player", "Strong coding skills"],
        "improvements": ["More experience with TypeScript"],
        "isPublic": true,
        "createdAt": "2024-01-10T12:00:00.000Z",
        "updatedAt": "2024-01-10T12:00:00.000Z",
        "application": {
          "id": "app-uuid-456",
          "studentId": "student-uuid-789",
          "projectId": "proj-uuid-101",
          "status": "ACCEPTED",
          "project": {
            "id": "proj-uuid-101",
            "title": "E-commerce Platform",
            "createdById": "mentor-uuid-202"
          },
          "student": {
            "id": "student-uuid-789",
            "fullName": "John Student",
            "email": "student@example.com"
          }
        },
        "mentor": {
          "id": "mentor-uuid-202",
          "fullName": "Jane Mentor",
          "role": "MENTOR"
        }
      },
      {
        "id": "fb-uuid-124",
        "rating": 3,
        "feedbackText": "Good potential but needs more experience...",
        "strengths": ["Enthusiastic", "Good communication"],
        "improvements": [
          "More hands-on projects",
          "Better understanding of databases"
        ],
        "isPublic": true,
        "createdAt": "2024-01-09T10:00:00.000Z",
        "updatedAt": "2024-01-09T10:00:00.000Z",
        "application": {
          "id": "app-uuid-457",
          "studentId": "student-uuid-790",
          "projectId": "proj-uuid-102",
          "status": "REJECTED",
          "project": {
            "id": "proj-uuid-102",
            "title": "AI Chatbot",
            "createdById": "mentor-uuid-203"
          },
          "student": {
            "id": "student-uuid-790",
            "fullName": "Sarah Developer",
            "email": "sarah@example.com"
          }
        },
        "mentor": {
          "id": "mentor-uuid-203",
          "fullName": "Bob Employer",
          "role": "EMPLOYER"
        }
      }
    ],
    "pagination": {
      "total": 25,
      "page": 1,
      "limit": 10,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

### GET `/feedback/:id`

**Purpose:** Get single feedback by ID (privacy checked - public OR student/mentor only)

**Frontend Sends:**

```
URL Param: /feedback/fb-uuid-123
Optional Headers:
  Authorization: Bearer eyJhbGc...
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "fb-uuid-123",
    "rating": 4,
    "feedbackText": "Great application! Strong technical background and good communication skills.",
    "strengths": [
      "Strong technical skills",
      "Good communication",
      "Impressive portfolio"
    ],
    "improvements": ["Could improve on system design", "More project examples"],
    "isPublic": false,
    "createdAt": "2024-01-10T12:00:00.000Z",
    "updatedAt": "2024-01-10T12:00:00.000Z",
    "application": {
      "id": "app-uuid-456",
      "studentId": "student-uuid-789",
      "projectId": "proj-uuid-101",
      "status": "REJECTED",
      "project": {
        "id": "proj-uuid-101",
        "title": "E-commerce Platform",
        "createdById": "mentor-uuid-202"
      },
      "student": {
        "id": "student-uuid-789",
        "fullName": "John Student",
        "email": "student@example.com"
      }
    },
    "mentor": {
      "id": "mentor-uuid-202",
      "fullName": "Jane Mentor",
      "role": "MENTOR"
    }
  }
}
```

**Error Response (404):**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Feedback not found"
  }
}
```

**Error Response (403):**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have access to this feedback"
  }
}
```

---

### PATCH `/feedback/:id`

**Purpose:** Update feedback (mentor who created it only)  
**Auth Required:** Yes (Feedback creator)

**Frontend Sends:**

```json
{
  "rating": 5,
  "feedbackText": "Updated: After reviewing the portfolio again, I'm even more impressed...",
  "strengths": [
    "Strong technical skills",
    "Good communication",
    "Excellent problem solving"
  ],
  "improvements": ["Could improve on system design"],
  "isPublic": true
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "fb-uuid-123",
    "rating": 5,
    "feedbackText": "Updated: After reviewing the portfolio again, I'm even more impressed...",
    "strengths": [
      "Strong technical skills",
      "Good communication",
      "Excellent problem solving"
    ],
    "improvements": ["Could improve on system design"],
    "isPublic": true,
    "createdAt": "2024-01-10T12:00:00.000Z",
    "updatedAt": "2024-01-11T10:00:00.000Z",
    "application": {
      "id": "app-uuid-456",
      "studentId": "student-uuid-789",
      "projectId": "proj-uuid-101",
      "status": "REJECTED",
      "project": {
        "id": "proj-uuid-101",
        "title": "E-commerce Platform",
        "createdById": "mentor-uuid-202"
      },
      "student": {
        "id": "student-uuid-789",
        "fullName": "John Student",
        "email": "student@example.com"
      }
    },
    "mentor": {
      "id": "mentor-uuid-202",
      "fullName": "Jane Mentor",
      "role": "MENTOR"
    }
  }
}
```

**Error Response (403):**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You can only update your own feedback"
  }
}
```

---

### DELETE `/feedback/:id`

**Purpose:** Delete feedback (mentor who created it only)  
**Auth Required:** Yes (Feedback creator)

**Frontend Sends:**

```
URL Param: /feedback/fb-uuid-123
Headers:
  Authorization: Bearer eyJhbGc...
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Feedback deleted successfully"
  }
}
```

**Error Response (403):**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You can only delete your own feedback"
  }
}
```

**Error Response (404):**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Feedback not found"
  }
}
```

---

### GET `/feedback/my-feedback`

**Purpose:** Get current student's received feedback  
**Auth Required:** Yes (STUDENT only)

**Frontend Sends:**

```
Headers:
  Authorization: Bearer eyJhbGc...
```

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "fb-uuid-123",
      "rating": 4,
      "feedbackText": "Great application! Strong technical background...",
      "strengths": ["Strong technical skills", "Good communication"],
      "improvements": ["Could improve on system design"],
      "isPublic": false,
      "createdAt": "2024-01-10T12:00:00.000Z",
      "updatedAt": "2024-01-10T12:00:00.000Z",
      "application": {
        "id": "app-uuid-456",
        "studentId": "student-uuid-789",
        "projectId": "proj-uuid-101",
        "status": "REJECTED",
        "project": {
          "id": "proj-uuid-101",
          "title": "E-commerce Platform",
          "createdById": "mentor-uuid-202"
        },
        "student": {
          "id": "student-uuid-789",
          "fullName": "John Student",
          "email": "student@example.com"
        }
      },
      "mentor": {
        "id": "mentor-uuid-202",
        "fullName": "Jane Mentor",
        "role": "MENTOR"
      }
    },
    {
      "id": "fb-uuid-125",
      "rating": 5,
      "feedbackText": "Excellent work! Hired for the internship.",
      "strengths": ["Quick learner", "Great coding style", "Team player"],
      "improvements": ["Keep learning new technologies"],
      "isPublic": true,
      "createdAt": "2024-01-08T14:00:00.000Z",
      "updatedAt": "2024-01-08T14:00:00.000Z",
      "application": {
        "id": "app-uuid-458",
        "studentId": "student-uuid-789",
        "projectId": "proj-uuid-103",
        "status": "ACCEPTED",
        "project": {
          "id": "proj-uuid-103",
          "title": "Mobile App Development",
          "createdById": "employer-uuid-204"
        },
        "student": {
          "id": "student-uuid-789",
          "fullName": "John Student",
          "email": "student@example.com"
        }
      },
      "mentor": {
        "id": "employer-uuid-204",
        "fullName": "Tech Company HR",
        "role": "EMPLOYER"
      }
    }
  ]
}
```

---

### GET `/feedback/given`

**Purpose:** Get feedback created by current mentor  
**Auth Required:** Yes (MENTOR or EMPLOYER only)

**Frontend Sends:**

```
Headers:
  Authorization: Bearer eyJhbGc...
```

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "fb-uuid-123",
      "rating": 4,
      "feedbackText": "Great application! Strong technical background...",
      "strengths": ["Strong technical skills", "Good communication"],
      "improvements": ["Could improve on system design"],
      "isPublic": false,
      "createdAt": "2024-01-10T12:00:00.000Z",
      "updatedAt": "2024-01-10T12:00:00.000Z",
      "application": {
        "id": "app-uuid-456",
        "studentId": "student-uuid-789",
        "projectId": "proj-uuid-101",
        "status": "REJECTED",
        "project": {
          "id": "proj-uuid-101",
          "title": "E-commerce Platform",
          "createdById": "mentor-uuid-202"
        },
        "student": {
          "id": "student-uuid-789",
          "fullName": "John Student",
          "email": "student@example.com"
        }
      },
      "mentor": {
        "id": "mentor-uuid-202",
        "fullName": "Jane Mentor",
        "role": "MENTOR"
      }
    },
    {
      "id": "fb-uuid-126",
      "rating": 3,
      "feedbackText": "Good effort but needs more practice...",
      "strengths": ["Enthusiastic", "Willing to learn"],
      "improvements": ["More hands-on projects", "Better code organization"],
      "isPublic": true,
      "createdAt": "2024-01-09T16:00:00.000Z",
      "updatedAt": "2024-01-09T16:00:00.000Z",
      "application": {
        "id": "app-uuid-459",
        "studentId": "student-uuid-791",
        "projectId": "proj-uuid-104",
        "status": "REJECTED",
        "project": {
          "id": "proj-uuid-104",
          "title": "Data Analytics Dashboard",
          "createdById": "mentor-uuid-202"
        },
        "student": {
          "id": "student-uuid-791",
          "fullName": "Alice Beginner",
          "email": "alice@example.com"
        }
      },
      "mentor": {
        "id": "mentor-uuid-202",
        "fullName": "Jane Mentor",
        "role": "MENTOR"
      }
    }
  ]
}
```

---

### GET `/feedback/application/:applicationId`

**Purpose:** Get feedback for a specific application  
**Auth Required:** Yes (Student who applied OR project owner)

**Frontend Sends:**

```
URL Param: /feedback/application/app-uuid-456
Headers:
  Authorization: Bearer eyJhbGc...
```

**Success Response (200) - Feedback exists:**

```json
{
  "success": true,
  "data": {
    "id": "fb-uuid-123",
    "rating": 4,
    "feedbackText": "Great application! Strong technical background and good communication skills.",
    "strengths": [
      "Strong technical skills",
      "Good communication",
      "Impressive portfolio"
    ],
    "improvements": ["Could improve on system design", "More project examples"],
    "isPublic": false,
    "createdAt": "2024-01-10T12:00:00.000Z",
    "updatedAt": "2024-01-10T12:00:00.000Z",
    "application": {
      "id": "app-uuid-456",
      "studentId": "student-uuid-789",
      "projectId": "proj-uuid-101",
      "status": "REJECTED",
      "project": {
        "id": "proj-uuid-101",
        "title": "E-commerce Platform",
        "createdById": "mentor-uuid-202"
      },
      "student": {
        "id": "student-uuid-789",
        "fullName": "John Student",
        "email": "student@example.com"
      }
    },
    "mentor": {
      "id": "mentor-uuid-202",
      "fullName": "Jane Mentor",
      "role": "MENTOR"
    }
  }
}
```

**Success Response (200) - No feedback yet:**

```json
{
  "success": true,
  "data": null
}
```

**Error Response (404):**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Application not found"
  }
}
```

**Error Response (403):**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to view this feedback"
  }
}
```

---

## 🏥 HEALTH CHECK ENDPOINTS

### GET `/health`

**Purpose:** Liveness check - is the server process alive?  
**Auth Required:** No (PUBLIC)  
**Called By:** Load balancers every 2-5 seconds  
**Rate Limit:** None  
**Response Time:** <50ms

**Frontend Sends:**

```
Nothing - just GET request
No headers needed
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "alive": true,
    "uptime": 3600.523
  }
}
```

**Use Case:**

- Display "Server Online" indicator in UI
- Monitor if backend is running
- Load balancer health checks

---

### GET `/health/ready`

**Purpose:** Readiness check - can the server handle traffic?  
**Auth Required:** No (PUBLIC)  
**Called By:** Deployment systems, Kubernetes readiness probe  
**Rate Limit:** None  
**Response Time:** Up to 5 seconds

**Frontend Sends:**

```
Nothing - just GET request
No headers needed
```

**Success Response (200) - All systems healthy:**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-10T12:00:00.000Z",
    "uptime": 3600.523,
    "environment": "production",
    "version": "1.0.0",
    "dependencies": [
      {
        "name": "database",
        "status": "healthy",
        "responseTime": 45,
        "message": "Database operational",
        "details": {
          "poolTotal": 5,
          "poolIdle": 3,
          "poolWaiting": 0,
          "poolMax": 20,
          "utilization": "25%",
          "activeQueries": 2,
          "totalQueries": 1523,
          "slowQueries": 12
        }
      },
      {
        "name": "email",
        "status": "healthy",
        "responseTime": 234,
        "message": "Email service operational",
        "details": {
          "host": "smtp.gmail.com",
          "port": 587,
          "secure": false
        }
      }
    ]
  }
}
```

**Degraded Response (503) - Email service slow:**

```json
{
  "success": false,
  "data": {
    "status": "degraded",
    "timestamp": "2024-01-10T12:00:00.000Z",
    "uptime": 3600.523,
    "environment": "production",
    "version": "1.0.0",
    "dependencies": [
      {
        "name": "database",
        "status": "healthy",
        "responseTime": 67,
        "message": "Database operational",
        "details": {
          "poolTotal": 8,
          "poolIdle": 5,
          "poolWaiting": 0,
          "poolMax": 20,
          "utilization": "40%",
          "activeQueries": 3,
          "totalQueries": 2341,
          "slowQueries": 23
        }
      },
      {
        "name": "email",
        "status": "degraded",
        "responseTime": 2890,
        "message": "Email service unavailable",
        "details": {
          "error": "Connection timeout"
        }
      }
    ]
  }
}
```

**Unhealthy Response (503) - Database down:**

```json
{
  "success": false,
  "data": {
    "status": "unhealthy",
    "timestamp": "2024-01-10T12:00:00.000Z",
    "uptime": 3600.523,
    "environment": "production",
    "version": "1.0.0",
    "dependencies": [
      {
        "name": "database",
        "status": "unhealthy",
        "responseTime": 5002,
        "message": "Database connection failed",
        "details": {
          "error": "Connection pool exhausted",
          "poolTotal": 20,
          "poolIdle": 0,
          "poolWaiting": 15,
          "poolMax": 20,
          "utilization": "100%"
        }
      },
      {
        "name": "email",
        "status": "healthy",
        "responseTime": 189,
        "message": "Email service operational"
      }
    ]
  }
}
```

**Use Cases:**

- System status page showing all service health
- Admin dashboard with dependency monitoring
- Alert admins when status is degraded/unhealthy
- Deployment checks before routing traffic

---

### GET `/health/full`

**Purpose:** Full diagnostic check with verbose details  
**Auth Required:** No (PUBLIC)  
**Called By:** Engineers debugging issues, monitoring dashboards  
**Rate Limit:** None  
**Response Time:** Up to 10 seconds  
**Note:** ALWAYS returns 200 even if unhealthy (so you can see diagnostics)

**Frontend Sends:**

```
Nothing - just GET request
No headers needed
```

**Success Response (200) - Healthy system:**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-10T12:00:00.000Z",
    "uptime": 3600.523,
    "environment": "production",
    "version": "1.0.0",
    "dependencies": [
      {
        "name": "database",
        "status": "healthy",
        "responseTime": 67,
        "message": "Database operational",
        "details": {
          "poolTotal": 8,
          "poolIdle": 5,
          "poolWaiting": 0,
          "poolMax": 20,
          "utilization": "40%",
          "activeQueries": 3,
          "totalQueries": 15234,
          "slowQueries": 45
        }
      },
      {
        "name": "email",
        "status": "healthy",
        "responseTime": 189,
        "message": "Email service operational",
        "details": {
          "host": "smtp.gmail.com",
          "port": 587,
          "secure": false
        }
      }
    ]
  }
}
```

**Success Response (200) - Unhealthy but still 200:**

```json
{
  "success": true,
  "data": {
    "status": "unhealthy",
    "timestamp": "2024-01-10T12:00:00.000Z",
    "uptime": 3600.523,
    "environment": "production",
    "version": "1.0.0",
    "dependencies": [
      {
        "name": "database",
        "status": "unhealthy",
        "responseTime": 5234,
        "message": "Database critically slow (5234ms)",
        "details": {
          "poolTotal": 20,
          "poolIdle": 0,
          "poolWaiting": 25,
          "poolMax": 20,
          "utilization": "100%",
          "activeQueries": 20,
          "totalQueries": 45234,
          "slowQueries": 234,
          "error": "Connection pool exhausted"
        }
      },
      {
        "name": "email",
        "status": "degraded",
        "responseTime": 3456,
        "message": "Email service unavailable",
        "details": {
          "host": "smtp.gmail.com",
          "port": 587,
          "secure": false,
          "error": "ETIMEDOUT - Connection timeout after 3000ms"
        }
      }
    ]
  }
}
```

**Use Cases:**

- Admin dashboard showing detailed system metrics
- Engineers debugging production issues
- Monitoring tools tracking pool utilization
- Performance analysis and optimization
- Historical health data collection

**Important:** This endpoint ALWAYS returns HTTP 200, even when unhealthy. This is intentional so engineers can always see diagnostics. Use `/health/ready` for load balancer checks.

---

## 📊 Health Status Interpretation

### Status Values

**healthy:**

- All dependencies responding normally
- Response times within acceptable thresholds
- Database pool utilization < 80%
- Email service connecting successfully

**degraded:**

- At least one dependency slow or unavailable
- Database response time > 100ms but < 500ms
- Database pool utilization 80-95%
- Email service timeout or slow response
- **App still functional but performance impacted**

**unhealthy:**

- Critical dependency failed
- Database response time > 500ms
- Database pool utilization > 95%
- Database connection completely failed
- **App cannot serve requests reliably**

### Response Time Thresholds

**Database:**

- < 100ms: healthy
- 100-500ms: degraded (warning)
- '>' 500ms: unhealthy (critical)

**Email:**

- < 3000ms: healthy
- '>' 3000ms: degraded (not critical - app works without email)

---
