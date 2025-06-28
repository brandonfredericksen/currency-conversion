import { Response, NextFunction } from 'express';
import { checkAndIncrementRateLimit } from '../database.js';
import { getRateLimits } from '../config/environment.js';
import { RateLimitedRequest } from '../types/index.js';

export const rateLimitMiddleware = (req: RateLimitedRequest, res: Response, next: NextFunction): void => {
  try {
    if (!req.authenticatedUser) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required for rate limiting'
        }
      });
      return;
    }

    const authenticatedUserId = req.authenticatedUser.id;
    const currentDateUTC = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const currentDay = new Date().getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const isWeekendDay = currentDay === 0 || currentDay === 6; // Sunday or Saturday

    const rateLimitResult = checkAndIncrementRateLimit(authenticatedUserId, currentDateUTC, isWeekendDay);

    const rateLimits = getRateLimits();
    const dailyLimit = isWeekendDay ? rateLimits.weekend : rateLimits.weekday;

    req.rateLimitInfo = {
      currentCount: rateLimitResult.currentCount,
      dailyLimit: dailyLimit,
      isWeekend: isWeekendDay
    };

    next();

  } catch (error) {
    if (error instanceof Error && error.message.includes('Daily request limit')) {
      const currentDay = new Date().getDay();
      const isWeekendDay = currentDay === 0 || currentDay === 6;
      const rateLimits = getRateLimits();
      const dailyLimit = isWeekendDay ? rateLimits.weekend : rateLimits.weekday;

      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Daily request limit of ${dailyLimit} exceeded. Try again tomorrow.`
        }
      });
      return;
    }

    console.error('Rate limiting error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_ERROR',
        message: 'Internal rate limiting error'
      }
    });
  }
};