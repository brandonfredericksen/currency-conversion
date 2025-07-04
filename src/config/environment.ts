import '../config/envLoader.js';

export const getPort = (): number => {
  return parseInt(process.env.PORT || '3000');
};

export const getCacheTimeout = (): number => {
  return parseInt(process.env.CACHE_TIMEOUT_MS || '30000');
};

export const getRateLimits = (): { weekday: number; weekend: number } => {
  return {
    weekday: parseInt(process.env.WEEKDAY_RATE_LIMIT || '100'),
    weekend: parseInt(process.env.WEEKEND_RATE_LIMIT || '200')
  };
};