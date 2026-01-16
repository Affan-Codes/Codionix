/**
 * Express Type Extensions
 * Extends Express types for custom middleware
 */

declare global {
  namespace Express {
    /**
     * User authentication payload
     * Added by authenticate middleware
     */
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
      };
      correlationId?: string;
      startTime?: number;
    }

    /**
     * Multer file type
     * Added when using multer middleware
     */
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination?: string;
        filename?: string;
        path?: string;
        buffer: Buffer;
      }
    }
  }
}

export {};
