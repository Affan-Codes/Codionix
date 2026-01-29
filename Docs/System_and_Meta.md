# System & Meta API

**Base URL:** `https://api.codionix.com/api/v1`

This document covers system-level endpoints, global conventions, error handling, and API metadata.

---

## Health Checks

### Liveness Check

**`GET /health`**

Lightweight health check for load balancers. Called every 2-5 seconds.

**Authentication:** None  
**Rate Limit:** None (must be accessible for load balancers)

**Purpose:**

- Detect if process is alive
- Used by Kubernetes liveness probes, AWS ALB health checks
- NEVER checks dependencies (too slow)
- MUST respond in <50ms

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "alive": true,
    "uptime": 3456789
  }
}
```

**Response Fields:**

| Field    | Type    | Description                         |
| -------- | ------- | ----------------------------------- |
| `alive`  | boolean | Always `true` if process responding |
| `uptime` | number  | Process uptime in seconds           |

**Usage:**
Load balancers use this to detect crashed/frozen processes and remove dead instances from pool.

---

### Readiness Check

**`GET /health/ready`**

Comprehensive dependency health check. Called every 10-30 seconds.

**Authentication:** None  
**Rate Limit:** None

**Purpose:**

- Check if instance can serve traffic
- Validates all dependencies (database, email, socket.io)
- Used by Kubernetes readiness probe, deployment systems
- Can take up to 5 seconds

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-01-29T10:30:00.000Z",
    "uptime": 3456789,
    "environment": "production",
    "version": "1.0.0",
    "dependencies": [
      {
        "name": "database",
        "status": "healthy",
        "responseTime": 45,
        "message": "Database operational",
        "details": {
          "poolTotal": 18,
          "poolIdle": 12,
          "poolWaiting": 0,
          "poolMax": 20,
          "utilization": "90%",
          "activeQueries": 3,
          "totalQueries": 125847,
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
      },
      {
        "name": "socket_server",
        "status": "healthy",
        "responseTime": 12,
        "message": "Socket.io server operational",
        "details": {
          "activeConnections": 45,
          "activeRooms": 23
        }
      }
    ]
  }
}
```

**Degraded Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "status": "degraded",
    "timestamp": "2026-01-29T10:30:00.000Z",
    "uptime": 3456789,
    "environment": "production",
    "version": "1.0.0",
    "dependencies": [
      {
        "name": "database",
        "status": "healthy",
        "responseTime": 45,
        "message": "Database operational"
      },
      {
        "name": "email",
        "status": "degraded",
        "responseTime": 0,
        "message": "Email service not configured",
        "details": {
          "configured": false
        }
      },
      {
        "name": "socket_server",
        "status": "degraded",
        "responseTime": 12,
        "message": "High connection count (1245)",
        "details": {
          "activeConnections": 1245,
          "activeRooms": 623
        }
      }
    ]
  }
}
```

**Unhealthy Response (503 Service Unavailable):**

```json
{
  "success": false,
  "data": {
    "status": "unhealthy",
    "timestamp": "2026-01-29T10:30:00.000Z",
    "uptime": 3456789,
    "environment": "production",
    "version": "1.0.0",
    "dependencies": [
      {
        "name": "database",
        "status": "unhealthy",
        "responseTime": 5234,
        "message": "Connection pool critically exhausted (98%)",
        "details": {
          "poolTotal": 19,
          "poolIdle": 0,
          "poolWaiting": 15,
          "poolMax": 20,
          "utilization": "98%"
        }
      }
    ]
  }
}
```

**HTTP Status Codes:**

- `200`: All dependencies healthy OR at least one degraded (no unhealthy)
- `503`: At least one dependency unhealthy (load balancer stops routing traffic)

**Dependency Health Status:**

| Status      | Meaning                              | Action                        |
| ----------- | ------------------------------------ | ----------------------------- |
| `healthy`   | Dependency operational               | Route traffic                 |
| `degraded`  | Dependency slow or partially working | Route traffic with monitoring |
| `unhealthy` | Dependency failed or unavailable     | DO NOT route traffic          |

**Database Health Thresholds:**

| Metric              | Warning | Critical | Action                     |
| ------------------- | ------- | -------- | -------------------------- |
| Pool utilization    | 80%     | 95%      | Scale database connections |
| Query response time | 100ms   | 500ms    | Optimize slow queries      |
| Waiting requests    | >5      | >10      | Increase pool size         |

---

### Full Diagnostics

**`GET /health/full`**

Verbose diagnostic check with complete metrics. For manual debugging only.

**Authentication:** None  
**Rate Limit:** None

**Purpose:**

- Detailed diagnostics for ops/debugging
- Used by monitoring dashboards
- NOT used by load balancers
- ALWAYS returns 200 (even if unhealthy)

**Success Response (200 OK):**

Same structure as readiness check, but ALWAYS returns 200 status code so engineers can see diagnostics even when unhealthy.

**Usage:**
Call this manually to investigate production issues. Use `/health/ready` for automated health checks.

---

## Global API Conventions

### Base URL

**Production:** `https://api.codionix.com/api/v1`  
**Staging:** `https://staging-api.codionix.com/api/v1`  
**Development:** `http://localhost:5000/api/v1`

### Request Headers

**Required on all authenticated endpoints:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Optional tracking header:**

```
X-Correlation-ID: req_abc123xyz
```

If provided, server echoes this in response header for distributed tracing. If omitted, server generates one.

**Response Headers (all responses):**

```
X-Correlation-ID: req_abc123xyz
Content-Type: application/json
```

---

### Response Format

All responses follow this structure:

**Success:**

```json
{
  "success": true,
  "data": {
    /* response payload */
  }
}
```

**Error:**

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      /* optional error details */
    },
    "errorId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "correlationId": "req_abc123xyz"
  }
}
```

**Error Response Fields:**

| Field           | Type   | Description                                  | Always Present |
| --------------- | ------ | -------------------------------------------- | -------------- |
| `code`          | string | Machine-readable error code                  | Yes            |
| `message`       | string | Human-readable error description             | Yes            |
| `details`       | object | Additional error context (validation errors) | No             |
| `errorId`       | UUID   | Unique identifier for this error instance    | Yes            |
| `correlationId` | string | Request tracking ID for debugging            | Yes            |

**Error IDs:**

- Unique per error occurrence
- Use when contacting support
- Logged server-side with full stack trace

---

### Pagination

**Paginated endpoints accept:**

| Parameter | Type   | Default | Max | Description             |
| --------- | ------ | ------- | --- | ----------------------- |
| `page`    | number | 1       | -   | Page number (1-indexed) |
| `limit`   | number | 10      | 100 | Results per page        |

**Example Request:**

```
GET /api/v1/projects?page=2&limit=25
```

**Paginated Response Structure:**

```json
{
  "success": true,
  "data": {
    "data": [
      /* array of results */
    ],
    "pagination": {
      "total": 156,
      "page": 2,
      "limit": 25,
      "totalPages": 7,
      "hasNextPage": true,
      "hasPrevPage": true
    }
  }
}
```

**Pagination Fields:**

| Field         | Type    | Description                              |
| ------------- | ------- | ---------------------------------------- |
| `total`       | number  | Total number of results across all pages |
| `page`        | number  | Current page number                      |
| `limit`       | number  | Results per page                         |
| `totalPages`  | number  | Total pages available                    |
| `hasNextPage` | boolean | Whether next page exists                 |
| `hasPrevPage` | boolean | Whether previous page exists             |

**Edge Cases:**

- `page` > `totalPages` → Returns empty array with correct pagination metadata
- `page` < 1 → Validation error (400)
- `limit` > 100 → Clamped to 100 (no error)
- `limit` < 1 → Validation error (400)

---

### Rate Limiting

**Global API Rate Limit:**

- **Window:** 15 minutes
- **Limit:** 200 requests per IP
- **Applies to:** All `/api/v1/*` endpoints except health checks and auth endpoints

**Auth Endpoints:**

- **Window:** 15 minutes
- **Limit:** 10 requests per IP
- **Applies to:** `/register`, `/login`, `/forgot-password`, `/reset-password`, `/oauth/*/init`

**Email Verification:**

- **Window:** 15 minutes
- **Limit:** 3 requests per IP
- **Applies to:** `/verify-email`, `/resend-verification`

**File Uploads:**

- **Window:** 15 minutes
- **Limit:** 10 uploads per user
- **Applies to:** `/upload/avatar`, `/upload/resume`

**Analytics:**

- **Window:** 5 minutes
- **Limit:** 20 requests per IP
- **Applies to:** `/analytics/*`

**Messaging (HTTP):**

- **Window:** 1 minute
- **Limit:** 60 requests per user
- **Applies to:** `/messages/*`

**Socket.io Messaging:**

- **Window:** 1 minute
- **Limit:** 30 messages per user
- **Applies to:** `message:send` event

**Rate Limit Response Headers:**

```
RateLimit-Limit: 200
RateLimit-Remaining: 147
RateLimit-Reset: 1706094900
```

**Rate Limit Exceeded (429):**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 15 minutes."
  }
}
```

**Bypass:**

- Health check endpoints (`/health*`) have NO rate limiting
- Prometheus metrics endpoint (`/metrics/prometheus`) has NO rate limiting

---

### Filtering & Sorting

**Common Query Parameters:**

| Parameter | Type   | Description                      | Example             |
| --------- | ------ | -------------------------------- | ------------------- |
| `search`  | string | Text search (case-insensitive)   | `search=javascript` |
| `status`  | enum   | Filter by status                 | `status=PUBLISHED`  |
| `sortBy`  | string | Field to sort by                 | `sortBy=createdAt`  |
| `order`   | enum   | Sort direction (`asc` or `desc`) | `order=desc`        |

**Example:**

```
GET /api/v1/projects?status=PUBLISHED&search=react&sortBy=deadline&order=asc
```

**Validation:**

- Unknown query parameters are ignored (no error)
- Invalid enum values return 400 validation error
- Sorting by non-existent fields returns 400 validation error

---

## Enums & Constants

### User Roles

```
STUDENT
MENTOR
EMPLOYER
ADMIN
```

**Assignment Rules:**

- Set during registration
- ADMIN can only be assigned manually in database
- OAuth registration allows: STUDENT, MENTOR, EMPLOYER only
- Role cannot be changed via API

### Project Types

```
PROJECT
INTERNSHIP
```

### Project Status

```
DRAFT      - Not visible to public
PUBLISHED  - Visible and accepting applications
CLOSED     - No longer accepting applications
```

**Automatic Transitions:**

- PUBLISHED → CLOSED when deadline passes (cron job runs every 6 hours)

### Difficulty Levels

```
BEGINNER
INTERMEDIATE
ADVANCED
```

### Application Status

```
PENDING       - Submitted, awaiting review
UNDER_REVIEW  - Being actively reviewed
ACCEPTED      - Application accepted
REJECTED      - Application rejected
```

**Valid Transitions:**

| From         | To                               |
| ------------ | -------------------------------- |
| PENDING      | UNDER_REVIEW, ACCEPTED, REJECTED |
| UNDER_REVIEW | ACCEPTED, REJECTED               |
| ACCEPTED     | None (terminal state)            |
| REJECTED     | None (terminal state)            |

---

## HTTP Status Codes

| Code | Name                  | When Used                                       |
| ---- | --------------------- | ----------------------------------------------- |
| 200  | OK                    | Successful GET, PATCH, DELETE                   |
| 201  | Created               | Successful POST (resource created)              |
| 204  | No Content            | Successful DELETE (no response body)            |
| 400  | Bad Request           | Validation error, malformed request             |
| 401  | Unauthorized          | Missing or invalid authentication               |
| 403  | Forbidden             | Authenticated but lacks permission              |
| 404  | Not Found             | Resource not found                              |
| 409  | Conflict              | Resource already exists (duplicate)             |
| 429  | Too Many Requests     | Rate limit exceeded                             |
| 500  | Internal Server Error | Unexpected server error                         |
| 503  | Service Unavailable   | Dependencies unhealthy (readiness check failed) |

---

## Error Codes

### Authentication Errors

| Code           | HTTP Status | Description                       |
| -------------- | ----------- | --------------------------------- |
| `UNAUTHORIZED` | 401         | Missing or invalid authentication |
| `FORBIDDEN`    | 403         | Insufficient permissions          |

### Validation Errors

| Code               | HTTP Status | Description               |
| ------------------ | ----------- | ------------------------- |
| `VALIDATION_ERROR` | 400         | Request validation failed |

### Resource Errors

| Code        | HTTP Status | Description             |
| ----------- | ----------- | ----------------------- |
| `NOT_FOUND` | 404         | Resource not found      |
| `CONFLICT`  | 409         | Resource already exists |

### System Errors

| Code                  | HTTP Status | Description                 |
| --------------------- | ----------- | --------------------------- |
| `RATE_LIMIT_EXCEEDED` | 429         | Too many requests           |
| `INTERNAL_ERROR`      | 500         | Unexpected server error     |
| `SERVICE_UNAVAILABLE` | 503         | System shutting down        |
| `DATABASE_ERROR`      | 500         | Database operation failed   |
| `DATABASE_TIMEOUT`    | 503         | Database connection timeout |

### Validation Error Details

When `code` is `VALIDATION_ERROR`, the `details` field contains an array of specific validation errors:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      },
      {
        "field": "password",
        "message": "Password must contain at least one uppercase letter"
      }
    ]
  }
}
```

---

## Timestamps

All timestamps use **ISO 8601 format** in UTC:

```
2026-01-29T10:30:00.000Z
```

**Common Timestamp Fields:**

| Field             | Description                      | Auto-generated |
| ----------------- | -------------------------------- | -------------- |
| `createdAt`       | Resource creation timestamp      | Yes            |
| `updatedAt`       | Last modification timestamp      | Yes            |
| `appliedAt`       | Application submission timestamp | Yes            |
| `reviewedAt`      | Application review timestamp     | Yes            |
| `readAt`          | Message read timestamp           | Yes            |
| `emailVerifiedAt` | Email verification timestamp     | Yes            |
| `deadline`        | Project application deadline     | No (user-set)  |

---

## Field Types & Formats

### UUIDs

All resource IDs use UUID v4:

```
550e8400-e29b-41d4-a716-446655440000
```

**Format:** 8-4-4-4-12 hexadecimal digits  
**Validation:** Must match UUID v4 format  
**Usage:** User IDs, project IDs, application IDs, etc.

### Phone Numbers

**Format:** E.164 international format

```
+1-555-123-4567
```

**Regex:** `^\+?[1-9]\d{1,14}$`

### URLs

**Required:** Full URL with protocol

```
https://linkedin.com/in/johndoe
```

**Validation:** Must be valid URL (RFC 3986)  
**NOT accepted:** `linkedin.com/in/johndoe` (missing protocol)

### Arrays

**Skill Arrays:**

- Min: 0 items (empty array allowed)
- Max: 20 items
- Each item: 1-50 characters after trimming
- Empty strings rejected
- Duplicates allowed (no deduplication)

---

## CORS

**Allowed Origins:**

- Production: `https://codionix.com`
- Staging: `https://staging.codionix.com`
- Development: `http://localhost:5173`

**Allowed Methods:**

```
GET, POST, PATCH, DELETE, OPTIONS
```

**Allowed Headers:**

```
Authorization, Content-Type, X-Correlation-ID
```

**Exposed Headers:**

```
X-Correlation-ID, RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset
```

**Credentials:** Allowed (`Access-Control-Allow-Credentials: true`)

---

## Webhooks

**Not implemented.** All events are real-time via Socket.io or polled via HTTP endpoints.

---

## API Versioning

**Current Version:** `v1`

**Version Strategy:**

- Version in URL path: `/api/v1/*`
- Breaking changes require new version (`v2`)
- Non-breaking changes deployed to existing version
- Old versions deprecated with 6-month notice

**Deprecation Process:**

1. Announce deprecation (6 months notice)
2. Add `Deprecated: true` response header
3. Return deprecation warning in response body
4. Remove version after deprecation period

---

## Security Headers

**All responses include:**

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

**NOT included:**

- `Set-Cookie` (tokens delivered in response body, not cookies)

---

## Request ID Tracking

**Request Correlation:**

Every request receives a unique `correlationId`:

```
X-Correlation-ID: req_1706094600_abc123
```

**Client Behavior:**

- If client sends `X-Correlation-ID` header → Server echoes it
- If client omits header → Server generates one

**Server Behavior:**

- All logs include `correlationId`
- All errors include `correlationId`
- Use for distributed tracing across services

**Error ID:**

Every error receives a unique `errorId`:

```json
{
  "error": {
    "errorId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "correlationId": "req_1706094600_abc123"
  }
}
```

**When Contacting Support:**
Provide both `errorId` (specific error instance) and `correlationId` (entire request context).

---

## Testing Endpoints

**Production API:** No test mode available  
**Staging API:** Full test environment at `https://staging-api.codionix.com/api/v1`

**Test Data:**

- Not provided
- Create test accounts via `/register`
- Use staging environment for integration testing

---

## Common Gotchas

**Pagination:**

- `page` is 1-indexed (not 0-indexed)
- `limit` max is 100 (requests for more are clamped)
- Page beyond `totalPages` returns empty array (not 404)

**Timestamps:**

- Always UTC (no timezone conversion)
- ISO 8601 format only
- JavaScript `Date.toISOString()` works correctly

**UUIDs:**

- Must be lowercase (uppercase rejected)
- Must include hyphens (no compact format)

**Rate Limits:**

- Applied per IP for public endpoints
- Applied per user for authenticated endpoints
- Shared across all instances (Redis-backed)

**Authentication:**

- Access tokens expire after 15 minutes
- Refresh tokens expire after 7 days
- No token revocation for access tokens (stateless)
- Logout only revokes refresh tokens

**CORS:**

- Preflight requests (OPTIONS) required for authenticated endpoints
- `Authorization` header triggers CORS preflight

---

## Support & Contact

**API Issues:**

- Email: api-support@codionix.com
- Include: `errorId`, `correlationId`, request/response examples

**Feature Requests:**

- Email: product@codionix.com
- GitHub: https://github.com/codionix/api-feedback

**Security:**

- Email: security@codionix.com
- PGP key: https://codionix.com/.well-known/pgp-key.txt

---

## Changelog

**Version 1.0.0** (2026-01-15)

- Initial public release
- Auth, users, projects, applications, feedback, messaging
- OAuth support (Google, GitHub)
- Socket.io real-time messaging

**Version 1.1.0** (2026-01-22)

- Added analytics endpoints
- Added notification preferences
- Added metrics/monitoring endpoints
- OAuth account linking support
