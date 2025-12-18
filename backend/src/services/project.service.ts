import { prisma } from '../config/database.js';
import type { Prisma } from '../generated/prisma/client.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
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

  logger.info(`Project created: ${project.title} by user: ${userId}`);

  return project;
};

/**
 * List projects with filters and pagination
 */
export const listProjects = async (
  query: ListProjectsQuery
): Promise<PaginatedProjects> => {
  const { page, limit, projectType, difficultyLevel, status, skills, search } =
    query;

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
};

/**
 * Get project by ID
 */
export const getProjectById = async (
  projectId: string
): Promise<ProjectResponse> => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: projectInclude,
  });

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  return project;
};

/**
 * Update project
 */
export const updateProject = async (
  projectId: string,
  userId: string,
  data: UpdateProjectInput
): Promise<ProjectResponse> => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  if (project.createdById !== userId) {
    throw new ForbiddenError(
      'You do not have permission to update this project'
    );
  }

  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data,
    include: projectInclude,
  });

  logger.info(`Project updated: ${updatedProject.title}`);

  return updatedProject;
};

/**
 * Delete project
 */
export const deleteProject = async (
  projectId: string,
  userId: string
): Promise<void> => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  if (project.createdById !== userId) {
    throw new ForbiddenError(
      'You do not have permission to delete this project'
    );
  }

  await prisma.project.delete({
    where: { id: projectId },
  });

  logger.info(`Project deleted: ${project.title}`);
};

/**
 * Get current user's projects
 */
export const getMyProjects = async (
  userId: string
): Promise<ProjectResponse[]> => {
  const projects = await prisma.project.findMany({
    where: { createdById: userId },
    orderBy: { createdAt: 'desc' },
    include: projectInclude,
  });

  return projects;
};
