# Projects API Documentation

**Base URL:** `https://api.codionix.com/api/v1/projects`

**Version:** v1  
**Last Updated:** January 2026

---

## Overview

The Projects API manages project and internship listings on the Codionix platform. Projects can be created by mentors and employers, and students can browse and apply to them.

### Key Features

- Create, read, update, and delete projects
- Advanced filtering and search
- Pagination support
- Role-based access control
- Status lifecycle management (DRAFT → PUBLISHED → CLOSED)
- Applicant tracking and limits

---

## Permission Model

### User Roles

| Role       | Browse Projects | Create Projects | Update Own Projects | Delete Own Projects | View Applications |
| ---------- | --------------- | --------------- | ------------------- | ------------------- | ----------------- |
| `STUDENT`  | ✅ Public       | ❌              | ❌                  | ❌                  | ❌                |
| `MENTOR`   | ✅ Public       | ✅              | ✅                  | ✅                  | ✅ Own projects   |
| `EMPLOYER` | ✅ Public       | ✅              | ✅                  | ✅                  | ✅ Own projects   |
| `ADMIN`    | ✅ All          | ✅              | ✅ All              | ✅ All              | ✅ All            |

**Authentication:**

- **Public endpoints:** `/` (list), `/:id` (get by ID) — No authentication required
- **Protected endpoints:** All mutation operations require valid access token
- **Authorization:** Mentors and employers can only modify their own projects

---

## Endpoints

### List All Projects

**`GET /`**

Retrieve paginated list of projects with optional filtering and search.

**Authentication:** None (public endpoint)

**Query Parameters:**

| Parameter         | Type    | Required | Default | Description                                        |
| ----------------- | ------- | -------- | ------- | -------------------------------------------------- |
| `page`            | integer | No       | `1`     | Page number (min: 1)                               |
| `limit`           | integer | No       | `10`    | Items per page (min: 1, max: 100)                  |
| `projectType`     | enum    | No       | —       | `PROJECT` or `INTERNSHIP`                          |
| `difficultyLevel` | enum    | No       | —       | `BEGINNER`, `INTERMEDIATE`, or `ADVANCED`          |
| `status`          | enum    | No       | —       | `DRAFT`, `PUBLISHED`, or `CLOSED`                  |
| `skills`          | string  | No       | —       | Comma-separated list of required skills            |
| `search`          | string  | No       | —       | Search in title and description (case-insensitive) |

**Query Behavior:**

- **Multiple filters:** Combined with AND logic (all must match)
- **Skills matching:** Projects must have at least one of the specified skills (`hasSome` operator)
- **Search:** Matches against both `title` and `description` fields using case-insensitive partial matching
- **Results ordering:** Always sorted by `createdAt` descending (newest first)

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Build React Dashboard with TypeScript",
        "description": "Create a production-ready admin dashboard using React 18, TypeScript, and Tailwind CSS. Features include data visualization, authentication, and real-time updates.",
        "skills": ["React", "TypeScript", "Tailwind CSS", "REST APIs"],
        "duration": "3 months",
        "deadline": "2026-04-15T23:59:59.999Z",
        "projectType": "PROJECT",
        "stipend": "1500.00",
        "isRemote": true,
        "difficultyLevel": "INTERMEDIATE",
        "status": "PUBLISHED",
        "companyName": "TechCorp Solutions",
        "location": "San Francisco, CA",
        "maxApplicants": 20,
        "currentApplicants": 7,
        "createdAt": "2026-01-20T10:30:00.000Z",
        "updatedAt": "2026-01-24T15:45:00.000Z",
        "createdBy": {
          "id": "123e4567-e89b-12d3-a456-426614174000",
          "fullName": "Jane Smith",
          "role": "EMPLOYER"
        }
      }
    ],
    "pagination": {
      "total": 156,
      "page": 1,
      "limit": 10,
      "totalPages": 16,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

**Response Fields:**

| Field                | Type     | Description                                       | Nullable |
| -------------------- | -------- | ------------------------------------------------- | -------- |
| `id`                 | UUID     | Unique project identifier                         | No       |
| `title`              | string   | Project title (5-100 chars)                       | No       |
| `description`        | string   | Detailed description (min 20 chars)               | No       |
| `skills`             | string[] | Required skills (1-10 items, each 1+ chars)       | No       |
| `duration`           | string   | Expected project duration (e.g., "3 months")      | No       |
| `deadline`           | ISO 8601 | Application deadline                              | No       |
| `projectType`        | enum     | `PROJECT` or `INTERNSHIP`                         | No       |
| `stipend`            | decimal  | Stipend amount (2 decimal places)                 | Yes      |
| `isRemote`           | boolean  | Remote work allowed                               | No       |
| `difficultyLevel`    | enum     | `BEGINNER`, `INTERMEDIATE`, or `ADVANCED`         | No       |
| `status`             | enum     | `DRAFT`, `PUBLISHED`, or `CLOSED`                 | No       |
| `companyName`        | string   | Organization name                                 | Yes      |
| `location`           | string   | Physical location (if not remote)                 | Yes      |
| `maxApplicants`      | integer  | Maximum applicants allowed (default: 10)          | Yes      |
| `currentApplicants`  | integer  | Current number of applicants                      | No       |
| `createdAt`          | ISO 8601 | Project creation timestamp                        | No       |
| `updatedAt`          | ISO 8601 | Last update timestamp                             | No       |
| `createdBy`          | object   | Creator information                               | No       |
| `createdBy.id`       | UUID     | Creator's user ID                                 | No       |
| `createdBy.fullName` | string   | Creator's full name                               | No       |
| `createdBy.role`     | enum     | Creator's role (`MENTOR`, `EMPLOYER`, or `ADMIN`) | No       |

**Example Requests:**

**Filter by project type and difficulty:**

```
GET /projects?projectType=INTERNSHIP&difficultyLevel=BEGINNER&limit=20
```

**Search with skill filter:**

```
GET /projects?skills=React,TypeScript&search=dashboard
```

**Get only published projects:**

```
GET /projects?status=PUBLISHED&page=2&limit=15
```

**Error Response (400 Validation Error):**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "limit",
        "message": "Number must be less than or equal to 100"
      }
    ]
  }
}
```

---

### Get Project by ID

**`GET /:id`**

Retrieve detailed information about a specific project.

**Authentication:** None (public endpoint)

**URL Parameters:**

| Parameter | Type | Required | Description        |
| --------- | ---- | -------- | ------------------ |
| `id`      | UUID | Yes      | Project identifier |

**Success Response (200 OK):**

Returns single project object with same structure as list endpoint.

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Build React Dashboard with TypeScript",
    "description": "Create a production-ready admin dashboard...",
    "skills": ["React", "TypeScript", "Tailwind CSS"],
    "duration": "3 months",
    "deadline": "2026-04-15T23:59:59.999Z",
    "projectType": "PROJECT",
    "stipend": "1500.00",
    "isRemote": true,
    "difficultyLevel": "INTERMEDIATE",
    "status": "PUBLISHED",
    "companyName": "TechCorp Solutions",
    "location": null,
    "maxApplicants": 20,
    "currentApplicants": 7,
    "createdAt": "2026-01-20T10:30:00.000Z",
    "updatedAt": "2026-01-24T15:45:00.000Z",
    "createdBy": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "fullName": "Jane Smith",
      "role": "EMPLOYER"
    }
  }
}
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Project not found"
  }
}
```

**Error Response (400 Invalid UUID):**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "id",
        "message": "Invalid project ID"
      }
    ]
  }
}
```

---

### Create Project

**`POST /`**

Create a new project. Only accessible to mentors, employers, and admins.

**Authentication:** Required  
**Authorization:** `MENTOR`, `EMPLOYER`, or `ADMIN` role

**Request Body:**

```json
{
  "title": "Build React Dashboard with TypeScript",
  "description": "Create a production-ready admin dashboard using React 18, TypeScript, and Tailwind CSS. Features include data visualization, authentication, and real-time updates.",
  "skills": ["React", "TypeScript", "Tailwind CSS", "REST APIs"],
  "duration": "3 months",
  "deadline": "2026-04-15T23:59:59.999Z",
  "projectType": "PROJECT",
  "stipend": 1500.0,
  "isRemote": true,
  "difficultyLevel": "INTERMEDIATE",
  "status": "DRAFT",
  "companyName": "TechCorp Solutions",
  "location": null,
  "maxApplicants": 20
}
```

**Field Validation Rules:**

| Field             | Type     | Required | Constraints                              |
| ----------------- | -------- | -------- | ---------------------------------------- |
| `title`           | string   | Yes      | 5-100 chars, trimmed                     |
| `description`     | string   | Yes      | Min 20 chars, trimmed                    |
| `skills`          | string[] | Yes      | 1-10 items, each min 1 char (after trim) |
| `duration`        | string   | Yes      | Min 1 char, trimmed                      |
| `deadline`        | ISO 8601 | Yes      | Valid datetime                           |
| `projectType`     | enum     | Yes      | `PROJECT` or `INTERNSHIP`                |
| `stipend`         | decimal  | No       | Positive number, max 2 decimal places    |
| `isRemote`        | boolean  | No       | Default: `true`                          |
| `difficultyLevel` | enum     | No       | Default: `INTERMEDIATE`                  |
| `status`          | enum     | No       | Default: `DRAFT`                         |
| `companyName`     | string   | No       | Trimmed                                  |
| `location`        | string   | No       | Trimmed                                  |
| `maxApplicants`   | integer  | No       | 1-100, default: 10                       |

**Allowed Values:**

- **projectType:** `PROJECT`, `INTERNSHIP`
- **difficultyLevel:** `BEGINNER`, `INTERMEDIATE`, `ADVANCED`
- **status:** `DRAFT`, `PUBLISHED`, `CLOSED`

**Success Response (201 Created):**

Returns created project object (same structure as GET response).

**Important Behavior:**

- **Nullable fields:** Only included in database if provided in request
  - Example: If `stipend` not provided → stored as `NULL`, not `0`
  - Example: If `companyName` not provided → stored as `NULL`, not empty string
- **Auto-set fields:**
  - `createdById`: Set to authenticated user's ID
  - `currentApplicants`: Initialized to `0`
  - `createdAt`, `updatedAt`: Set to current timestamp

**Error Response (401 Unauthorized):**

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**Error Response (403 Forbidden):**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied. Required roles: MENTOR, EMPLOYER"
  }
}
```

**Error Response (400 Validation Error):**

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
      },
      {
        "field": "skills",
        "message": "Maximum 10 skills allowed"
      },
      {
        "field": "deadline",
        "message": "Invalid deadline format"
      }
    ]
  }
}
```

**Common Validation Errors:**

| Error Message                                            | Cause                          | Fix                           |
| -------------------------------------------------------- | ------------------------------ | ----------------------------- |
| `Title must be at least 5 characters`                    | Title too short                | Provide title ≥5 chars        |
| `Title must not exceed 100 characters`                   | Title too long                 | Reduce to ≤100 chars          |
| `Description must be at least 20 characters`             | Description too short          | Provide description ≥20 chars |
| `At least one skill is required`                         | Empty skills array             | Add at least 1 skill          |
| `Maximum 10 skills allowed`                              | More than 10 skills            | Reduce to ≤10 skills          |
| `Skill cannot be empty`                                  | Empty string in skills array   | Remove empty strings          |
| `Duration is required`                                   | Missing duration field         | Provide duration string       |
| `Invalid deadline format`                                | Invalid ISO 8601 datetime      | Use valid ISO format          |
| `Type must be PROJECT or INTERNSHIP`                     | Invalid projectType value      | Use `PROJECT` or `INTERNSHIP` |
| `Stipend must be positive`                               | Negative stipend value         | Use positive number           |
| `Difficulty must be BEGINNER, INTERMEDIATE, or ADVANCED` | Invalid difficulty             | Use valid enum value          |
| `Max applicants must be positive`                        | Zero or negative maxApplicants | Use 1-100                     |
| `Max applicants cannot exceed 100`                       | maxApplicants > 100            | Use ≤100                      |

---

### Update Project

**`PATCH /:id`**

Update an existing project. Only the project creator can update (or admin).

**Authentication:** Required  
**Authorization:** Project creator or `ADMIN`

**URL Parameters:**

| Parameter | Type | Required | Description        |
| --------- | ---- | -------- | ------------------ |
| `id`      | UUID | Yes      | Project identifier |

**Request Body (all fields optional):**

```json
{
  "title": "Updated Title",
  "description": "Updated description with more details...",
  "skills": ["React", "TypeScript", "Node.js"],
  "deadline": "2026-05-30T23:59:59.999Z",
  "status": "PUBLISHED",
  "maxApplicants": 30
}
```

**Validation Rules:**

- Same validation rules as create endpoint
- All fields are optional
- Only provided fields are updated
- `null` values clear the field (for nullable fields only)

**Nullable Fields:**

These fields can be set to `null` to clear them:

- `stipend`
- `companyName`
- `location`

**Non-Nullable Fields:**

These fields cannot be set to `null`:

- `title`
- `description`
- `skills`
- `duration`
- `deadline`
- `projectType`
- `isRemote`
- `difficultyLevel`
- `status`
- `maxApplicants`

**Success Response (200 OK):**

Returns updated project object (same structure as GET response).

**Behavior Notes:**

- **Omitted fields:** Not updated (remain unchanged)
- **`null` values:** Field cleared (set to NULL in database) — only for nullable fields
- **Auto-updated fields:**
  - `updatedAt`: Set to current timestamp
  - `createdById`, `currentApplicants`: Never modified

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Project not found"
  }
}
```

**Error Response (403 Forbidden):**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to update this project"
  }
}
```

**CRITICAL:** Authorization check verifies `createdById === userId` before allowing update.

---

### Delete Project

**`DELETE /:id`**

Permanently delete a project. Only the project creator can delete (or admin).

**Authentication:** Required  
**Authorization:** Project creator or `ADMIN`

**URL Parameters:**

| Parameter | Type | Required | Description        |
| --------- | ---- | -------- | ------------------ |
| `id`      | UUID | Yes      | Project identifier |

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Project deleted successfully"
  }
}
```

**CASCADE DELETION WARNING:**

When a project is deleted, the following related data is **automatically deleted** (database CASCADE):

- **All applications** to this project
- **All feedback** on those applications
- **All messages** in those applications

**This operation is IRREVERSIBLE.**

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Project not found"
  }
}
```

**Error Response (403 Forbidden):**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to delete this project"
  }
}
```

---

### Get My Projects

**`GET /my-projects`**

Retrieve all projects created by the authenticated user.

**Authentication:** Required  
**Authorization:** `MENTOR`, `EMPLOYER`, or `ADMIN`

**Query Parameters:** None

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Build React Dashboard with TypeScript",
      "description": "Create a production-ready admin dashboard...",
      "skills": ["React", "TypeScript"],
      "duration": "3 months",
      "deadline": "2026-04-15T23:59:59.999Z",
      "projectType": "PROJECT",
      "stipend": "1500.00",
      "isRemote": true,
      "difficultyLevel": "INTERMEDIATE",
      "status": "PUBLISHED",
      "companyName": "TechCorp Solutions",
      "location": null,
      "maxApplicants": 20,
      "currentApplicants": 7,
      "createdAt": "2026-01-20T10:30:00.000Z",
      "updatedAt": "2026-01-24T15:45:00.000Z",
      "createdBy": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "fullName": "Jane Smith",
        "role": "EMPLOYER"
      }
    }
  ]
}
```

**Response Notes:**

- Returns array of project objects (empty array if no projects)
- Results ordered by `createdAt` descending (newest first)
- No pagination (returns all user's projects)
- Includes projects in all statuses (DRAFT, PUBLISHED, CLOSED)

**Error Response (403 Forbidden):**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied. Required roles: MENTOR, EMPLOYER"
  }
}
```

**Note:** Students cannot create projects, so this endpoint is forbidden for STUDENT role.

---

### Get Project Applications

**`GET /:id/applications`**

Retrieve all applications for a specific project. Only accessible to project creator.

**Authentication:** Required  
**Authorization:** Project creator or `ADMIN`

**URL Parameters:**

| Parameter | Type | Required | Description        |
| --------- | ---- | -------- | ------------------ |
| `id`      | UUID | Yes      | Project identifier |

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "application-uuid",
      "projectId": "550e8400-e29b-41d4-a716-446655440000",
      "studentId": "student-uuid",
      "coverLetter": "I am very interested in this project...",
      "resumeUrl": "https://res.cloudinary.com/codionix/resumes/student_resume.pdf",
      "status": "PENDING",
      "appliedAt": "2026-01-25T14:30:00.000Z",
      "reviewedAt": null,
      "reviewerId": null,
      "rejectionReason": null,
      "project": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Build React Dashboard with TypeScript",
        "projectType": "PROJECT",
        "status": "PUBLISHED",
        "createdById": "123e4567-e89b-12d3-a456-426614174000",
        "currentApplicants": 7
      },
      "student": {
        "id": "student-uuid",
        "fullName": "John Doe",
        "email": "student@example.com",
        "skills": ["React", "TypeScript", "JavaScript"]
      },
      "reviewer": null
    }
  ]
}
```

**Response Notes:**

- Returns array of application objects (empty array if no applications)
- Results ordered by `appliedAt` descending (newest first)
- Includes full student information (name, email, skills)
- Includes reviewer information if application was reviewed

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Project not found"
  }
}
```

**Error Response (403 Forbidden):**

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

## Project Status Lifecycle

### Status Flow

```
DRAFT → PUBLISHED → CLOSED
  ↑         ↓
  └─────────┘
```

**State Transitions:**

| From        | To          | Allowed | Notes                                     |
| ----------- | ----------- | ------- | ----------------------------------------- |
| `DRAFT`     | `PUBLISHED` | ✅      | Make project visible to students          |
| `DRAFT`     | `CLOSED`    | ✅      | Cancel project before publishing          |
| `PUBLISHED` | `DRAFT`     | ✅      | Unpublish project (hides from students)   |
| `PUBLISHED` | `CLOSED`    | ✅      | Close project after deadline or manually  |
| `CLOSED`    | `PUBLISHED` | ❌      | Projects cannot be reopened after closing |
| `CLOSED`    | `DRAFT`     | ❌      | Projects cannot be reopened after closing |

**Status Behavior:**

| Status      | Visible to Students | Can Apply | Auto-Closed After Deadline |
| ----------- | ------------------- | --------- | -------------------------- |
| `DRAFT`     | ❌                  | ❌        | ❌                         |
| `PUBLISHED` | ✅                  | ✅        | ✅ (via cron job)          |
| `CLOSED`    | ✅                  | ❌        | —                          |

**Automatic Closure:**

- Projects with `status: PUBLISHED` and `deadline < now` are automatically closed
- Cron job runs every 6 hours: `0 */6 * * *`
- See: `backend/src/jobs/project.jobs.ts` → `autoCloseExpiredProjects()`

---

## Application Constraints

### Maximum Applicants

**Field:** `maxApplicants`

**Behavior:**

- When project reaches `maxApplicants`, further applications are **rejected**
- Counter (`currentApplicants`) incremented on each successful application
- Transaction-level locking prevents race conditions

**Code Implementation:**

```typescript
// From: backend/src/services/application.service.ts
const project = await tx.project.findUnique({
  where: { id: projectId },
  // SELECT FOR UPDATE locks row until transaction completes
});

if (project.currentApplicants >= project.maxApplicants) {
  throw new ValidationError("Project has reached maximum applicants");
}
```

**CRITICAL:** Uses `Serializable` isolation level to prevent phantom reads during concurrent applications.

---

### Application Deadline

**Field:** `deadline`

**Behavior:**

- Applications submitted after `deadline` are **rejected**
- Validation occurs during application creation
- Projects are auto-closed after deadline

**Validation:**

```typescript
// From: backend/src/services/application.service.ts
if (project.deadline < new Date()) {
  throw new ValidationError("Cannot apply to projects past their deadline");
}
```

---

### Duplicate Applications

**Constraint:** `unique([projectId, studentId])`

**Behavior:**

- Students can only apply **once** per project
- Enforced via database unique constraint
- Attempting duplicate application returns 409 Conflict

**Error Response:**

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "You have already applied to this project"
  }
}
```

---

## Pagination

**Default Behavior:**

- Default page size: `10`
- Maximum page size: `100`
- Page numbers start at `1`

**Query Parameters:**

```
GET /projects?page=2&limit=25
```

**Response Structure:**

```json
{
  "pagination": {
    "total": 156, // Total matching results
    "page": 2, // Current page
    "limit": 25, // Items per page
    "totalPages": 7, // ceil(total / limit)
    "hasNextPage": true, // page < totalPages
    "hasPrevPage": true // page > 1
  }
}
```

---

## Filtering and Search

### Filter Examples

**Filter by project type:**

```
GET /projects?projectType=INTERNSHIP
```

**Filter by difficulty:**

```
GET /projects?difficultyLevel=BEGINNER
```

**Filter by status:**

```
GET /projects?status=PUBLISHED
```

**Filter by skills (OR logic):**

```
GET /projects?skills=React,TypeScript,Node.js
```

Returns projects that require **at least one** of these skills.

**Combine multiple filters (AND logic):**

```
GET /projects?projectType=INTERNSHIP&difficultyLevel=BEGINNER&status=PUBLISHED
```

### Search

**Full-text search:**

```
GET /projects?search=dashboard
```

**Searches in:**

- `title` (case-insensitive, partial match)
- `description` (case-insensitive, partial match)

**Combined with filters:**

```
GET /projects?search=react&skills=TypeScript&projectType=PROJECT
```

**Implementation:**

```typescript
// From: backend/src/services/project.service.ts
if (search) {
  where.OR = [
    { title: { contains: search, mode: "insensitive" } },
    { description: { contains: search, mode: "insensitive" } },
  ];
}
```

---

## Common Questions

**Q: Can I update a project after it's published?**  
**A:** Yes. You can update any field at any time (title, description, deadline, status, etc.).

**Q: What happens to applications when a project is deleted?**  
**A:** All applications, feedback, and messages are permanently deleted (CASCADE). This is irreversible.

**Q: Can I reopen a closed project?**  
**A:** No. Once a project is `CLOSED`, it cannot be changed to `PUBLISHED` or `DRAFT`.

**Q: What happens if I reduce `maxApplicants` below `currentApplicants`?**  
**A:** Update succeeds. Existing applications remain valid. New applications are blocked.

**Q: Can students see DRAFT projects?**  
**A:** No. Only `PUBLISHED` and `CLOSED` projects are visible to students.

**Q: Can I apply to a CLOSED project?**  
**A:** No. Applications are only allowed for `PUBLISHED` projects.

**Q: What if deadline is in the past when creating a project?**  
**A:** Allowed. You can create projects with past deadlines (useful for historical records).

**Q: Can I change the project creator?**  
**A:** No. `createdById` is immutable and cannot be changed via API.

**Q: What if I delete my account? What happens to my projects?**  
**A:** All projects are deleted (CASCADE) along with all applications, feedback, and messages.

**Q: Can ADMIN users modify any project?**  
**A:** Yes. ADMIN role bypasses ownership checks for update and delete operations.

**Q: Can I create a project without a stipend?**  
**A:** Yes. Omit the `stipend` field or set it to `null` in the request.

**Q: Can I have zero skills?**  
**A:** No. At least 1 skill is required.

**Q: Are skill names case-sensitive?**  
**A:** Yes. "React" and "react" are treated as different skills.

**Q: Can I have duplicate skills?**  
**A:** Technically yes (backend doesn't enforce uniqueness), but not recommended.

---

## Error Codes Reference

| Code                  | HTTP Status | Description                             |
| --------------------- | ----------- | --------------------------------------- |
| `VALIDATION_ERROR`    | 400         | Request validation failed               |
| `UNAUTHORIZED`        | 401         | Missing or invalid authentication token |
| `FORBIDDEN`           | 403         | Insufficient permissions for operation  |
| `NOT_FOUND`           | 404         | Project not found                       |
| `CONFLICT`            | 409         | Duplicate application or data conflict  |
| `RATE_LIMIT_EXCEEDED` | 429         | Too many requests                       |
| `INTERNAL_ERROR`      | 500         | Server error (contact support)          |

**All error responses include:**

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

## Rate Limiting

**General API Limit:**

- **Window:** 15 minutes
- **Max requests:** 200 per IP
- **Applies to:** All `/projects` endpoints

**Response when limit exceeded (429):**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests from this IP, please try again later"
  }
}
```

**Response Headers:**

```
RateLimit-Limit: 200
RateLimit-Remaining: 145
RateLimit-Reset: 1706094900
```

---

## Database Schema Reference

**Table:** `projects`

```sql
CREATE TABLE "projects" (
  "id" TEXT PRIMARY KEY,
  "createdById" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" VARCHAR(100) NOT NULL,
  "description" TEXT NOT NULL,
  "skills" TEXT[] NOT NULL,
  "duration" TEXT NOT NULL,
  "deadline" TIMESTAMP(3) NOT NULL,
  "projectType" "ProjectType" NOT NULL DEFAULT 'PROJECT',
  "stipend" DECIMAL(10,2),
  "isRemote" BOOLEAN NOT NULL DEFAULT true,
  "difficultyLevel" "DifficultyLevel" NOT NULL DEFAULT 'INTERMEDIATE',
  "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
  "companyName" TEXT,
  "location" TEXT,
  "maxApplicants" INTEGER DEFAULT 10,
  "currentApplicants" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "projects_createdById_idx" ON "projects"("createdById");
CREATE INDEX "projects_status_idx" ON "projects"("status");
CREATE INDEX "projects_projectType_idx" ON "projects"("projectType");
CREATE INDEX "projects_deadline_idx" ON "projects"("deadline");
CREATE INDEX "projects_skills_idx" ON "projects"("skills");
CREATE INDEX "deadline_status_idx" ON "projects"("deadline", "status");
```

**Indexes:**

- `createdById`: Fast lookup of user's projects
- `status`: Fast filtering by status
- `projectType`: Fast filtering by type
- `deadline`: Fast sorting and filtering by deadline
- `skills`: Fast skill-based filtering (GIN index for arrays)
- `(deadline, status)`: Composite index for auto-closure job

---

## Implementation Notes

**Transaction Isolation:**

- Application creation uses `Serializable` isolation level
- Prevents race conditions when checking `maxApplicants`
- See: `backend/src/services/application.service.ts`

**Cron Jobs:**

- Auto-close expired projects: Every 6 hours (`0 */6 * * *`)
- See: `backend/src/jobs/project.jobs.ts`

**Logging:**

- All operations tracked with correlation IDs
- Performance tracking for slow queries (>1000ms)
- See: `backend/src/utils/logger.ts`

**Metrics:**

- Request counts, response times, error rates tracked
- Exposed via `/api/v1/metrics/prometheus`
- See: `backend/src/services/metrics.service.ts`
