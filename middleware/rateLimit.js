import { checkAndIncrementRateLimit } from '../database.js';

const rateLimitMiddleware = (req, res, next) => {
  try {
    const authenticatedUserId = req.authenticatedUser.id;
    const currentDateUTC = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const currentDay = new Date().getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const isWeekendDay = currentDay === 0 || currentDay === 6; // Sunday or Saturday

    const rateLimitResult = checkAndIncrementRateLimit(authenticatedUserId, currentDateUTC, isWeekendDay);

    req.rateLimitInfo = {
      currentCount: rateLimitResult.currentCount,
      dailyLimit: isWeekendDay ? 200 : 100,
      isWeekend: isWeekendDay
    };

    next();

  } catch (error) {
    if (error.message.includes('Daily request limit')) {
      const currentDay = new Date().getDay();
      const isWeekendDay = currentDay === 0 || currentDay === 6;
      const dailyLimit = isWeekendDay ? 200 : 100;

      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Daily request limit of ${dailyLimit} exceeded. Try again tomorrow.`
        }
      });
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

export { rateLimitMiddleware };