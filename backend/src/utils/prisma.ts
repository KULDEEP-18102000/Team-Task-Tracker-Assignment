import { PrismaClient } from '@prisma/client';

// We export a single instance of Prisma to be used across the entire app
// This prevents us from opening too many database connections and exhausting the pool.
export const prisma = new PrismaClient();
