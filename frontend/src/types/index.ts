// User types
export const UserRole = {
  STUDENT: "STUDENT",
  MENTOR: "MENTOR",
  EMPLOYER: "EMPLOYER",
  ADMIN: "ADMIN",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  bio?: string;
  profilePictureUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  skills: string[];
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// Project types
export const ProjectType = {
  PROJECT: "PROJECT",
  INTERNSHIP: "INTERNSHIP",
} as const;

export type ProjectType = (typeof ProjectType)[keyof typeof ProjectType];

export const DifficultyLevel = {
  BEGINNER: "BEGINNER",
  INTERMEDIATE: "INTERMEDIATE",
  ADVANCED: "ADVANCED",
} as const;

export type DifficultyLevel =
  (typeof DifficultyLevel)[keyof typeof DifficultyLevel];

export const ProjectStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  CLOSED: "CLOSED",
} as const;

export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export interface Project {
  id: string;
  title: string;
  description: string;
  skills: string[];
  duration: string;
  deadline: string;
  projectType: ProjectType;
  stipend?: number;
  isRemote: boolean;
  difficultyLevel: DifficultyLevel;
  status: ProjectStatus;
  companyName?: string;
  location?: string;
  maxApplicants?: number;
  currentApplicants: number;
  createdBy: {
    id: string;
    fullName: string;
    role: UserRole;
  };
  createdAt: string;
  updatedAt: string;
}

// Application types
export const ApplicationStatus = {
  PENDING: "PENDING",
  UNDER_REVIEW: "UNDER_REVIEW",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
} as const;

export type ApplicationStatus =
  (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

export interface Application {
  id: string;
  projectId: string;
  studentId: string;
  coverLetter: string;
  resumeUrl?: string;
  status: ApplicationStatus;
  appliedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  project?: Project;
  student?: User;
}

// Feedback types
export interface Feedback {
  id: string;
  applicationId: string;
  mentorId: string;
  rating: number;
  feedbackText: string;
  strengths: string[];
  improvements: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  mentor?: User;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}

export interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
