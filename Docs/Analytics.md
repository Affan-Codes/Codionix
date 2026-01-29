# Analytics & Business Intelligence API

**Base URL:** `https://api.codionix.com/api/v1/analytics`

Comprehensive analytics endpoints for platform metrics, business intelligence, and performance monitoring.

**Rate Limiting:** 20 requests per 5 minutes per user (applies to all analytics endpoints)

---

## Overview

The Analytics API provides detailed insights into platform activity, user behavior, project performance, and skill demand trends. Endpoints are segregated by access level:

- **Public endpoints:** Anonymized, limited data for general consumption
- **Student endpoints:** Personal application analytics
- **Mentor/Employer endpoints:** Project performance metrics
- **Admin endpoints:** Full platform analytics and business intelligence

---

## Authentication & Authorization

| Endpoint Category         | Required Role          | Authentication |
| ------------------------- | ---------------------- | -------------- |
| Public analytics          | None                   | No             |
| Student analytics         | `STUDENT`              | Required       |
| Mentor/Employer analytics | `MENTOR` or `EMPLOYER` | Required       |
| Platform analytics        | `ADMIN`                | Required       |

**Authorization Header:**

```
Authorization: Bearer {access_token}
```

---

## Time Range Filters

Most analytics endpoints accept a `timeRange` query parameter.

**Supported Values:**

| Value | Description                 | Example Use Case    |
| ----- | --------------------------- | ------------------- |
| `7d`  | Last 7 days                 | Weekly trends       |
| `30d` | Last 30 days (default)      | Monthly overview    |
| `90d` | Last 90 days                | Quarterly analysis  |
| `all` | All time (from Jan 1, 2020) | Historical analysis |

**Query Parameter:**

```
?timeRange=30d
```

**Default:** If omitted, defaults to `30d`.

---

## Admin Platform Analytics

### Get Platform Overview

**`GET /platform/overview`**

Complete platform metrics snapshot across all dimensions.

**Authentication:** Required (ADMIN only)

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "users": {
      "total": 15847,
      "students": 12340,
      "mentors": 2890,
      "employers": 617,
      "verified": 14523,
      "activeLastWeek": 5632,
      "activeLastMonth": 9841,
      "newThisWeek": 234,
      "newThisMonth": 1056,
      "growthRate": 8.5
    },
    "projects": {
      "total": 3421,
      "published": 2156,
      "draft": 890,
      "closed": 375,
      "avgApplicationsPerProject": 12.4,
      "newThisWeek": 87,
      "newThisMonth": 342
    },
    "applications": {
      "total": 42456,
      "pending": 3421,
      "underReview": 1890,
      "accepted": 8934,
      "rejected": 28211,
      "acceptanceRate": 21.05,
      "avgResponseTime": 36.5,
      "newThisWeek": 1234,
      "newThisMonth": 5678
    },
    "feedback": {
      "total": 8934,
      "avgRating": 4.2,
      "publicFeedback": 7845,
      "newThisWeek": 234,
      "newThisMonth": 987
    },
    "engagement": {
      "avgApplicationsPerStudent": 3.4,
      "avgProjectsPerMentor": 1.2,
      "activeProjects": 2156,
      "completionRate": 78.5
    }
  }
}
```

**Field Definitions:**

| Field                                | Type   | Description                                       |
| ------------------------------------ | ------ | ------------------------------------------------- |
| `users.total`                        | number | All registered users                              |
| `users.growthRate`                   | number | Month-over-month growth percentage                |
| `users.activeLastWeek`               | number | Users with activity in last 7 days                |
| `projects.avgApplicationsPerProject` | number | Mean applications per project                     |
| `applications.avgResponseTime`       | number | Average hours from submission to review           |
| `applications.acceptanceRate`        | number | Percentage of accepted applications               |
| `feedback.avgRating`                 | number | Mean rating across all feedback (1-5 scale)       |
| `engagement.completionRate`          | number | Percentage of applications that received feedback |
| `engagement.activeProjects`          | number | Published projects with future deadlines          |

**Error Responses:**

**401 Unauthorized:**

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden:**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied. Required roles: ADMIN"
  }
}
```

---

### Get User Growth Analytics

**`GET /platform/user-growth?timeRange=30d`**

Time-series data of user registration and growth.

**Authentication:** Required (ADMIN only)

**Query Parameters:**

| Parameter   | Type | Required | Default | Description                  |
| ----------- | ---- | -------- | ------- | ---------------------------- |
| `timeRange` | enum | No       | `30d`   | `7d`, `30d`, `90d`, or `all` |

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "timeRange": "30d",
    "dataPoints": [
      {
        "date": "2026-01-01",
        "total": 15000,
        "students": 11800,
        "mentors": 2600,
        "employers": 600,
        "newUsers": 34
      },
      {
        "date": "2026-01-02",
        "total": 15034,
        "students": 11825,
        "mentors": 2605,
        "employers": 604,
        "newUsers": 42
      }
    ],
    "summary": {
      "totalGrowth": 1056,
      "avgDailySignups": 35.2,
      "peakSignupDay": "2026-01-15",
      "peakSignupCount": 87
    }
  }
}
```

**Data Point Fields:**

| Field       | Type     | Description                            |
| ----------- | -------- | -------------------------------------- |
| `date`      | ISO date | Day in `YYYY-MM-DD` format             |
| `total`     | number   | Cumulative total users as of this date |
| `students`  | number   | Cumulative student count               |
| `mentors`   | number   | Cumulative mentor count                |
| `employers` | number   | Cumulative employer count              |
| `newUsers`  | number   | New registrations on this date         |

**Summary Fields:**

| Field             | Type     | Description                   |
| ----------------- | -------- | ----------------------------- |
| `totalGrowth`     | number   | Total new users in time range |
| `avgDailySignups` | number   | Mean new users per day        |
| `peakSignupDay`   | ISO date | Date with highest signups     |
| `peakSignupCount` | number   | Signups on peak day           |

---

### Get Platform Engagement Metrics

**`GET /platform/engagement?timeRange=30d`**

User activity and engagement statistics.

**Authentication:** Required (ADMIN only)

**Query Parameters:**

| Parameter   | Type | Required | Default |
| ----------- | ---- | -------- | ------- |
| `timeRange` | enum | No       | `30d`   |

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "timeRange": "30d",
    "userActivity": {
      "dailyActiveUsers": 3421,
      "weeklyActiveUsers": 9841,
      "monthlyActiveUsers": 15234,
      "dau_mau_ratio": 22.45
    },
    "actions": {
      "newUsers": 1056,
      "newProjects": 342,
      "newApplications": 5678,
      "feedbackGiven": 987,
      "projectsPublished": 298
    },
    "retention": {
      "weeklyRetention": 68.5,
      "monthlyRetention": 42.3
    },
    "engagement_by_role": [
      {
        "role": "STUDENT",
        "activeUsers": 8234,
        "avgActionsPerUser": 2.8,
        "engagementRate": 66.7
      },
      {
        "role": "MENTOR",
        "activeUsers": 1823,
        "avgActionsPerUser": 1.5,
        "engagementRate": 63.1
      },
      {
        "role": "EMPLOYER",
        "activeUsers": 412,
        "avgActionsPerUser": 1.2,
        "engagementRate": 66.8
      }
    ]
  }
}
```

**Metrics Definitions:**

| Metric              | Type   | Description                                   |
| ------------------- | ------ | --------------------------------------------- |
| `dau_mau_ratio`     | number | DAU/MAU ratio (stickiness metric, percentage) |
| `weeklyRetention`   | number | % of users returning in week 2 after signup   |
| `monthlyRetention`  | number | % of users returning in month 2 after signup  |
| `avgActionsPerUser` | number | Mean actions per user (varies by role)        |
| `engagementRate`    | number | % of role users active in time range          |

**Actions Counted Per Role:**

- **STUDENT:** Applications submitted
- **MENTOR/EMPLOYER:** Projects created
- **ALL ROLES:** Login, profile updates, messages sent

---

### Get Application Funnel Metrics

**`GET /platform/application-funnel?timeRange=30d`**

Conversion funnel analysis for application lifecycle.

**Authentication:** Required (ADMIN only)

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "timeRange": "30d",
    "funnel": {
      "totalApplications": 5678,
      "pending": 1234,
      "underReview": 890,
      "accepted": 1456,
      "rejected": 2098
    },
    "conversionRates": {
      "pendingToReview": 78.3,
      "reviewToAccepted": 40.9,
      "reviewToRejected": 59.1,
      "overallAcceptance": 25.6
    },
    "timeline": {
      "avgTimeToFirstReview": 18.5,
      "avgTimeToDecision": 36.2,
      "fastestDecision": 2.3,
      "slowestDecision": 168.7
    },
    "byProjectType": [
      {
        "type": "PROJECT",
        "applications": 3421,
        "acceptanceRate": 28.4
      },
      {
        "type": "INTERNSHIP",
        "applications": 2257,
        "acceptanceRate": 21.8
      }
    ],
    "byDifficulty": [
      {
        "level": "BEGINNER",
        "applications": 2134,
        "acceptanceRate": 32.1
      },
      {
        "level": "INTERMEDIATE",
        "applications": 2890,
        "acceptanceRate": 24.5
      },
      {
        "level": "ADVANCED",
        "applications": 654,
        "acceptanceRate": 18.9
      }
    ]
  }
}
```

**Timeline Units:** All times in **hours**.

**Conversion Rate Calculations:**

| Metric              | Formula                                     |
| ------------------- | ------------------------------------------- |
| `pendingToReview`   | (underReview + accepted + rejected) / total |
| `reviewToAccepted`  | accepted / (accepted + rejected)            |
| `overallAcceptance` | accepted / total                            |

---

### Get Skill Demand Analytics

**`GET /platform/skill-demand?timeRange=30d`**

Skills analysis: demand trends, combinations, and market insights.

**Authentication:** Required (ADMIN only)

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "timeRange": "30d",
    "topSkills": [
      {
        "skill": "JavaScript",
        "projectCount": 1234,
        "applicationCount": 8934,
        "avgAcceptanceRate": 24.5,
        "trend": "rising"
      },
      {
        "skill": "React",
        "projectCount": 987,
        "applicationCount": 6745,
        "avgAcceptanceRate": 26.8,
        "trend": "stable"
      },
      {
        "skill": "Python",
        "projectCount": 856,
        "applicationCount": 5623,
        "avgAcceptanceRate": 22.1,
        "trend": "rising"
      }
    ],
    "emergingSkills": [
      {
        "skill": "Rust",
        "recentProjectCount": 45,
        "growthRate": 156.8
      },
      {
        "skill": "Svelte",
        "recentProjectCount": 32,
        "growthRate": 89.3
      }
    ],
    "byRole": {
      "students": [
        {
          "skill": "JavaScript",
          "userCount": 9834
        }
      ],
      "mentors": [
        {
          "skill": "JavaScript",
          "projectCount": 1234
        }
      ]
    },
    "skillCombinations": [
      {
        "skills": ["JavaScript", "React", "Node.js"],
        "projectCount": 234,
        "avgStipend": 1500.5
      },
      {
        "skills": ["Python", "Django", "PostgreSQL"],
        "projectCount": 178,
        "avgStipend": 1800.75
      }
    ]
  }
}
```

**Trend Values:**

| Trend     | Definition                      |
| --------- | ------------------------------- |
| `rising`  | >20% growth vs. previous period |
| `stable`  | -20% to +20% change             |
| `falling` | <-20% change                    |

**Emerging Skill Criteria:**

- Minimum 2 projects in current period
- Growth rate >50% vs. previous period

**Skill Combinations:**

- Minimum 2 projects with exact combination
- Ordered alphabetically for consistency
- `avgStipend` is `null` if no stipends offered

---

### Get Feedback Quality Metrics

**`GET /platform/feedback-quality`**

Feedback rating distribution and mentor performance.

**Authentication:** Required (ADMIN only)

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalFeedback": 8934,
      "avgRating": 4.2,
      "publicFeedbackRate": 87.8
    },
    "ratingDistribution": [
      {
        "rating": 1,
        "count": 234,
        "percentage": 2.6
      },
      {
        "rating": 2,
        "count": 456,
        "percentage": 5.1
      },
      {
        "rating": 3,
        "count": 1234,
        "percentage": 13.8
      },
      {
        "rating": 4,
        "count": 3456,
        "percentage": 38.7
      },
      {
        "rating": 5,
        "count": 3554,
        "percentage": 39.8
      }
    ],
    "topMentors": [
      {
        "mentorId": "550e8400-e29b-41d4-a716-446655440000",
        "mentorName": "Jane Smith",
        "feedbackGiven": 234,
        "avgRating": 4.8
      }
    ],
    "commonStrengths": [
      {
        "strength": "Clear communication",
        "count": 2345
      },
      {
        "strength": "Technical depth",
        "count": 1890
      }
    ],
    "commonImprovements": [
      {
        "improvement": "More detailed code examples",
        "count": 1234
      }
    ],
    "feedbackTrends": [
      {
        "month": "2026-01",
        "totalFeedback": 987,
        "avgRating": 4.2
      }
    ]
  }
}
```

**Rating Scale:** 1-5 (1 = Poor, 5 = Excellent)

**Top Mentors Criteria:**

- Minimum 10 feedback items given
- Ordered by feedback count (descending)
- Limited to top 10

---

### Get Response Time Benchmarks

**`GET /platform/response-time-benchmarks`**

Application review speed benchmarks and mentor performance.

**Authentication:** Required (ADMIN only)

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "overall": {
      "avgResponseTime": 36.5,
      "medianResponseTime": 24.3,
      "p95ResponseTime": 96.8
    },
    "byRole": [
      {
        "role": "MENTOR",
        "avgResponseTime": 32.1,
        "count": 5678
      },
      {
        "role": "EMPLOYER",
        "avgResponseTime": 42.8,
        "count": 2890
      }
    ],
    "byProjectType": [
      {
        "type": "PROJECT",
        "avgResponseTime": 38.2,
        "count": 4567
      },
      {
        "type": "INTERNSHIP",
        "avgResponseTime": 34.1,
        "count": 4001
      }
    ],
    "fastestResponders": [
      {
        "mentorId": "550e8400-e29b-41d4-a716-446655440000",
        "mentorName": "John Doe",
        "avgResponseTime": 12.5,
        "applicationCount": 87
      }
    ]
  }
}
```

**All Times:** Measured in **hours**.

**Percentiles Explained:**

| Metric               | Description                                   |
| -------------------- | --------------------------------------------- |
| `p95ResponseTime`    | 95% of applications reviewed faster than this |
| `medianResponseTime` | 50th percentile (half faster, half slower)    |

**Fastest Responders Criteria:**

- Minimum 3 reviewed applications
- Ordered by avg response time (ascending)
- Top 10 results

---

## Mentor/Employer Analytics

### Get Mentor Project Analytics

**`GET /mentor/projects`**

Performance metrics for mentor/employer's own projects.

**Authentication:** Required (MENTOR or EMPLOYER only)

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalProjects": 12,
      "activeProjects": 7,
      "totalApplicationsReceived": 234,
      "avgApplicationsPerProject": 19.5,
      "avgAcceptanceRate": 28.4,
      "avgResponseTime": 24.5
    },
    "projects": [
      {
        "projectId": "550e8400-e29b-41d4-a716-446655440000",
        "projectTitle": "Full-Stack E-commerce Platform",
        "stats": {
          "totalApplications": 45,
          "pendingApplications": 8,
          "acceptedApplications": 12,
          "rejectedApplications": 25,
          "acceptanceRate": 26.7,
          "avgResponseTime": 18.3,
          "avgApplicantRating": 4.1,
          "daysUntilDeadline": 15,
          "isActive": true
        },
        "applicantQuality": {
          "avgSkillsMatch": 78.5,
          "topApplicantSkills": [
            {
              "skill": "React",
              "count": 38
            },
            {
              "skill": "Node.js",
              "count": 35
            }
          ]
        },
        "timeline": {
          "publishedAt": "2026-01-10T10:00:00.000Z",
          "firstApplicationAt": "2026-01-10T14:30:00.000Z",
          "lastApplicationAt": "2026-01-28T09:15:00.000Z",
          "deadline": "2026-02-15T23:59:59.000Z"
        }
      }
    ],
    "topSkillsRequested": [
      {
        "skill": "JavaScript",
        "projectCount": 10
      }
    ],
    "hiringFunnel": {
      "applied": 234,
      "pending": 34,
      "underReview": 28,
      "accepted": 67,
      "rejected": 105,
      "conversionRate": 28.6
    }
  }
}
```

**Field Definitions:**

| Field                | Type   | Description                                   |
| -------------------- | ------ | --------------------------------------------- |
| `avgSkillsMatch`     | number | % of required skills applicants possess (avg) |
| `avgApplicantRating` | number | Average rating given to accepted applicants   |
| `daysUntilDeadline`  | number | Days remaining (negative if past deadline)    |
| `conversionRate`     | number | % of applications accepted                    |

**Authorization:**

- User must be project owner (MENTOR or EMPLOYER role)
- Only returns current user's projects
- ADMIN role can view all projects (not implemented)

---

## Student Analytics

### Get Student Application Analytics

**`GET /student/applications`**

Performance insights for student's own applications.

**Authentication:** Required (STUDENT only)

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalApplications": 23,
      "pending": 5,
      "underReview": 3,
      "accepted": 6,
      "rejected": 9,
      "successRate": 26.1,
      "avgResponseTime": 42.3
    },
    "recentApplications": [
      {
        "projectId": "550e8400-e29b-41d4-a716-446655440000",
        "projectTitle": "Mobile App Development",
        "status": "ACCEPTED",
        "appliedAt": "2026-01-20T10:30:00.000Z",
        "responseTime": 36.5,
        "hashedback": true
      }
    ],
    "feedbackSummary": {
      "totalFeedbackReceived": 6,
      "avgRating": 4.1,
      "commonStrengths": [
        {
          "strength": "Strong technical skills",
          "count": 4
        }
      ],
      "commonImprovements": [
        {
          "improvement": "Add more portfolio examples",
          "count": 3
        }
      ]
    },
    "skillsAnalysis": {
      "yourSkills": ["JavaScript", "React", "Node.js", "Python"],
      "mostRequestedSkills": [
        {
          "skill": "JavaScript",
          "projectCount": 1234
        }
      ],
      "skillGaps": ["TypeScript", "Docker", "AWS"],
      "competitiveSkills": ["JavaScript", "React", "Node.js"]
    },
    "performance": {
      "applicationTrend": [
        {
          "month": "2026-01",
          "applied": 8,
          "accepted": 2,
          "rejected": 4
        }
      ],
      "bestPerformingSkills": [
        {
          "skill": "React",
          "acceptanceRate": 35.7
        }
      ]
    }
  }
}
```

**Field Definitions:**

| Field                  | Type    | Description                                      |
| ---------------------- | ------- | ------------------------------------------------ |
| `successRate`          | number  | % of applications accepted                       |
| `hashedback`           | boolean | Whether feedback was provided (typo in codebase) |
| `skillGaps`            | array   | In-demand skills student lacks                   |
| `competitiveSkills`    | array   | Student skills matching many projects            |
| `bestPerformingSkills` | array   | Student skills with highest acceptance rates     |

**Recent Applications:**

- Limited to 10 most recent
- Ordered by `appliedAt` descending
- `responseTime` in hours (null if not reviewed)

**Best Performing Skills Criteria:**

- Minimum 2 applications with skill
- Ordered by acceptance rate descending
- Top 5 results

---

## Public Analytics

### Get Public Skill Demand

**`GET /public/skill-demand?timeRange=30d`**

Limited skill demand data (anonymized, no mentor names).

**Authentication:** Not required (public)

**Query Parameters:**

| Parameter   | Type | Required | Default |
| ----------- | ---- | -------- | ------- |
| `timeRange` | enum | No       | `30d`   |

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "timeRange": "30d",
    "topSkills": [
      {
        "skill": "JavaScript",
        "projectCount": 1234,
        "applicationCount": 8934,
        "avgAcceptanceRate": 24.5,
        "trend": "rising"
      }
    ],
    "emergingSkills": [
      {
        "skill": "Rust",
        "recentProjectCount": 45,
        "growthRate": 156.8
      }
    ]
  }
}
```

**Public Limitations:**

- Top 10 skills only (not full list)
- Emerging skills limited to 5
- No skill combinations data
- No mentor/student breakdown

---

### Get Public Response Time Benchmarks

**`GET /public/response-time-benchmarks`**

Anonymized response time data (no mentor names).

**Authentication:** Not required (public)

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "overall": {
      "avgResponseTime": 36.5,
      "medianResponseTime": 24.3,
      "p95ResponseTime": 96.8
    },
    "byRole": [
      {
        "role": "MENTOR",
        "avgResponseTime": 32.1,
        "count": 5678
      },
      {
        "role": "EMPLOYER",
        "avgResponseTime": 42.8,
        "count": 2890
      }
    ],
    "byProjectType": [
      {
        "type": "PROJECT",
        "avgResponseTime": 38.2,
        "count": 4567
      },
      {
        "type": "INTERNSHIP",
        "avgResponseTime": 34.1,
        "count": 4001
      }
    ]
  }
}
```

**Public Limitations:**

- No `fastestResponders` array (mentor names excluded)
- Otherwise identical to admin endpoint

---

## Error Codes

All analytics endpoints use standard error codes:

| Code                  | HTTP Status | Description              | Resolution                           |
| --------------------- | ----------- | ------------------------ | ------------------------------------ |
| `UNAUTHORIZED`        | 401         | Missing or invalid token | Authenticate with valid access token |
| `FORBIDDEN`           | 403         | Insufficient permissions | Ensure user has required role        |
| `RATE_LIMIT_EXCEEDED` | 429         | Too many requests        | Wait 5 minutes, then retry           |
| `INTERNAL_ERROR`      | 500         | Server error             | Contact support with `errorId`       |

**Error Response Format:**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied. Required roles: ADMIN",
    "errorId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "correlationId": "req_xyz789"
  }
}
```

---

## Rate Limiting

**Global Analytics Limit:** 20 requests per 5 minutes per user

**HTTP Headers:**

```
RateLimit-Limit: 20
RateLimit-Remaining: 15
RateLimit-Reset: 1706094900
```

**Rate Limit Exceeded (429):**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many analytics requests. Please try again in 5 minutes."
  }
}
```

**Reset Timestamp:** Unix epoch seconds (use `RateLimit-Reset` header).

---

## Data Freshness

**Metrics Update Frequency:**

| Metric Type        | Update Frequency | Staleness |
| ------------------ | ---------------- | --------- |
| User counts        | Real-time        | 0s        |
| Project counts     | Real-time        | 0s        |
| Application stats  | Real-time        | 0s        |
| Aggregated metrics | 30 seconds       | Max 30s   |
| Skill trends       | 30 seconds       | Max 30s   |

**Prometheus Integration:**

- Metrics also exposed at `/api/v1/metrics/prometheus`
- Prometheus format for monitoring tools
- See Metrics API docs for details

---

## Common Questions

**Q: Why do public endpoints return limited data?**  
**A:** Privacy. Public endpoints exclude mentor names, user IDs, and detailed breakdowns to protect user privacy.

**Q: Can students see other students' analytics?**  
**A:** No. Student analytics endpoints only return data for the authenticated student.

**Q: Can mentors see competitor analytics?**  
**A:** No. Mentor endpoints only return data for their own projects. Only ADMIN can see platform-wide mentor performance.

**Q: What counts as "active" user?**  
**A:** Any user with `updatedAt` timestamp in the time window. Actions include: login, profile update, application submission, project creation, message sent.

**Q: How is `avgSkillsMatch` calculated?**  
**A:** (Applicant skills matching required skills / Total required skills) × 100, averaged across all applicants.

**Q: Why are some skills marked "rising" vs "stable"?**  
**A:** Trend compares current period project count to previous equal-length period. >20% growth = rising, -20% to +20% = stable, <-20% = falling.

**Q: What if I exceed rate limit?**  
**A:** Wait for the time specified in `RateLimit-Reset` header, then retry. Rate limit resets on a sliding 5-minute window per user.

**Q: Can I export analytics data?**  
**A:** Not via API. Contact support for bulk exports or database access for custom BI tools.

**Q: Are there webhooks for analytics events?**  
**A:** No. Analytics are pull-based only. Webhook support may be added in future.

**Q: What timezone are timestamps in?**  
**A:** All timestamps are UTC (ISO 8601 format). Date strings in `YYYY-MM-DD` format are also UTC-based.

**Q: Can I get analytics for a custom date range?**  
**A:** No. Only predefined `timeRange` values are supported (`7d`, `30d`, `90d`, `all`). Custom ranges may be added in future.

**Q: Why is `avgResponseTime` different across endpoints?**  
**A:** Each endpoint calculates based on its filtered dataset. Platform-wide averages include all applications; mentor-specific averages only include that mentor's applications.

---

## Integration Example

**React Hook for Student Analytics:**

```typescript
import { useState, useEffect } from "react";

interface StudentAnalytics {
  overview: {
    totalApplications: number;
    successRate: number;
    avgResponseTime: number;
  };
  // ... other fields
}

export function useStudentAnalytics(accessToken: string) {
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("https://api.codionix.com/api/v1/analytics/student/applications", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch analytics");
        return res.json();
      })
      .then((data) => {
        setAnalytics(data.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [accessToken]);

  return { analytics, loading, error };
}
```

**Admin Dashboard Component:**

```typescript
async function fetchPlatformOverview(accessToken: string) {
  const response = await fetch(
    "https://api.codionix.com/api/v1/analytics/platform/overview",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (response.status === 429) {
    // Rate limited
    const resetTime = response.headers.get("RateLimit-Reset");
    throw new Error(
      `Rate limited. Reset at ${new Date(Number(resetTime) * 1000)}`,
    );
  }

  if (response.status === 403) {
    throw new Error("Admin access required");
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error.message);
  }

  return data.data;
}
```

---

## Changelog

**v1.0.0** (2026-01-29)

- Initial release
- Platform, mentor, student, and public analytics endpoints
- Time-range filtering support
- Rate limiting implementation
