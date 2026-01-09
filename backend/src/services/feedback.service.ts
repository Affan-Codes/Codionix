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
  CreateFeedbackInput,
  ListFeedbackQuery,
  UpdateFeedbackInput,
} from '../validators/feedback.validator.js';

// ===================================
// PRISMA TYPES
// ===================================

const feedbackInclude = {
  application: {
    select: {
      id: true,
      studentId: true,
      projectId: true,
      status: true,
      project: {
        select: {
          id: true,
          title: true,
          createdById: true,
        },
      },
      student: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  },
  mentor: {
    select: {
      id: true,
      fullName: true,
      role: true,
    },
  },
} satisfies Prisma.FeedbackInclude;

type FeedbackWithRelations = Prisma.FeedbackGetPayload<{
  include: typeof feedbackInclude;
}>;

export type FeedbackResponse = FeedbackWithRelations;

export interface PaginatedFeedback {
  data: FeedbackResponse[];
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
 * Create feedback for an application
 * CRITICAL: Only project owner can create feedback
 */
export const createFeedback = async (
  userId: string,
  data: CreateFeedbackInput
): Promise<FeedbackResponse> => {
  const tracker = trackOperation('feedback.create', undefined, {
    userId,
    applicationId: data.applicationId,
  });

  try {
    const {
      applicationId,
      rating,
      feedbackText,
      strengths,
      improvements,
      isPublic,
    } = data;

    // Get application with project details
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        project: true,
        feedback: true,
      },
    });

    if (!application) {
      logger.warn('Feedback for non-existent application', {
        operation: 'feedback.create',
        applicationId,
        userId,
        outcome: 'not_found',
      });
      throw new NotFoundError('Application not found');
    }

    // Check if user is project owner
    if (application.project.createdById !== userId) {
      logger.warn('Unauthorized feedback creation attempt', {
        operation: 'feedback.create',
        applicationId,
        userId,
        projectOwnerId: application.project.createdById,
        outcome: 'forbidden',
      });
      throw new ForbiddenError('Only the project owner can provide feedback');
    }

    // Check if feedback already exists
    if (application.feedback) {
      logger.warn('Duplicate feedback creation attempt', {
        operation: 'feedback.create',
        applicationId,
        userId,
        existingFeedbackId: application.feedback.id,
        outcome: 'conflict',
      });
      throw new ConflictError('Feedback already exists for this application');
    }

    // Validate application status - only reviewed applications can receive feedback
    if (
      application.status !== 'ACCEPTED' &&
      application.status !== 'REJECTED'
    ) {
      logger.warn('Feedback for non-reviewed application', {
        operation: 'feedback.create',
        applicationId,
        userId,
        applicationStatus: application.status,
        outcome: 'validation_error',
      });
      throw new ValidationError(
        'Feedback can only be provided for accepted or rejected applications'
      );
    }

    // Create feedback
    const feedback = await prisma.feedback.create({
      data: {
        applicationId,
        mentorId: userId,
        rating,
        feedbackText,
        strengths,
        improvements,
        isPublic,
      },
      include: feedbackInclude,
    });

    tracker.success({
      feedbackId: feedback.id,
      applicationId,
      studentId: application.studentId,
      rating,
      isPublic,
    });

    return feedback;
  } catch (error) {
    tracker.failure(error, {
      userId,
      applicationId: data.applicationId,
    });
    throw error;
  }
};

/**
 * List feedback with filters and pagination
 */
export const listFeedback = async (
  query: ListFeedbackQuery
): Promise<PaginatedFeedback> => {
  const tracker = trackOperation('feedback.list', undefined, {
    page: query.page,
    limit: query.limit,
  });

  try {
    const { page, limit, studentId, mentorId, isPublic } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.FeedbackWhereInput = {};

    if (isPublic !== undefined) where.isPublic = isPublic;
    if (mentorId) where.mentorId = mentorId;
    if (studentId) {
      where.application = {
        studentId,
      };
    }

    const [feedback, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: feedbackInclude,
      }),
      prisma.feedback.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    tracker.success({
      resultsCount: feedback.length,
      totalResults: total,
      page,
      totalPages,
    });

    return {
      data: feedback,
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
 * Get feedback by ID
 * CRITICAL: Privacy - only show if public OR user is student/mentor
 */
export const getFeedbackById = async (
  feedbackId: string,
  userId?: string
): Promise<FeedbackResponse> => {
  const tracker = trackOperation('feedback.getById', undefined, {
    feedbackId,
    ...(userId && { userId }),
  });

  try {
    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
      include: feedbackInclude,
    });

    if (!feedback) {
      logger.warn('Feedback not found', {
        operation: 'feedback.getById',
        feedbackId,
        outcome: 'not_found',
      });
      throw new NotFoundError('Feedback not found');
    }

    // Privacy check: only show if public OR user is the student OR user is the mentor
    const isStudent = userId === feedback.application.studentId;
    const isMentor = userId === feedback.mentorId;

    if (!feedback.isPublic && !isStudent && !isMentor) {
      logger.warn('Unauthorized feedback access attempt', {
        operation: 'feedback.getById',
        feedbackId,
        userId,
        outcome: 'forbidden',
      });
      throw new ForbiddenError('You do not have access to this feedback');
    }

    tracker.success({
      feedbackId: feedback.id,
      rating: feedback.rating,
      isPublic: feedback.isPublic,
    });

    return feedback;
  } catch (error) {
    tracker.failure(error, { feedbackId, ...(userId && { userId }) });
    throw error;
  }
};

/**
 * Update feedback
 * CRITICAL: Only mentor who created it can update
 */
export const updateFeedback = async (
  feedbackId: string,
  userId: string,
  data: UpdateFeedbackInput
): Promise<FeedbackResponse> => {
  const tracker = trackOperation('feedback.update', undefined, {
    feedbackId,
    userId,
    fieldsUpdated: Object.keys(data).length,
  });

  try {
    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
    });

    if (!feedback) {
      logger.warn('Update on non-existent feedback', {
        operation: 'feedback.update',
        feedbackId,
        userId,
        outcome: 'not_found',
      });
      throw new NotFoundError('Feedback not found');
    }

    // Check if user is the mentor who created it
    if (feedback.mentorId !== userId) {
      logger.warn('Unauthorized feedback update attempt', {
        operation: 'feedback.update',
        feedbackId,
        userId,
        mentorId: feedback.mentorId,
        outcome: 'forbidden',
      });
      throw new ForbiddenError('You can only update your own feedback');
    }

    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined)
    );

    const updatedFeedback = await prisma.feedback.update({
      where: { id: feedbackId },
      data: cleanData,
      include: feedbackInclude,
    });

    tracker.success({
      feedbackId,
      fieldsUpdated: Object.keys(data),
    });

    return updatedFeedback;
  } catch (error) {
    tracker.failure(error, { feedbackId, userId });
    throw error;
  }
};

/**
 * Delete feedback
 * CRITICAL: Only mentor who created it can delete
 */
export const deleteFeedback = async (
  feedbackId: string,
  userId: string
): Promise<void> => {
  const tracker = trackOperation('feedback.delete', undefined, {
    feedbackId,
    userId,
  });

  try {
    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
    });

    if (!feedback) {
      logger.warn('Delete on non-existent feedback', {
        operation: 'feedback.delete',
        feedbackId,
        userId,
        outcome: 'not_found',
      });
      throw new NotFoundError('Feedback not found');
    }

    if (feedback.mentorId !== userId) {
      logger.warn('Unauthorized feedback delete attempt', {
        operation: 'feedback.delete',
        feedbackId,
        userId,
        mentorId: feedback.mentorId,
        outcome: 'forbidden',
      });
      throw new ForbiddenError('You can only delete your own feedback');
    }

    await prisma.feedback.delete({
      where: { id: feedbackId },
    });

    tracker.success({
      feedbackId,
    });
  } catch (error) {
    tracker.failure(error, { feedbackId, userId });
    throw error;
  }
};

/**
 * Get feedback for a student (their own feedback)
 */
export const getMyFeedback = async (
  userId: string
): Promise<FeedbackResponse[]> => {
  const tracker = trackOperation('feedback.getMy', undefined, {
    userId,
  });

  try {
    const feedback = await prisma.feedback.findMany({
      where: {
        application: {
          studentId: userId,
        },
      },
      orderBy: { createdAt: 'desc' },
      include: feedbackInclude,
    });

    tracker.success({
      userId,
      feedbackCount: feedback.length,
    });

    return feedback;
  } catch (error) {
    tracker.failure(error, { userId });
    throw error;
  }
};

/**
 * Get feedback by mentor (feedback they created)
 */
export const getFeedbackByMentor = async (
  userId: string
): Promise<FeedbackResponse[]> => {
  const tracker = trackOperation('feedback.getByMentor', undefined, {
    userId,
  });

  try {
    const feedback = await prisma.feedback.findMany({
      where: { mentorId: userId },
      orderBy: { createdAt: 'desc' },
      include: feedbackInclude,
    });

    tracker.success({
      userId,
      feedbackCount: feedback.length,
    });

    return feedback;
  } catch (error) {
    tracker.failure(error, { userId });
    throw error;
  }
};

/**
 * Get feedback for an application
 * CRITICAL: Privacy - check permissions
 */
export const getFeedbackForApplication = async (
  applicationId: string,
  userId: string
): Promise<FeedbackResponse | null> => {
  const tracker = trackOperation('feedback.getForApplication', undefined, {
    applicationId,
    userId,
  });

  try {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        project: true,
        feedback: {
          include: feedbackInclude,
        },
      },
    });

    if (!application) {
      logger.warn('Feedback for non-existent application', {
        operation: 'feedback.getForApplication',
        applicationId,
        userId,
        outcome: 'not_found',
      });
      throw new NotFoundError('Application not found');
    }

    // Check permissions - student, project owner, or public feedback
    const isStudent = userId === application.studentId;
    const isProjectOwner = userId === application.project.createdById;
    const isPublic = application.feedback?.isPublic || false;

    if (!isStudent && !isProjectOwner && !isPublic) {
      logger.warn('Unauthorized feedback access for application', {
        operation: 'feedback.getForApplication',
        applicationId,
        userId,
        outcome: 'forbidden',
      });
      throw new ForbiddenError(
        'You do not have permission to view this feedback'
      );
    }

    tracker.success({
      applicationId,
      hasFeedback: !!application.feedback,
    });

    return application.feedback || null;
  } catch (error) {
    tracker.failure(error, { applicationId, userId });
    throw error;
  }
};
