import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ZodError } from 'zod';
import { Prisma } from '../generated/prisma/client.js';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error
  logger.error(`Error: ${err.message}`, {
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  // Handle known AppError
  if (err instanceof AppError) {
    ApiResponse.error(res, err.message, err.statusCode, err.code);
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    ApiResponse.error(
      res,
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      details
    );
    return;
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        // Unique constraint violation
        const field = err.meta?.target as string[];
        ApiResponse.error(
          res,
          `${field?.join(', ')} already exists`,
          409,
          'CONFLICT'
        );
        return;
      case 'P2025':
        // Record not found
        ApiResponse.error(res, 'Record not found', 404, 'NOT_FOUND');
        return;
      default:
        ApiResponse.error(res, 'Database error', 500, 'DATABASE_ERROR');
        return;
    }
  }

  // Handle Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    ApiResponse.error(res, 'Invalid data provided', 400, 'VALIDATION_ERROR');
    return;
  }

  // Handle unknown errors
  ApiResponse.error(res, 'An unexpected error occurred', 500, 'INTERNAL_ERROR');
};
