import type { Request, Response } from 'express';
import { ApiResponse } from '../utils/apiResponse.js';

export const notFoundHandler = (req: Request, res: Response): void => {
  ApiResponse.error(
    res,
    `Route ${req.method} ${req.path} not found`,
    404,
    'NOT_FOUND'
  );
};
