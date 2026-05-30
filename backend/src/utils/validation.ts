import { z } from 'zod';

// We use Zod to enforce strict validation rules before the data ever reaches our database.
export const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  organizationName: z.string().min(1, "Organization name is required")
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required")
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required")
});

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  dueDate: z.string().datetime().optional(), // ISO 8601 date string
  assigneeId: z.string().uuid().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']).optional(),
  dueDate: z.string().datetime().optional(),
  assigneeId: z.string().uuid().optional(),
});

export const listTasksSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default(1),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default(10),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  assigneeId: z.string().uuid().optional(),
});
