import type { Response } from 'express';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class ApiResponse {
  static success<T>(
    res: Response,
    data: T,
    statusCode: number = 200
  ): Response {
    const response: SuccessResponse<T> = {
      success: true,
      data,
    };
    return res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: unknown
  ): Response {
    const response: ErrorResponse = {
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined && { details }),
      },
    };
    return res.status(statusCode).json(response);
  }

  static created<T>(res: Response, data: T): Response {
    return this.success(res, data, 201);
  }

  static noContent(res: Response): Response {
    return res.status(204).send();
  }
}
