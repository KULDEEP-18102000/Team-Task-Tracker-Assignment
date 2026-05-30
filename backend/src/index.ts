import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

import authRoutes from './routes/auth.routes';
import taskRoutes from './routes/task.routes';

app.use(express.json());

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// Basic health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'Task Tracker API is running' });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    status: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message: err.message || 'Something went wrong!',
  });
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
