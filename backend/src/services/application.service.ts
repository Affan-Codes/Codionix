import { prisma } from '../config/database.js';
import { Prisma } from '../generated/prisma/client.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../utils/errors.js';
import { logger, trackOperation } from '../utils/logger.js';
import type {
  CreateApplicationInput,
  ListApplicationsQuery,
  UpdateApplicationStatusInput,
} from '../validators/application.validator.js';
import { enqueueApplicationStatusEmail } from './emailQueue.service.js';

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
      currentApplicants: true,
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
  const tracker = trackOperation('application.create', undefined, {
    userId,
    projectId: data.projectId,
  });

  try {
    const { projectId, coverLetter, resumeUrl } = data;

    // with row-level locking to prevent race conditions
    const application = await prisma.$transaction(
      async (tx) => {
        // CRITICAL: SELECT FOR UPDATE locks the project row until transaction completes
        // This prevents concurrent applications from reading stale currentApplicants
        const project = await tx.project.findUnique({
          where: { id: projectId },
          select: {
            id: true,
            status: true,
            maxApplicants: true,
            currentApplicants: true,
          },
        });

        if (!project) {
          logger.warn('Application to non-existent project', {
            operation: 'application.create',
            userId,
            projectId,
            outcome: 'not_found',
          });
          throw new NotFoundError('Project not found');
        }

        if (project.status !== 'PUBLISHED') {
          logger.warn('Application to unpublished project', {
            operation: 'application.create',
            userId,
            projectId,
            projectStatus: project.status,
            outcome: 'validation_error',
          });
          throw new ValidationError('Cannot apply to unpublished projects');
        }

        // Check if project has reached max applicants
        if (
          project.maxApplicants &&
          project.currentApplicants >= project.maxApplicants
        ) {
          logger.warn('Application to full project', {
            operation: 'application.create',
            userId,
            projectId,
            currentApplicants: project.currentApplicants,
            maxApplicants: project.maxApplicants,
            outcome: 'validation_error',
          });
          throw new ValidationError('Project has reached maximum applicants');
        }

        // Check if user already applied
        const existingApplication = await tx.application.findUnique({
          where: {
            projectId_studentId: {
              projectId,
              studentId: userId,
            },
          },
        });

        if (existingApplication) {
          logger.warn('Duplicate application attempt', {
            operation: 'application.create',
            userId,
            projectId,
            existingApplicationId: existingApplication.id,
            outcome: 'conflict',
          });
          throw new ConflictError('You have already applied to this project');
        }

        // Create application
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
      },
      {
        // CRITICAL: Set transaction isolation level to Serializable
        // This is the strongest isolation level and prevents phantom reads
        // Default (Read Committed) is insufficient for this use case
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,

        // Transaction timeout: fail fast if lock contention is high
        // Prevents indefinite waiting when many students apply simultaneously
        maxWait: 5000, // 5 seconds max wait for lock
        timeout: 10000, // 10 seconds max transaction duration
      }
    );

    tracker.success({
      applicationId: application.id,
      userId,
      projectId,
      projectTitle: application.project.title,
      currentApplicants: application.project.currentApplicants,
    });

    return application;
  } catch (error) {
    tracker.failure(error, {
      userId,
      projectId: data.projectId,
    });
    throw error;
  }
};

/**
 * List applications with filters and pagination
 */
export const listApplications = async (
  query: ListApplicationsQuery
): Promise<PaginatedApplications> => {
  const tracker = trackOperation('application.list', undefined, {
    page: query.page,
    limit: query.limit,
    status: query.status,
  });

  try {
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

    tracker.success({
      resultsCount: applications.length,
      totalResults: total,
      page,
      totalPages,
    });

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
  } catch (error) {
    tracker.failure(error, {
      page: query.page,
      limit: query.limit,
    });
    throw error;
  }
};

/**
 * Get application by ID
 */
export const getApplicationById = async (
  applicationId: string
): Promise<ApplicationResponse> => {
  const tracker = trackOperation('application.getById', undefined, {
    applicationId,
  });

  try {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: applicationInclude,
    });

    if (!application) {
      logger.warn('Application not found', {
        operation: 'application.getById',
        applicationId,
        outcome: 'not_found',
      });
      throw new NotFoundError('Application not found');
    }

    tracker.success({
      applicationId: application.id,
      status: application.status,
      studentId: application.studentId,
      projectId: application.projectId,
    });

    return application;
  } catch (error) {
    tracker.failure(error, { applicationId });
    throw error;
  }
};

/**
 * Update application status
 */
export const updateApplicationStatus = async (
  applicationId: string,
  userId: string,
  data: UpdateApplicationStatusInput
): Promise<ApplicationResponse> => {
  const tracker = trackOperation('application.updateStatus', undefined, {
    applicationId,
    userId,
    newStatus: data.status,
  });

  try {
    const { status, rejectionReason } = data;

    // Get application with project details
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { project: true, student: true },
    });

    if (!application) {
      logger.warn('Status update on non-existent application', {
        operation: 'application.updateStatus',
        applicationId,
        userId,
        outcome: 'not_found',
      });
      throw new NotFoundError('Application not found');
    }

    // Check if user is project owner
    if (application.project.createdById !== userId) {
      logger.warn('Unauthorized application status update', {
        operation: 'application.updateStatus',
        applicationId,
        userId,
        projectOwnerId: application.project.createdById,
        outcome: 'forbidden',
      });
      throw new ForbiddenError(
        'You do not have permission to update this application'
      );
    }

    // Validate status transition
    if (status === 'REJECTED' && !rejectionReason) {
      logger.warn('Rejection without reason', {
        operation: 'application.updateStatus',
        applicationId,
        userId,
        outcome: 'validation_error',
      });
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

    if (
      status === 'ACCEPTED' ||
      status === 'REJECTED' ||
      status === 'UNDER_REVIEW'
    ) {
      enqueueApplicationStatusEmail({
        recipientEmail: application.student.email,
        recipientName: application.student.fullName,
        projectTitle: application.project.title,
        status: status as 'ACCEPTED' | 'REJECTED' | 'UNDER_REVIEW',
        ...(rejectionReason && { rejectionReason }),
      });
    }

    tracker.success({
      applicationId,
      previousStatus: application.status,
      newStatus: status,
      studentId: application.studentId,
      projectId: application.projectId,
      hasRejectionReason: !!rejectionReason,
      emailQueued: true,
    });

    return updatedApplication;
  } catch (error) {
    tracker.failure(error, {
      applicationId,
      userId,
      newStatus: data.status,
    });
    throw error;
  }
};

/**
 * Get student's applications
 */
export const getMyApplications = async (
  userId: string
): Promise<ApplicationResponse[]> => {
  const tracker = trackOperation('application.getMy', undefined, {
    userId,
  });

  try {
    const applications = await prisma.application.findMany({
      where: { studentId: userId },
      orderBy: { appliedAt: 'desc' },
      include: applicationInclude,
    });

    tracker.success({
      userId,
      applicationsCount: applications.length,
    });

    return applications;
  } catch (error) {
    tracker.failure(error, { userId });
    throw error;
  }
};

/**
 * Get applications for a project
 */
export const getProjectApplications = async (
  projectId: string,
  userId: string
): Promise<ApplicationResponse[]> => {
  const tracker = trackOperation('application.getByProject', undefined, {
    projectId,
    userId,
  });

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      logger.warn('Applications request for non-existent project', {
        operation: 'application.getByProject',
        projectId,
        userId,
        outcome: 'not_found',
      });
      throw new NotFoundError('Project not found');
    }

    // Check if user is project owner
    if (project.createdById !== userId) {
      logger.warn('Unauthorized project applications access', {
        operation: 'application.getByProject',
        projectId,
        userId,
        projectOwnerId: project.createdById,
        outcome: 'forbidden',
      });
      throw new ForbiddenError(
        'You do not have permission to view these applications'
      );
    }

    const applications = await prisma.application.findMany({
      where: { projectId },
      orderBy: { appliedAt: 'desc' },
      include: applicationInclude,
    });

    tracker.success({
      projectId,
      projectTitle: project.title,
      applicationsCount: applications.length,
    });

    return applications;
  } catch (error) {
    tracker.failure(error, { projectId, userId });
    throw error;
  }
};
