import { prisma } from '../utils/prisma';

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED';

export class TaskService {
  /**
   * Helper to validate if a status transition is allowed.
   */
  static validateStatusTransition(current: TaskStatus, next: TaskStatus) {
    if (current === next) return true;
    
    // Can move to BLOCKED from any state (except maybe DONE)
    if (next === 'BLOCKED' && current !== 'DONE') return true;
    // Can move from BLOCKED back to TODO to restart
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

  static async createTask(data: any, user: { userId: string, role: string, organizationId: string }) {
    // Only ADMIN or MANAGER can assign tasks to others during creation. 
    // MEMBERS can only create unassigned tasks or assign to themselves.
    if (data.assigneeId && data.assigneeId !== user.userId && user.role === 'MEMBER') {
      throw new Error('Members can only assign tasks to themselves');
    }

    return prisma.task.create({
      data: {
        ...data,
        organizationId: user.organizationId
      }
    });
  }

  static async listTasks(filters: any, user: { organizationId: string }) {
    const { page, limit, status, priority, assigneeId } = filters;
    const skip = (page - 1) * limit;

    const where: any = { organizationId: user.organizationId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.task.count({ where })
    ]);

    return {
      data: tasks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async updateTask(taskId: string, updateData: any, user: { userId: string, role: string, organizationId: string }) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    
    if (!task || task.organizationId !== user.organizationId) {
      throw new Error('Task not found');
    }

    // RBAC: Members can only update tasks assigned to them
    if (user.role === 'MEMBER' && task.assigneeId !== user.userId) {
      throw new Error('Members can only update tasks assigned to them');
    }

    // RBAC: Only MANAGER or ADMIN can change the assignee
    if (updateData.assigneeId && updateData.assigneeId !== task.assigneeId && user.role === 'MEMBER') {
      throw new Error('Members cannot reassign tasks');
    }

    // Validate Status Transitions
    if (updateData.status && updateData.status !== task.status) {
      // Only assignee, MANAGER, or ADMIN can advance status
      if (user.role === 'MEMBER' && task.assigneeId !== user.userId) {
        throw new Error('Only the assignee or a manager can advance task status');
      }
      this.validateStatusTransition(task.status, updateData.status);
    }

    return prisma.task.update({
      where: { id: taskId },
      data: updateData
    });
  }

  static async deleteTask(taskId: string, user: { role: string, organizationId: string }) {
    // RBAC: Only ADMIN or MANAGER can delete tasks
    if (user.role === 'MEMBER') {
      throw new Error('Members cannot delete tasks');
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.organizationId !== user.organizationId) {
      throw new Error('Task not found');
    }

    return prisma.task.delete({ where: { id: taskId } });
  }
}
