# Feedback API

**Base URL:** `https://api.codionix.com/api/v1/feedback`

Feedback is given by mentors/employers to students on accepted or rejected applications. Students receive structured feedback including rating, strengths, and areas for improvement.

---

## Authorization Matrix

| Role       | Create Feedback | View Own Feedback | View Given Feedback | View Public Feedback | Update/Delete Feedback |
| ---------- | --------------- | ----------------- | ------------------- | -------------------- | ---------------------- |
| `STUDENT`  | ❌              | ✅                | ❌                  | ✅                   | ❌                     |
| `MENTOR`   | ✅              | ❌                | ✅                  | ✅                   | ✅ (own only)          |
| `EMPLOYER` | ✅              | ❌                | ✅                  | ✅                   | ✅ (own only)          |
| `ADMIN`    | ✅              | ✅                | ✅                  | ✅                   | ✅ (all)               |

---

## Business Rules

**Feedback Creation Constraints:**

1. **One feedback per application** — Cannot create multiple feedback for same application
2. **Application must be reviewed** — Status must be `ACCEPTED` or `REJECTED` (not `PENDING` or `UNDER_REVIEW`)
3. **Project owner only** — Only the person who created the project can give feedback
4. **Cannot feedback your own applications** — Project owner cannot give feedback to themselves

**Privacy Rules:**

- `isPublic: true` → Anyone can view (including unauthenticated users)
- `isPublic: false` → Only student (recipient) and mentor (author) can view
- Public endpoint returns ONLY public feedback
- Authenticated endpoints respect privacy rules

---

## List Feedback

**`GET /`**

List feedback with filters and pagination. Public endpoint returns only public feedback. Authenticated users see public feedback + private feedback they're involved in.

**Authentication:** Optional (affects visibility)

**Query Parameters:**

| Parameter   | Type    | Required | Description                              | Default |
| ----------- | ------- | -------- | ---------------------------------------- | ------- |
| `page`      | integer | No       | Page number (1-indexed)                  | `1`     |
| `limit`     | integer | No       | Items per page (max 100)                 | `10`    |
| `studentId` | UUID    | No       | Filter by student (recipient)            | —       |
| `mentorId`  | UUID    | No       | Filter by mentor (author)                | —       |
| `isPublic`  | boolean | No       | Filter by visibility (`true` or `false`) | —       |

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "fb123e45-67a8-9012-b345-6789abcdef01",
        "applicationId": "app12345-6789-0123-4567-89abcdef0123",
        "mentorId": "mentor12-3456-7890-1234-567890abcdef",
        "rating": 4,
        "feedbackText": "Strong technical skills demonstrated in the project. Communication could be improved, especially in explaining complex concepts to non-technical stakeholders.",
        "strengths": [
          "Excellent problem-solving abilities",
          "Clean, well-documented code",
          "Proactive in asking questions"
        ],
        "improvements": [
          "Practice explaining technical decisions",
          "Improve time estimation accuracy",
          "Learn to prioritize tasks better"
        ],
        "isPublic": true,
        "createdAt": "2026-01-20T14:30:00.000Z",
        "updatedAt": "2026-01-20T14:30:00.000Z",
        "application": {
          "id": "app12345-6789-0123-4567-89abcdef0123",
          "studentId": "student1-2345-6789-0123-456789abcdef",
          "projectId": "proj1234-5678-9012-3456-7890abcdef01",
          "status": "ACCEPTED",
          "project": {
            "id": "proj1234-5678-9012-3456-7890abcdef01",
            "title": "E-commerce Platform Redesign",
            "createdById": "mentor12-3456-7890-1234-567890abcdef"
          },
          "student": {
            "id": "student1-2345-6789-0123-456789abcdef",
            "fullName": "Sarah Johnson",
            "email": "sarah.j@example.com"
          }
        },
        "mentor": {
          "id": "mentor12-3456-7890-1234-567890abcdef",
          "fullName": "Dr. Michael Chen",
          "role": "MENTOR"
        }
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

**Privacy Filtering (Unauthenticated):**

```json
{
  "data": [
    {
      "id": "...",
      "isPublic": true
      // Only public feedback returned
    }
  ]
}
```

**Privacy Filtering (Authenticated as Student):**

```json
{
  "data": [
    {
      "id": "feedback-for-me-private",
      "isPublic": false,
      "application": {
        "studentId": "my-user-id" // I'm the student
      }
      // Can see private feedback given to me
    },
    {
      "id": "public-feedback",
      "isPublic": true
      // Can also see public feedback
    }
  ]
}
```

**Error Response (400 Validation):**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "studentId",
        "message": "Invalid student ID"
      }
    ]
  }
}
```

---

## Get Feedback by ID

**`GET /:id`**

Retrieve specific feedback by ID. Privacy rules apply.

**Authentication:** Optional (affects access)

**Path Parameters:**

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `id`      | UUID | Yes      | Feedback ID |

**Success Response (200 OK):**

Returns same shape as list item (see above).

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Feedback not found"
  }
}
```

**Error Response (403 Forbidden - Private Feedback):**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have access to this feedback"
  }
}
```

**Access Rules:**

- Public feedback → Anyone can view
- Private feedback → Only student (recipient) or mentor (author) can view
- Unauthenticated users → Only public feedback

---

## Get My Feedback (Student)

**`GET /my-feedback`**

Retrieve all feedback received by authenticated student.

**Authentication:** Required (Student only)

**Authorization:** `STUDENT` role

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "fb123e45-67a8-9012-b345-6789abcdef01",
      "rating": 4,
      "feedbackText": "Strong performance overall...",
      "strengths": ["Problem-solving", "Code quality"],
      "improvements": ["Time management", "Communication"],
      "isPublic": false,
      "createdAt": "2026-01-20T14:30:00.000Z",
      "application": {
        "id": "app12345-6789-0123-4567-89abcdef0123",
        "project": {
          "id": "proj1234-5678-9012-3456-7890abcdef01",
          "title": "Mobile App Development"
        }
      },
      "mentor": {
        "id": "mentor12-3456-7890-1234-567890abcdef",
        "fullName": "Dr. Michael Chen",
        "role": "MENTOR"
      }
    }
  ]
}
```

**Returns:** Array of all feedback where `application.studentId === current_user.id`

**Ordering:** Most recent first (`createdAt DESC`)

**Privacy:** Includes both public and private feedback (you're the recipient)

**Error Response (403 Forbidden - Wrong Role):**

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

## Get Feedback Given by Mentor

**`GET /given`**

Retrieve all feedback created by authenticated mentor/employer.

**Authentication:** Required (Mentor/Employer only)

**Authorization:** `MENTOR` or `EMPLOYER` role

**Success Response (200 OK):**

Same shape as `/my-feedback`, ordered by `createdAt DESC`.

**Returns:** Array of all feedback where `mentorId === current_user.id`

**Error Response (403 Forbidden - Wrong Role):**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied. Required roles: MENTOR, EMPLOYER"
  }
}
```

---

## Get Feedback for Application

**`GET /application/:applicationId`**

Retrieve feedback for specific application. Privacy rules apply.

**Authentication:** Required

**Path Parameters:**

| Parameter       | Type | Required | Description    |
| --------------- | ---- | -------- | -------------- |
| `applicationId` | UUID | Yes      | Application ID |

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "fb123e45-67a8-9012-b345-6789abcdef01",
    "rating": 5,
    "feedbackText": "Exceptional work...",
    "strengths": ["Innovation", "Technical depth"],
    "improvements": ["Documentation", "Testing coverage"],
    "isPublic": true,
    "createdAt": "2026-01-20T14:30:00.000Z",
    "application": {
      "id": "app12345-6789-0123-4567-89abcdef0123",
      "studentId": "student1-2345-6789-0123-456789abcdef",
      "projectId": "proj1234-5678-9012-3456-7890abcdef01",
      "status": "ACCEPTED"
    },
    "mentor": {
      "id": "mentor12-3456-7890-1234-567890abcdef",
      "fullName": "Dr. Michael Chen"
    }
  }
}
```

**Access Control:**

- Student (applicant) → Can view
- Project owner → Can view
- Public feedback → Anyone can view
- Private feedback → Only student or project owner

**Response if No Feedback (200 OK):**

```json
{
  "success": true,
  "data": null
}
```

**Error Response (404 Not Found - Application):**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Application not found"
  }
}
```

**Error Response (403 Forbidden - No Access):**

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

## Create Feedback

**`POST /`**

Create feedback for an application. Only project owner can create feedback.

**Authentication:** Required (Mentor/Employer only)

**Authorization:** `MENTOR` or `EMPLOYER` role

**Request Body:**

```json
{
  "applicationId": "app12345-6789-0123-4567-89abcdef0123",
  "rating": 4,
  "feedbackText": "Solid technical execution with room for improvement in communication and time management. The code quality was impressive, but project delivery was delayed by one week.",
  "strengths": [
    "Excellent problem-solving abilities",
    "Clean, maintainable code",
    "Strong understanding of design patterns"
  ],
  "improvements": [
    "Improve time estimation accuracy",
    "Communicate blockers earlier",
    "Add more comprehensive unit tests"
  ],
  "isPublic": true
}
```

**Field Validation:**

| Field           | Type     | Min | Max  | Required | Notes                                  |
| --------------- | -------- | --- | ---- | -------- | -------------------------------------- |
| `applicationId` | UUID     | —   | —    | Yes      | Must exist in database                 |
| `rating`        | integer  | 1   | 5    | Yes      | Whole number only                      |
| `feedbackText`  | string   | 20  | 2000 | Yes      | Trimmed automatically                  |
| `strengths`     | string[] | 1   | 10   | Yes      | Each item 1+ chars, trimmed            |
| `improvements`  | string[] | 1   | 10   | Yes      | Each item 1+ chars, trimmed            |
| `isPublic`      | boolean  | —   | —    | No       | Default: `false` (changed from `true`) |

**Business Rules Enforced:**

1. **Application must exist**
2. **Application status must be `ACCEPTED` or `REJECTED`** (not `PENDING` or `UNDER_REVIEW`)
3. **User must be project owner** (application.project.createdById === current_user.id)
4. **No duplicate feedback** (application cannot already have feedback)

**Success Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "fb123e45-67a8-9012-b345-6789abcdef01",
    "applicationId": "app12345-6789-0123-4567-89abcdef0123",
    "mentorId": "mentor12-3456-7890-1234-567890abcdef",
    "rating": 4,
    "feedbackText": "Solid technical execution...",
    "strengths": [
      "Excellent problem-solving abilities",
      "Clean, maintainable code",
      "Strong understanding of design patterns"
    ],
    "improvements": [
      "Improve time estimation accuracy",
      "Communicate blockers earlier",
      "Add more comprehensive unit tests"
    ],
    "isPublic": true,
    "createdAt": "2026-01-24T16:45:00.000Z",
    "updatedAt": "2026-01-24T16:45:00.000Z",
    "application": {
      "id": "app12345-6789-0123-4567-89abcdef0123",
      "studentId": "student1-2345-6789-0123-456789abcdef",
      "projectId": "proj1234-5678-9012-3456-7890abcdef01",
      "status": "ACCEPTED",
      "project": {
        "id": "proj1234-5678-9012-3456-7890abcdef01",
        "title": "E-commerce Platform Redesign",
        "createdById": "mentor12-3456-7890-1234-567890abcdef"
      },
      "student": {
        "id": "student1-2345-6789-0123-456789abcdef",
        "fullName": "Sarah Johnson",
        "email": "sarah.j@example.com"
      }
    },
    "mentor": {
      "id": "mentor12-3456-7890-1234-567890abcdef",
      "fullName": "Dr. Michael Chen",
      "role": "MENTOR"
    }
  }
}
```

**Error Response (404 Not Found - Application):**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Application not found"
  }
}
```

**Error Response (403 Forbidden - Not Project Owner):**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Only the project owner can provide feedback"
  }
}
```

**Error Response (409 Conflict - Duplicate Feedback):**

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Feedback already exists for this application"
  }
}
```

**Error Response (400 Validation - Application Not Reviewed):**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Feedback can only be provided for accepted or rejected applications"
  }
}
```

**Error Response (400 Validation - Invalid Fields):**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "rating",
        "message": "Rating must be at least 1"
      },
      {
        "field": "feedbackText",
        "message": "Feedback must be at least 20 characters"
      },
      {
        "field": "strengths",
        "message": "At least one strength is required"
      }
    ]
  }
}
```

---

## Update Feedback

**`PATCH /:id`**

Update existing feedback. Only author (mentor who created it) can update.

**Authentication:** Required (Mentor/Employer only)

**Authorization:** `MENTOR` or `EMPLOYER` role + Must be feedback author

**Path Parameters:**

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `id`      | UUID | Yes      | Feedback ID |

**Request Body (all fields optional):**

```json
{
  "rating": 5,
  "feedbackText": "Updated: Exceptional performance after initial feedback...",
  "strengths": [
    "Excellent problem-solving",
    "Clean code",
    "Quick learner",
    "Adapted well to feedback"
  ],
  "improvements": [
    "Continue improving time estimation",
    "Maintain testing discipline"
  ],
  "isPublic": true
}
```

**Field Validation (if provided):**

Same rules as creation, but all fields optional.

**Behavior:**

- Only provided fields are updated
- Omitted fields remain unchanged
- Empty arrays allowed for `strengths`/`improvements` (min 1 still enforced if provided)

**Success Response (200 OK):**

Returns complete updated feedback (same shape as creation response).

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Feedback not found"
  }
}
```

**Error Response (403 Forbidden - Not Author):**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You can only update your own feedback"
  }
}
```

**Error Response (400 Validation):**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "rating",
        "message": "Rating must not exceed 5"
      }
    ]
  }
}
```

---

## Delete Feedback

**`DELETE /:id`**

Delete feedback. Only author can delete.

**Authentication:** Required (Mentor/Employer only)

**Authorization:** `MENTOR` or `EMPLOYER` role + Must be feedback author

**Path Parameters:**

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `id`      | UUID | Yes      | Feedback ID |

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Feedback deleted successfully"
  }
}
```

**Side Effects:**

- Feedback record permanently deleted from database
- No cascade deletes (application remains)

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Feedback not found"
  }
}
```

**Error Response (403 Forbidden - Not Author):**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You can only delete your own feedback"
  }
}
```

---

## Common Questions

**Q: Can a student give feedback?**  
**A:** No. Only `MENTOR` and `EMPLOYER` roles can create feedback.

**Q: Can I create feedback for a pending application?**  
**A:** No. Application status must be `ACCEPTED` or `REJECTED`.

**Q: What if I want to give feedback on a rejected application?**  
**A:** Fully supported. Rejection feedback helps students improve for future applications.

**Q: Can I edit feedback after publishing it publicly?**  
**A:** Yes. You can change `isPublic` from `true` to `false` or vice versa.

**Q: Can I create multiple feedback for the same application?**  
**A:** No. One feedback per application (enforced by database unique constraint).

**Q: What happens if I delete an application that has feedback?**  
**A:** Feedback is cascade deleted (database constraint: `ON DELETE CASCADE`).

**Q: Can a student see private feedback given to other students?**  
**A:** No. Students can only see:

- Public feedback (anyone)
- Private feedback where they are the recipient

**Q: Can I give myself feedback?**  
**A:** No. You cannot create feedback for applications to your own projects where you are also the applicant (enforced by business logic).

**Q: Is there a minimum number of strengths or improvements?**  
**A:** Yes. At least 1 item required in each array. Maximum 10 items per array.

**Q: Can I leave `improvements` empty if the student was perfect?**  
**A:** No. Minimum 1 improvement required (even if constructive/forward-looking like "Continue learning X").

**Q: What is the default value for `isPublic`?**  
**A:** `false` (private by default). Note: The schema default is `true`, but the validator default is `false`.

**Q: Can I change the rating after creation?**  
**A:** Yes, via `PATCH /:id` endpoint.

**Q: Can admins create feedback for any application?**  
**A:** Not explicitly supported via current authorization logic. Admins can access all feedback but creation still requires project ownership.

---

## Error Codes Reference

| Code               | HTTP Status | Description                             |
| ------------------ | ----------- | --------------------------------------- |
| `VALIDATION_ERROR` | 400         | Request validation failed               |
| `UNAUTHORIZED`     | 401         | Missing or invalid authentication       |
| `FORBIDDEN`        | 403         | Insufficient permissions                |
| `NOT_FOUND`        | 404         | Feedback or application not found       |
| `CONFLICT`         | 409         | Feedback already exists for application |
| `INTERNAL_ERROR`   | 500         | Server error (contact support)          |

All error responses include `errorId` and `correlationId` for support.
