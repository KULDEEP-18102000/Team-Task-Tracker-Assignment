import { Response } from 'express';
import { TaskService } from '../services/task.service';
import { createTaskSchema, updateTaskSchema, listTasksSchema } from '../utils/validation';
import { AuthRequest } from '../middlewares/auth.middleware';
import { z } from 'zod';

export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = createTaskSchema.parse(req.body);
    const task = await TaskService.createTask(data, req.user!);
    res.status(201).json({ status: 201, message: 'Task created', data: task });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ status: 400, code: 'VALIDATION_ERROR', message: error.issues[0]?.message || 'Validation error' });
      return;
    }
    res.status(400).json({ status: 400, code: 'BAD_REQUEST', message: error.message });
  }
};

export const listTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filters = listTasksSchema.parse(req.query);
    const result = await TaskService.listTasks(filters, req.user!);
    res.status(200).json({ status: 200, ...result });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ status: 400, code: 'VALIDATION_ERROR', message: error.issues[0]?.message || 'Validation error' });
      return;
    }
    res.status(400).json({ status: 400, code: 'BAD_REQUEST', message: error.message });
  }
};

export const updateTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const data = updateTaskSchema.parse(req.body);
    const task = await TaskService.updateTask(id, data, req.user!);
    res.status(200).json({ status: 200, message: 'Task updated', data: task });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ status: 400, code: 'VALIDATION_ERROR', message: error.issues[0]?.message || 'Validation error' });
      return;
    }
    res.status(400).json({ status: 400, code: 'BAD_REQUEST', message: error.message });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await TaskService.deleteTask(id, req.user!);
    res.status(204).send(); // 204 No Content
  } catch (error: any) {
    res.status(400).json({ status: 400, code: 'BAD_REQUEST', message: error.message });
  }
};
