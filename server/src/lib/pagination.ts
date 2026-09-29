import { z } from 'zod';

export const pageQuery = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

export const paginate = <T>(rows: T[], page: number, limit: number) => ({
  items: rows.slice((page - 1) * limit, page * limit),
  total: rows.length,
  page,
  limit,
});
