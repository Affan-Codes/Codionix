import { prisma } from '../config/database.js';
import type { Prisma } from '../generated/prisma/client.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type {
  CreateApplicationInput,
  ListApplicationsQuery,
  UpdateApplicationStatusInput,
} from '../validators/application.validator.js';

// ===================================
// PRISMA TYPES
// ===================================

const applicationInclude = {
  project: {
    select: {
      id: true,
      title: true,
      projectType: true,
      status: true,
      createdById: true,
    },
  },
  student: {
    select: {
      id: true,
      fullName: true,
      email: true,
      skills: true,
    },
  },
  reviewer: {
    select: {
      id: true,
      fullName: true,
    },
  },
} satisfies Prisma.ApplicationInclude;

type ApplicationWithRelations = Prisma.ApplicationGetPayload<{
  include: typeof applicationInclude;
}>;

export type ApplicationResponse = ApplicationWithRelations;

export interface PaginatedApplications {
  data: ApplicationResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// ===================================
// SERVICE FUNCTIONS
// ===================================

/**
 * Create a new application
 */
export const createApplication = async (
  userId: string,
  data: CreateApplicationInput
): Promise<ApplicationResponse> => {
  const { projectId, coverLetter, resumeUrl } = data;

  // Check if project exists and is published
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  if (project.status !== 'PUBLISHED') {
    throw new ValidationError('Cannot apply to unpublished projects');
  }

  // Check if project has reached max applicants
  if (
    project.maxApplicants &&
    project.currentApplicants >= project.maxApplicants
  ) {
    throw new ValidationError('Project has reached maximum applicants');
  }

  // Check if user already applied
  const existingApplication = await prisma.application.findUnique({
    where: {
      projectId_studentId: {
        projectId,
        studentId: userId,
      },
    },
  });

  if (existingApplication) {
    throw new ConflictError('You have already applied to this project');
  }

  // Create application and increment currentApplicants
  const application = await prisma.$transaction(async (tx) => {
    const app = await tx.application.create({
      data: {
        projectId,
        studentId: userId,
        coverLetter,
        ...(resumeUrl !== undefined && { resumeUrl }),
      },
      include: applicationInclude,
    });

    await tx.project.update({
      where: { id: projectId },
      data: { currentApplicants: { increment: 1 } },
    });

    return app;
  });

  logger.info(`Application created: ${application.id} by user: ${userId}`);

  return application;
};

/**
 * List applications with filters and pagination
 */
export const listApplications = async (
  query: ListApplicationsQuery
): Promise<PaginatedApplications> => {
  const { page, limit, status, projectId, studentId } = query;

  const skip = (page - 1) * limit;

  const where: Prisma.ApplicationWhereInput = {};

  if (status) where.status = status;
  if (projectId) where.projectId = projectId;
  if (studentId) where.studentId = studentId;

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where,
      skip,
      take: limit,
      orderBy: { appliedAt: 'desc' },
      include: applicationInclude,
    }),
    prisma.application.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: applications,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Get application by ID
 */
export const getApplicationById = async (
  applicationId: string
): Promise<ApplicationResponse> => {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: applicationInclude,
  });

  if (!application) {
    throw new NotFoundError('Application not found');
  }

  return application;
};

/**
 * Update application status
 */
export const updateApplicationStatus = async (
  applicationId: string,
  userId: string,
  data: UpdateApplicationStatusInput
): Promise<ApplicationResponse> => {
  const { status, rejectionReason } = data;

  // Get application with project details
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { project: true },
  });

  if (!application) {
    throw new NotFoundError('Application not found');
  }

  // Check if user is project owner
  if (application.project.createdById !== userId) {
    throw new ForbiddenError(
      'You do not have permission to update this application'
    );
  }

  // Validate status transition
  if (status === 'REJECTED' && !rejectionReason) {
    throw new ValidationError('Rejection reason is required when rejecting');
  }

  // Update application
  const updatedApplication = await prisma.application.update({
    where: { id: applicationId },
    data: {
      status,
      reviewedAt: new Date(),
      reviewerId: userId,
      ...(rejectionReason !== undefined && { rejectionReason }),
    },
    include: applicationInclude,
  });

  logger.info(
    `Application ${applicationId} status updated to ${status} by ${userId}`
  );

  return updatedApplication;
};

/**
 * Get student's applications
 */
export const getMyApplications = async (
  userId: string
): Promise<ApplicationResponse[]> => {
  const applications = await prisma.application.findMany({
    where: { studentId: userId },
    orderBy: { appliedAt: 'desc' },
    include: applicationInclude,
  });

  return applications;
};

/**
 * Get applications for a project
 */
export const getProjectApplications = async (
  projectId: string,
  userId: string
): Promise<ApplicationResponse[]> => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // Check if user is project owner
  if (project.createdById !== userId) {
    throw new ForbiddenError(
      'You do not have permission to view these applications'
    );
  }

  const applications = await prisma.application.findMany({
    where: { projectId },
    orderBy: { appliedAt: 'desc' },
    include: applicationInclude,
  });

  return applications;
};
