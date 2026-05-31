import { Router } from 'express';
import { createTask, listTasks, updateTask, deleteTask } from '../controllers/task.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// All task routes require a valid JWT Access Token
router.use(requireAuth);

// Anyone can create or list tasks (Service layer restricts what they see/create)
router.post('/', createTask); 
router.get('/', listTasks); 


// Anyone can update (Service layer strictly limits updates to assigned tasks & status transitions)
router.patch('/:id', updateTask); 

// RBAC Middleware: Only ADMIN or MANAGER can permanently delete tasks
router.delete('/:id', requireRole(['ADMIN', 'MANAGER']), deleteTask); 

export default router;
