import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../utils/redis';

// Configuration: 100 requests allowed per 15-minute window per IP
const MAX_REQUESTS = 100;
const WINDOW_SECONDS = 15 * 60; 

export const rateLimiter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // If Redis isn't connected yet, just pass the request through (fail open)
  if (!redisClient.isOpen) {
    return next();
  }

  try {
    // Identify the user by their IP address
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const redisKey = `rate_limit:${ip}`;

    // INCR atomically increments the count. If the key doesn't exist, it creates it starting at 1.
    const currentCount = await redisClient.incr(redisKey);

    if (currentCount === 1) {
      // If this is the very first request, set the countdown timer for the 15-minute window
      await redisClient.expire(redisKey, WINDOW_SECONDS);
    }

    if (currentCount > MAX_REQUESTS) {
      // Block the request if they exceeded the limit
      res.status(429).json({
        status: 429,
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests from this IP. Please try again later.'
      });
      return; // Stop the request from going to the controllers
    }

    // Attach remaining limit info to headers (Industry best practice)
    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - currentCount));

    next();
  } catch (error) {
    console.error('Rate Limiter Error:', error);
    next(); // If Redis crashes, fail open so the API doesn't go completely down
  }
};
