import type { Request, Response } from 'express';
import * as projectService from '../services/project.service.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  createProjectSchema,
  listProjectsQuerySchema,
  projectIdParamSchema,
  updateProjectSchema,
} from '../validators/project.validator.js';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * Create new project
 * POST /api/v1/projects
 */
export const createProject = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const data = createProjectSchema.parse(req.body);

    const project = await projectService.createProject(userId, data);

    ApiResponse.created(res, project);
  }
);

/**
 * List all projects with filters
 * GET /api/v1/projects
 */
export const listProjects = asyncHandler(
  async (req: Request, res: Response) => {
    const query = listProjectsQuerySchema.parse(req.query);

    const result = await projectService.listProjects(query);

    ApiResponse.success(res, result);
  }
);

/**
 * Get project by ID
 * GET /api/v1/projects/:id
 */
export const getProjectById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = projectIdParamSchema.parse(req.params);

    const project = await projectService.getProjectById(id);

    ApiResponse.success(res, project);
  }
);

/**
 * Update project
 * PATCH /api/v1/projects/:id
 */
export const updateProject = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = projectIdParamSchema.parse(req.params);
    const userId = req.user!.userId;
    const data = updateProjectSchema.parse(req.body);

    const project = await projectService.updateProject(id, userId, data);

    ApiResponse.success(res, project);
  }
);

/**
 * Delete project
 * DELETE /api/v1/projects/:id
 */
export const deleteProject = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = projectIdParamSchema.parse(req.params);
    const userId = req.user!.userId;

    await projectService.deleteProject(id, userId);

    ApiResponse.success(res, { message: 'Project deleted successfully' });
  }
);

/**
 * Get current user's projects
 * GET /api/v1/projects/my-projects
 */
export const getMyProjects = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const projects = await projectService.getMyProjects(userId);

    ApiResponse.success(res, projects);
  }
);
