# Applications API

**Base URL:** `https://api.codionix.com/api/v1/applications`

All endpoints require authentication unless specified.

---

## Applications Overview

Applications represent student submissions to projects/internships. Each application:

- Links one student to one project
- Can only be created by students
- Can only be reviewed by project owners (mentors/employers)
- Enforces unique constraint: one student can apply to each project only once
- Tracks full lifecycle: PENDING → UNDER_REVIEW → ACCEPTED/REJECTED

**Application Status Flow:**

```
PENDING (default)
    ↓
UNDER_REVIEW (optional intermediate state)
    ↓
ACCEPTED or REJECTED (terminal states)
```

---

## Create Application

**`POST /api/v1/applications`**

Submit application to a project. Only students can create applications.

**Authentication:** Required (Student role only)

**Request Body:**

```json
{
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "coverLetter": "I am extremely interested in this project because of my passion for web development. I have 2 years of experience with React and Node.js, and I believe my skills align perfectly with the requirements.",
  "resumeUrl": "https://res.cloudinary.com/codionix/raw/upload/v1706094600/codionix/resumes/user_1706094600_def456.pdf"
}
```

**Field Validation:**

| Field         | Type   | Required | Constraints                    | Notes                                    |
| ------------- | ------ | -------- | ------------------------------ | ---------------------------------------- |
| `projectId`   | UUID   | Yes      | Valid UUID, project must exist | Must be PUBLISHED status                 |
| `coverLetter` | string | Yes      | 50-1000 characters, trimmed    | Explain why you're a good fit            |
| `resumeUrl`   | string | No       | Valid URL                      | Upload via `/api/v1/upload/resume` first |

**Validation Rules (CRITICAL):**

1. **Project Status Check:**
   - Project must be `PUBLISHED`
   - Draft or closed projects → 400 error

2. **Deadline Check:**
   - Project deadline must be in the future
   - Past deadline → 400 error

3. **Capacity Check:**
   - Project must not have reached `maxApplicants`
   - Full project → 400 error

4. **Duplicate Check:**
   - Student can only apply once per project
   - Duplicate application → 409 error

5. **Concurrency Protection:**
   - Uses database-level locking (Serializable isolation)
   - Prevents race conditions when multiple students apply simultaneously
   - If project fills up between validation and insert → transaction rolls back

**Success Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "studentId": "7c8d9e0f-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
    "coverLetter": "I am extremely interested in this project because of my passion for web development. I have 2 years of experience with React and Node.js, and I believe my skills align perfectly with the requirements.",
    "resumeUrl": "https://res.cloudinary.com/codionix/raw/upload/v1706094600/codionix/resumes/user_1706094600_def456.pdf",
    "status": "PENDING",
    "appliedAt": "2026-01-28T10:30:00.000Z",
    "reviewedAt": null,
    "reviewerId": null,
    "rejectionReason": null,
    "project": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "E-commerce Platform MVP",
      "projectType": "PROJECT",
      "status": "PUBLISHED",
      "createdById": "mentor-uuid-123",
      "currentApplicants": 8
    },
    "student": {
      "id": "7c8d9e0f-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
      "fullName": "John Doe",
      "email": "john.doe@example.com",
      "skills": ["JavaScript", "React", "Node.js"]
    },
    "reviewer": null
  }
}
```

**Side Effects:**

1. `project.currentApplicants` incremented by 1 (atomic)
2. Email notification queued to project owner (async, non-blocking)
3. Application record created with `status: PENDING`

**Error Responses:**

**403 Forbidden — Not a Student:**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied. Required roles: STUDENT"
  }
}
```

**400 Validation Error — Unpublished Project:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Cannot apply to unpublished projects"
  }
}
```

**400 Validation Error — Expired Deadline:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Cannot apply to projects past their deadline"
  }
}
```

**400 Validation Error — Project Full:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Project has reached maximum applicants"
  }
}
```

**409 Conflict — Duplicate Application:**

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "You have already applied to this project"
  }
}
```

**404 Not Found — Invalid Project:**

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

## List Applications

**`GET /api/v1/applications`**

Retrieve applications with filtering and pagination.

**Authentication:** Required (All roles)

**Query Parameters:**

| Parameter   | Type    | Required | Default | Validation         | Description                  |
| ----------- | ------- | -------- | ------- | ------------------ | ---------------------------- |
| `page`      | integer | No       | 1       | Positive integer   | Page number (1-indexed)      |
| `limit`     | integer | No       | 10      | 1-100              | Results per page             |
| `status`    | enum    | No       | -       | See statuses below | Filter by application status |
| `projectId` | UUID    | No       | -       | Valid UUID         | Filter by specific project   |
| `studentId` | UUID    | No       | -       | Valid UUID         | Filter by specific student   |

**Valid Status Values:**

- `PENDING`
- `UNDER_REVIEW`
- `ACCEPTED`
- `REJECTED`

**Authorization:**

- **Students:** Can see ALL applications (no restriction)
- **Mentors/Employers:** Can see ALL applications (no restriction)
- **Admins:** Can see ALL applications

**Important:** This endpoint does NOT enforce ownership filtering. Any authenticated user can query any applications. Use role-specific endpoints (`/my-applications`, `/projects/:id/applications`) for restricted views.

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
        "projectId": "550e8400-e29b-41d4-a716-446655440000",
        "studentId": "7c8d9e0f-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
        "coverLetter": "I am extremely interested...",
        "resumeUrl": "https://res.cloudinary.com/...",
        "status": "PENDING",
        "appliedAt": "2026-01-28T10:30:00.000Z",
        "reviewedAt": null,
        "reviewerId": null,
        "rejectionReason": null,
        "project": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "title": "E-commerce Platform MVP",
          "projectType": "PROJECT",
          "status": "PUBLISHED",
          "createdById": "mentor-uuid-123",
          "currentApplicants": 8
        },
        "student": {
          "id": "7c8d9e0f-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
          "fullName": "John Doe",
          "email": "john.doe@example.com",
          "skills": ["JavaScript", "React", "Node.js"]
        },
        "reviewer": null
      }
    ],
    "pagination": {
      "total": 47,
      "page": 1,
      "limit": 10,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

**Sorting:**

Applications are always returned in descending order by `appliedAt` (newest first).

**Empty Results:**

If no applications match filters:

```json
{
  "success": true,
  "data": {
    "data": [],
    "pagination": {
      "total": 0,
      "page": 1,
      "limit": 10,
      "totalPages": 0,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

## Get Application by ID

**`GET /api/v1/applications/:id`**

Retrieve single application by ID.

**Authentication:** Required (All roles)

**Path Parameters:**

| Parameter | Type | Validation | Description    |
| --------- | ---- | ---------- | -------------- |
| `id`      | UUID | Valid UUID | Application ID |

**Authorization:**

No ownership checks. Any authenticated user can view any application.

**Success Response (200 OK):**

Same shape as single item in list response.

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Application not found"
  }
}
```

---

## Update Application Status

**`PATCH /api/v1/applications/:id/status`**

Update application status (review decision). Only project owners can update.

**Authentication:** Required (Mentor or Employer role only)

**Path Parameters:**

| Parameter | Type | Validation | Description    |
| --------- | ---- | ---------- | -------------- |
| `id`      | UUID | Valid UUID | Application ID |

**Request Body:**

```json
{
  "status": "ACCEPTED",
  "rejectionReason": null
}
```

**Field Validation:**

| Field             | Type   | Required | Constraints                                       | Notes                                |
| ----------------- | ------ | -------- | ------------------------------------------------- | ------------------------------------ |
| `status`          | enum   | Yes      | `PENDING`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED` | New status                           |
| `rejectionReason` | string | No       | 10-500 characters, trimmed                        | **Required** if status is `REJECTED` |

**Authorization:**

- User must be the project owner (`application.project.createdById === userId`)
- Mentors and employers can update applications for their own projects only
- Admins have no special privileges (must own project)

**Validation Rules:**

1. If `status === "REJECTED"` and `rejectionReason` is missing/empty → 400 error
2. If user is not project owner → 403 error
3. If application doesn't exist → 404 error

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "studentId": "7c8d9e0f-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
    "coverLetter": "I am extremely interested...",
    "resumeUrl": "https://res.cloudinary.com/...",
    "status": "ACCEPTED",
    "appliedAt": "2026-01-28T10:30:00.000Z",
    "reviewedAt": "2026-01-28T14:20:00.000Z",
    "reviewerId": "mentor-uuid-123",
    "rejectionReason": null,
    "project": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "E-commerce Platform MVP",
      "projectType": "PROJECT",
      "status": "PUBLISHED",
      "createdById": "mentor-uuid-123",
      "currentApplicants": 8
    },
    "student": {
      "id": "7c8d9e0f-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
      "fullName": "John Doe",
      "email": "john.doe@example.com",
      "skills": ["JavaScript", "React", "Node.js"]
    },
    "reviewer": {
      "id": "mentor-uuid-123",
      "fullName": "Jane Smith"
    }
  }
}
```

**Side Effects:**

1. `reviewedAt` timestamp set to current time
2. `reviewerId` set to current user's ID
3. Email notification queued to student (async, non-blocking)
4. If `status === "REJECTED"`, `rejectionReason` stored

**Email Notifications:**

Application status changes trigger different emails based on status:

| Status         | Email Subject                                    | Email Includes                 |
| -------------- | ------------------------------------------------ | ------------------------------ |
| `ACCEPTED`     | "Congratulations! You've been accepted..."       | Project details, next steps    |
| `REJECTED`     | "Application Update: [Project Title]"            | Rejection reason (if provided) |
| `UNDER_REVIEW` | "Your application for [Project] is under review" | Timeline expectations          |

**Error Responses:**

**403 Forbidden — Not Project Owner:**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to update this application"
  }
}
```

**400 Validation Error — Missing Rejection Reason:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Rejection reason is required when rejecting"
  }
}
```

**Example: Rejecting Application**

**Request:**

```json
PATCH /api/v1/applications/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/status

{
  "status": "REJECTED",
  "rejectionReason": "We're looking for candidates with more backend experience. Your frontend skills are strong, but this role requires deep knowledge of database optimization and API design."
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
    "status": "REJECTED",
    "reviewedAt": "2026-01-28T14:20:00.000Z",
    "reviewerId": "mentor-uuid-123",
    "rejectionReason": "We're looking for candidates with more backend experience. Your frontend skills are strong, but this role requires deep knowledge of database optimization and API design.",
    "reviewer": {
      "id": "mentor-uuid-123",
      "fullName": "Jane Smith"
    }
  }
}
```

---

## Get My Applications (Student)

**`GET /api/v1/applications/my-applications`**

Retrieve applications submitted by current user. Student-only endpoint.

**Authentication:** Required (Student role only)

**Query Parameters:** None

**Authorization:**

- Only students can access this endpoint
- Returns only applications created by authenticated student
- Filtered automatically by `studentId === userId`

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
      "projectId": "550e8400-e29b-41d4-a716-446655440000",
      "studentId": "7c8d9e0f-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
      "coverLetter": "I am extremely interested...",
      "resumeUrl": "https://res.cloudinary.com/...",
      "status": "PENDING",
      "appliedAt": "2026-01-28T10:30:00.000Z",
      "reviewedAt": null,
      "reviewerId": null,
      "rejectionReason": null,
      "project": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "E-commerce Platform MVP",
        "projectType": "PROJECT",
        "status": "PUBLISHED",
        "createdById": "mentor-uuid-123",
        "currentApplicants": 8
      },
      "student": {
        "id": "7c8d9e0f-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
        "fullName": "John Doe",
        "email": "john.doe@example.com",
        "skills": ["JavaScript", "React", "Node.js"]
      },
      "reviewer": null
    }
  ]
}
```

**Sorting:**

Applications returned in descending order by `appliedAt` (newest first).

**Empty Response:**

If student has no applications:

```json
{
  "success": true,
  "data": []
}
```

**Error Response (403 Forbidden):**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied. Required roles: STUDENT"
  }
}
```

---

## Get Project Applications

**`GET /api/v1/projects/:id/applications`**

Retrieve all applications for a specific project. Only project owners can access.

**Authentication:** Required (Mentor or Employer role only)

**Path Parameters:**

| Parameter | Type | Validation | Description |
| --------- | ---- | ---------- | ----------- |
| `id`      | UUID | Valid UUID | Project ID  |

**Authorization:**

- User must be the project owner (`project.createdById === userId`)
- Mentors and employers can only view applications for their own projects
- Admins have no special privileges

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
      "projectId": "550e8400-e29b-41d4-a716-446655440000",
      "studentId": "7c8d9e0f-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
      "coverLetter": "I am extremely interested...",
      "resumeUrl": "https://res.cloudinary.com/...",
      "status": "PENDING",
      "appliedAt": "2026-01-28T10:30:00.000Z",
      "reviewedAt": null,
      "reviewerId": null,
      "rejectionReason": null,
      "project": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "E-commerce Platform MVP",
        "projectType": "PROJECT",
        "status": "PUBLISHED",
        "createdById": "mentor-uuid-123",
        "currentApplicants": 8
      },
      "student": {
        "id": "7c8d9e0f-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
        "fullName": "John Doe",
        "email": "john.doe@example.com",
        "skills": ["JavaScript", "React", "Node.js"]
      },
      "reviewer": null
    },
    {
      "id": "b2c3d4e5-f6a7-5b8c-9d0e-1f2a3b4c5d6e",
      "projectId": "550e8400-e29b-41d4-a716-446655440000",
      "studentId": "8d9e0f1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
      "coverLetter": "With 3 years of full-stack experience...",
      "resumeUrl": "https://res.cloudinary.com/...",
      "status": "ACCEPTED",
      "appliedAt": "2026-01-27T15:20:00.000Z",
      "reviewedAt": "2026-01-28T09:15:00.000Z",
      "reviewerId": "mentor-uuid-123",
      "rejectionReason": null,
      "project": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "E-commerce Platform MVP",
        "projectType": "PROJECT",
        "status": "PUBLISHED",
        "createdById": "mentor-uuid-123",
        "currentApplicants": 8
      },
      "student": {
        "id": "8d9e0f1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
        "fullName": "Alice Johnson",
        "email": "alice.j@example.com",
        "skills": ["TypeScript", "React", "PostgreSQL", "Docker"]
      },
      "reviewer": {
        "id": "mentor-uuid-123",
        "fullName": "Jane Smith"
      }
    }
  ]
}
```

**Sorting:**

Applications returned in descending order by `appliedAt` (newest first).

**Error Responses:**

**404 Not Found — Project Doesn't Exist:**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Project not found"
  }
}
```

**403 Forbidden — Not Project Owner:**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to view these applications"
  }
}
```

---

## Application Status Lifecycle

### State Transitions

**Valid Transitions:**

```
PENDING → UNDER_REVIEW → ACCEPTED
PENDING → UNDER_REVIEW → REJECTED
PENDING → ACCEPTED
PENDING → REJECTED
UNDER_REVIEW → ACCEPTED
UNDER_REVIEW → REJECTED
```

**Invalid Transitions (Not Enforced):**

Backend does NOT enforce state transition rules. Project owners can change status to any value at any time, including:

- `ACCEPTED → REJECTED` (allowed but unusual)
- `REJECTED → ACCEPTED` (allowed, represents reconsideration)

This is intentional to support flexible review workflows.

### Timestamps

- `appliedAt`: Set when application created (immutable)
- `reviewedAt`: Set when status first changes from PENDING (updated on each status change)
- `reviewerId`: Set to user who last changed status (updated on each status change)

### Email Notifications

Notifications are sent for these status transitions:

- `PENDING → UNDER_REVIEW`: "Application under review"
- `PENDING → ACCEPTED`: "Congratulations, you've been accepted"
- `PENDING → REJECTED`: "Application update" with rejection reason
- `UNDER_REVIEW → ACCEPTED`: "Congratulations, you've been accepted"
- `UNDER_REVIEW → REJECTED`: "Application update" with rejection reason

**No Notification:**

- Status changes from ACCEPTED or REJECTED to any other status
- User preference `notifyOnApplicationStatus: false`

---

## Concurrent Application Handling

### Race Condition Protection

When multiple students apply simultaneously to a project nearing capacity:

**Problem:**

1. Student A checks capacity: 9/10 applicants → OK
2. Student B checks capacity: 9/10 applicants → OK
3. Student A submits → project becomes 10/10
4. Student B submits → should fail but naive implementation would accept

**Solution:**

Backend uses **Serializable transaction isolation** with **row-level locking**:

```typescript
// Pseudocode
await prisma.$transaction(async (tx) => {
  // SELECT FOR UPDATE locks project row
  const project = await tx.project.findUnique({
    where: { id: projectId }
  });

  // Capacity check happens inside transaction
  if (project.currentApplicants >= project.maxApplicants) {
    throw new Error("Project full");
  }

  // Create application and increment counter atomically
  await tx.application.create({ ... });
  await tx.project.update({
    where: { id: projectId },
    data: { currentApplicants: { increment: 1 } }
  });
}, {
  isolationLevel: 'Serializable',
  maxWait: 5000,
  timeout: 10000
});
```

**Behavior:**

- If 10 students apply simultaneously to a project with 1 spot remaining:
  - 1 succeeds (first to acquire lock)
  - 9 fail with 400 error "Project has reached maximum applicants"

**Timeout Behavior:**

- If lock cannot be acquired within 5 seconds → 500 error
- If transaction doesn't complete within 10 seconds → 500 error
- These indicate heavy contention (very rare)

---

## Notification Preferences

Users can control email notifications for application events via notification preferences:

**Relevant Preferences:**

| Preference                    | Default | Affects                                             |
| ----------------------------- | ------- | --------------------------------------------------- |
| `notifyOnApplicationReceived` | `true`  | Mentor/employer receives email when student applies |
| `notifyOnApplicationStatus`   | `true`  | Student receives email when status changes          |

**To Update Preferences:**

```
PATCH /api/v1/users/me/notification-preferences
{
  "notifyOnApplicationStatus": false
}
```

See Users & Profiles API documentation for details.

---

## Common Questions

**Q: Can students see other students' applications?**  
**A:** Yes, via `GET /applications` (no ownership filtering). However, this is by design to allow transparency. Use `/my-applications` for personal view.

**Q: Can a student apply to the same project twice?**  
**A:** No. Unique constraint enforced: `(projectId, studentId)`. Attempting duplicate returns 409 Conflict.

**Q: What happens if project is deleted after application submitted?**  
**A:** Application is also deleted (cascade delete). Project and all its applications are atomic.

**Q: Can project owner change application status back to PENDING?**  
**A:** Yes. Backend allows any status transition. Use case: Re-opening review after rejection.

**Q: Is `resumeUrl` validated to be a Cloudinary URL?**  
**A:** No. Any valid URL is accepted. Frontend should upload via `/upload/resume` but backend doesn't enforce this.

**Q: What if notification email fails to send?**  
**A:** Email queuing is asynchronous. If it fails, it retries 3 times with exponential backoff. If all retries fail, email is dropped (not blocking).

**Q: Can mentors apply to projects?**  
**A:** No. `POST /applications` requires Student role. Mentors/employers get 403 Forbidden.

**Q: Can admin create applications on behalf of students?**  
**A:** No. Admins have no special privileges for creating applications.

**Q: What happens to applications when project deadline passes?**  
**A:** Nothing automatic. Project status must be manually changed to CLOSED. Applications remain in their current state.

**Q: Can I filter applications by multiple statuses?**  
**A:** No. `status` query parameter accepts only one value. To get multiple statuses, make separate requests or use `GET /applications` without status filter.

**Q: Does updating application status affect project applicant count?**  
**A:** No. `currentApplicants` only tracks total applications, not status breakdown.

---

## Error Codes Reference

| Code               | HTTP Status | Description                       |
| ------------------ | ----------- | --------------------------------- |
| `VALIDATION_ERROR` | 400         | Request validation failed         |
| `UNAUTHORIZED`     | 401         | Missing or invalid authentication |
| `FORBIDDEN`        | 403         | Insufficient permissions          |
| `NOT_FOUND`        | 404         | Resource not found                |
| `CONFLICT`         | 409         | Duplicate application             |
| `INTERNAL_ERROR`   | 500         | Server error (contact support)    |

All error responses include `errorId` and `correlationId` for support.
