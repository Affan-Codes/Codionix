import { prisma } from '../config/database.js';
import type { Prisma } from '../generated/prisma/client.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import { logger, trackOperation } from '../utils/logger.js';
import type {
  CreateProjectInput,
  ListProjectsQuery,
  UpdateProjectInput,
} from '../validators/project.validator.js';

// ===================================
// PRISMA TYPES
// ===================================

const projectInclude = {
  createdBy: {
    select: {
      id: true,
      fullName: true,
      role: true,
    },
  },
} satisfies Prisma.ProjectInclude;

// Infer the return type from Prisma operations
type ProjectWithCreator = Prisma.ProjectGetPayload<{
  include: typeof projectInclude;
}>;

// ===================================
// RESPONSE TYPES
// ===================================

export type ProjectResponse = ProjectWithCreator;

export interface PaginatedProjects {
  data: ProjectResponse[];
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
 * Create a new project
 */
export const createProject = async (
  userId: string,
  data: CreateProjectInput
): Promise<ProjectResponse> => {
  const tracker = trackOperation('project.create', undefined, {
    userId,
    title: data.title,
    projectType: data.projectType,
    status: data.status,
  });

  try {
    const prismaData: Prisma.ProjectCreateInput = {
      title: data.title,
      description: data.description,
      skills: data.skills,
      duration: data.duration,
      deadline: data.deadline,
      projectType: data.projectType,
      isRemote: data.isRemote,
      difficultyLevel: data.difficultyLevel,
      status: data.status,
      maxApplicants: data.maxApplicants,

      // Nullable fields – ONLY pass if present
      ...(data.stipend !== undefined && { stipend: data.stipend }),
      ...(data.companyName !== undefined && { companyName: data.companyName }),
      ...(data.location !== undefined && { location: data.location }),

      createdBy: {
        connect: { id: userId },
      },
    };

    const project = await prisma.project.create({
      data: prismaData,
      include: projectInclude,
    });

    tracker.success({
      projectId: project.id,
      title: project.title,
      projectType: project.projectType,
      status: project.status,
      skillsCount: project.skills.length,
    });

    return project;
  } catch (error) {
    tracker.failure(error, {
      userId,
      title: data.title,
    });
    throw error;
  }
};

/**
 * List projects with filters and pagination
 */
export const listProjects = async (
  query: ListProjectsQuery
): Promise<PaginatedProjects> => {
  const tracker = trackOperation('project.list', undefined, {
    page: query.page,
    limit: query.limit,
    projectType: query.projectType,
    status: query.status,
    hasSearch: !!query.search,
  });

  try {
    const {
      page,
      limit,
      projectType,
      difficultyLevel,
      status,
      skills,
      search,
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = {};

    if (projectType) where.projectType = projectType;
    if (difficultyLevel) where.difficultyLevel = difficultyLevel;
    if (status) where.status = status;

    if (skills) {
      const skillsArray = skills.split(',').map((s) => s.trim());
      where.skills = {
        hasSome: skillsArray,
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: projectInclude,
      }),
      prisma.project.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    tracker.success({
      resultsCount: projects.length,
      totalResults: total,
      page,
      totalPages,
    });

    return {
      data: projects,
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
 * Get project by ID
 */
export const getProjectById = async (
  projectId: string
): Promise<ProjectResponse> => {
  const tracker = trackOperation('project.getById', undefined, {
    projectId,
  });

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: projectInclude,
    });

    if (!project) {
      logger.warn('Project not found', {
        operation: 'project.getById',
        projectId,
        outcome: 'not_found',
      });
      throw new NotFoundError('Project not found');
    }

    tracker.success({
      projectId: project.id,
      title: project.title,
      status: project.status,
      creatorId: project.createdById,
    });

    return project;
  } catch (error) {
    tracker.failure(error, { projectId });
    throw error;
  }
};

/**
 * Update project
 */
export const updateProject = async (
  projectId: string,
  userId: string,
  data: UpdateProjectInput
): Promise<ProjectResponse> => {
  const tracker = trackOperation('project.update', undefined, {
    projectId,
    userId,
    fieldsUpdated: Object.keys(data).length,
  });

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      logger.warn('Update attempted on non-existent project', {
        operation: 'project.update',
        projectId,
        userId,
        outcome: 'not_found',
      });
      throw new NotFoundError('Project not found');
    }

    if (project.createdById !== userId) {
      logger.warn('Unauthorized project update attempt', {
        operation: 'project.update',
        projectId,
        userId,
        actualOwnerId: project.createdById,
        outcome: 'forbidden',
      });
      throw new ForbiddenError(
        'You do not have permission to update this project'
      );
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data,
      include: projectInclude,
    });

    tracker.success({
      projectId: updatedProject.id,
      title: updatedProject.title,
      status: updatedProject.status,
      fieldsUpdated: Object.keys(data),
    });

    return updatedProject;
  } catch (error) {
    tracker.failure(error, { projectId, userId });
    throw error;
  }
};

/**
 * Delete project
 */
export const deleteProject = async (
  projectId: string,
  userId: string
): Promise<void> => {
  const tracker = trackOperation('project.delete', undefined, {
    projectId,
    userId,
  });

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      logger.warn('Delete attempted on non-existent project', {
        operation: 'project.delete',
        projectId,
        userId,
        outcome: 'not_found',
      });
      throw new NotFoundError('Project not found');
    }

    if (project.createdById !== userId) {
      logger.warn('Unauthorized project delete attempt', {
        operation: 'project.delete',
        projectId,
        userId,
        actualOwnerId: project.createdById,
        outcome: 'forbidden',
      });
      throw new ForbiddenError(
        'You do not have permission to delete this project'
      );
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    tracker.success({
      projectId,
      title: project.title,
      applicantsCount: project.currentApplicants,
    });
  } catch (error) {
    tracker.failure(error, { projectId, userId });
    throw error;
  }
};

/**
 * Get current user's projects
 */
export const getMyProjects = async (
  userId: string
): Promise<ProjectResponse[]> => {
  const tracker = trackOperation('project.getMy', undefined, {
    userId,
  });

  try {
    const projects = await prisma.project.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: 'desc' },
      include: projectInclude,
    });

    tracker.success({
      userId,
      projectsCount: projects.length,
    });

    return projects;
  } catch (error) {
    tracker.failure(error, { userId });
    throw error;
  }
};
