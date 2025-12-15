import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

type UserRole = 'STUDENT' | 'MENTOR' | 'EMPLOYER' | 'ADMIN';

/**
 * Authorize user based on roles
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      next(
        new ForbiddenError(
          `Access denied. Required roles: ${allowedRoles.join(', ')}`
        )
      );
      return;
    }

    next();
  };
};

/**
 * Check if user is a student
 */
export const isStudent = authorize('STUDENT');

/**
 * Check if user is a mentor
 */
export const isMentor = authorize('MENTOR');

/**
 * Check if user is an employer
 */
export const isEmployer = authorize('EMPLOYER');

/**
 * Check if user is mentor or employer (can create projects)
 */
export const canCreateProjects = authorize('MENTOR', 'EMPLOYER');

/**
 * Check if user is an admin
 */
export const isAdmin = authorize('ADMIN');

/**
 * Check if user owns a resource
 */
export const isOwner = (
  getUserIdFromResource: (req: Request) => string | Promise<string>
) => {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        next(new UnauthorizedError('Authentication required'));
        return;
      }

      const resourceOwnerId = await getUserIdFromResource(req);

      if (req.user.userId !== resourceOwnerId && req.user.role !== 'ADMIN') {
        next(
          new ForbiddenError(
            'You do not have permission to access this resource'
          )
        );
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
