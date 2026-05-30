import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'secret';

// Extend the Express Request interface to include our custom user payload
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    organizationId: string;
  };
}

/**
 * Middleware to verify the JWT Access Token.
 * If valid, it attaches the user data to `req.user` so controllers can use it.
 */
export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ status: 401, code: 'UNAUTHORIZED', message: 'Missing or invalid authentication token' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ACCESS_SECRET) as { userId: string; role: string; organizationId: string };
    req.user = decoded; // Attach to request
    next(); // Pass control to the next middleware or controller
  } catch (error) {
    res.status(401).json({ status: 401, code: 'UNAUTHORIZED', message: 'Token is invalid or expired' });
    return;
  }
};

/**
 * Middleware to enforce Role-Based Access Control (RBAC).
 * It checks if the user's role matches any of the allowed roles for a specific route.
 * MUST be used AFTER `requireAuth`.
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ status: 401, code: 'UNAUTHORIZED', message: 'User not authenticated' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ 
        status: 403, 
        code: 'FORBIDDEN', 
        message: `Requires one of the following roles: ${allowedRoles.join(', ')}` 
      });
      return;
    }

    next();
  };
};
