import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { registerSchema, loginSchema, refreshTokenSchema } from '../utils/validation';
import { z } from 'zod';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = registerSchema.parse(req.body);
    const user = await AuthService.register(data.name, data.email, data.password, data.organizationName);
    const tokens = AuthService.generateTokens(user.id, user.role, user.organizationId);
    
    res.status(201).json({
      status: 201,
      message: 'User registered successfully',
      data: { user: { id: user.id, name: user.name, email: user.email, role: user.role }, tokens }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ status: 400, code: 'VALIDATION_ERROR', message: error.issues[0]?.message || 'Validation error' });
      return;
    }
    res.status(400).json({ status: 400, code: 'AUTH_ERROR', message: error.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = loginSchema.parse(req.body);
    const tokens = await AuthService.login(data.email, data.password);
    res.status(200).json({ status: 200, message: 'Login successful', data: tokens });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ status: 400, code: 'VALIDATION_ERROR', message: error.issues[0]?.message || 'Validation error' });
      return;
    }
    res.status(401).json({ status: 401, code: 'AUTH_ERROR', message: error.message });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = refreshTokenSchema.parse(req.body);
    const tokens = await AuthService.refresh(data.refreshToken);
    res.status(200).json({ status: 200, message: 'Token refreshed', data: tokens });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ status: 400, code: 'VALIDATION_ERROR', message: error.issues[0]?.message || 'Validation error' });
      return;
    }
    res.status(401).json({ status: 401, code: 'AUTH_ERROR', message: error.message });
  }
};
