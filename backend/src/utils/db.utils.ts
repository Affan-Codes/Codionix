import { prisma } from '../config/database.js';
import { logger } from './logger.js';

/**
 * Execute a function within a database transaction
 */
export async function withTransaction<T>(
  fn: (tx: typeof prisma) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(async (tx) => {
    return await fn(tx as typeof prisma);
  });
}

/**
 * Check if a record exists by ID
 */
export async function exists(
  model: keyof typeof prisma,
  id: string
): Promise<boolean> {
  try {
    const record = await (prisma[model] as any).findUnique({
      where: { id },
      select: { id: true },
    });
    return !!record;
  } catch (error) {
    logger.error(`Error checking existence for ${String(model)}:`, error);
    return false;
  }
}

/**
 * Soft delete helper (if you implement soft deletes later)
 */
export async function softDelete(
  model: keyof typeof prisma,
  id: string
): Promise<void> {
  await (prisma[model] as any).update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

/**
 * Pagination helper
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export async function paginate<T>(
  model: keyof typeof prisma,
  params: PaginationParams & { where?: any; include?: any; orderBy?: any }
): Promise<PaginationResult<T>> {
  const page = params.page || 1;
  const limit = Math.min(params.limit || 10, 100); // Max 100 items per page
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    (prisma[model] as any).findMany({
      where: params.where,
      include: params.include,
      orderBy: params.orderBy,
      skip,
      take: limit,
    }),
    (prisma[model] as any).count({ where: params.where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}
