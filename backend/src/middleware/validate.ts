import type { Request, Response, NextFunction } from 'express';
import type { z } from 'zod';

export const validate = <T extends z.ZodType>(schema: T) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Helper for body validation only
export const validateBody = <T extends z.ZodType>(schema: T) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Helper for query validation
export const validateQuery = <T extends z.ZodType>(schema: T) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.query);
      Object.assign(req.query, parsed);
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Helper for params validation
export const validateParams = <T extends z.ZodType>(schema: T) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.params);
      Object.assign(req.params, parsed);
      next();
    } catch (error) {
      next(error);
    }
  };
};
