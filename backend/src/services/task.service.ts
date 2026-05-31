import { prisma } from '../utils/prisma';
import { redisClient } from '../utils/redis';

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED';

export class TaskService {
  /**
   * Helper to validate if a status transition is allowed.
   */
  static validateStatusTransition(current: TaskStatus, next: TaskStatus) {
    if (current === next) return true;
    
    if (next === 'BLOCKED' && current !== 'DONE') return true;
    if (current === 'BLOCKED' && next === 'TODO') return true;

    const validTransitions: Record<TaskStatus, TaskStatus | null> = {
      TODO: 'IN_PROGRESS',
      IN_PROGRESS: 'IN_REVIEW',
      IN_REVIEW: 'DONE',
      DONE: null,
      BLOCKED: 'TODO',
    };

    if (validTransitions[current] !== next) {
      throw new Error(`Invalid status transition from ${current} to ${next}`);
    }
  }

  /**
   * Cache Invalidation Strategy: Versioning
   * Instead of using expensive KEYS * scans in Redis to find and delete all specific task caches,
   * we simply maintain an integer "version" for the organization.
   * We attach this version to all our cache keys. If we increment this version, 
   * all old cache keys instantly become invalid and will naturally expire later.
   */
  static async getCacheVersion(organizationId: string): Promise<number> {
    if (!redisClient.isOpen) return 0;
    const version = await redisClient.get(`org:${organizationId}:task_version`);
    return version ? parseInt(version) : 0;
  }

  static async invalidateTaskCache(organizationId: string): Promise<void> {
    if (!redisClient.isOpen) return;
    await redisClient.incr(`org:${organizationId}:task_version`);
  }

  static async createTask(data: any, user: { userId: string, role: string, organizationId: string }) {
    if (data.assigneeId && data.assigneeId !== user.userId && user.role === 'MEMBER') {
      throw new Error('Members can only assign tasks to themselves');
    }

    const task = await prisma.task.create({
      data: {
        ...data,
        organizationId: user.organizationId
      }
    });

    await this.invalidateTaskCache(user.organizationId);
    return task;
  }

  static async listTasks(filters: any, user: { userId: string, role: string, organizationId: string }) {
    const { page, limit, status, priority, assigneeId } = filters;
    
    // 1. Check Redis Cache First
    let cacheKey = '';
    if (redisClient.isOpen) {
      const version = await this.getCacheVersion(user.organizationId);
      // Cache key includes the exact filters, role, and the organization's current cache version
      const cacheAssignee = user.role === 'MEMBER' ? user.userId : (assigneeId || 'any');
      cacheKey = `tasks:${user.organizationId}:v${version}:a_${cacheAssignee}:p${page}:l${limit}:s_${status||'any'}:pr_${priority||'any'}`;
      
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
    }

    // 2. If Cache Miss, query the database
    const skip = (page - 1) * limit;
    const where: any = { organizationId: user.organizationId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    
    // CORE RBAC REQUIREMENT: Members can only view their own tasks
    if (user.role === 'MEMBER') {
      where.assigneeId = user.userId;
    } else if (assigneeId) {
      where.assigneeId = assigneeId;
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.task.count({ where })
    ]);

    const result = {
      data: tasks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };

    // 3. Save to Redis Cache (expire after 5 minutes just to keep memory clean)
    if (redisClient.isOpen && cacheKey) {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(result));
    }

    return result;
  }

  static async updateTask(taskId: string, updateData: any, user: { userId: string, role: string, organizationId: string }) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    
    if (!task || task.organizationId !== user.organizationId) {
      throw new Error('Task not found');
    }

    if (user.role === 'MEMBER' && task.assigneeId !== user.userId) {
      throw new Error('Members can only update tasks assigned to them');
    }

    if (updateData.assigneeId && updateData.assigneeId !== task.assigneeId && user.role === 'MEMBER') {
      throw new Error('Members cannot reassign tasks');
    }

    if (updateData.status && updateData.status !== task.status) {
      if (user.role === 'MEMBER' && task.assigneeId !== user.userId) {
        throw new Error('Only the assignee or a manager can advance task status');
      }
      this.validateStatusTransition(task.status, updateData.status as TaskStatus);
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData
    });

    await this.invalidateTaskCache(user.organizationId);
    return updatedTask;
  }

  static async deleteTask(taskId: string, user: { role: string, organizationId: string }) {
    if (user.role === 'MEMBER') {
      throw new Error('Members cannot delete tasks');
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.organizationId !== user.organizationId) {
      throw new Error('Task not found');
    }

    await prisma.task.delete({ where: { id: taskId } });
    await this.invalidateTaskCache(user.organizationId);
  }
}
