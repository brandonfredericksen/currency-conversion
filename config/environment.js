const getSupportedCurrencies = () => {
  const envCurrencies = process.env.SUPPORTED_CURRENCIES;
  if (envCurrencies) {
    return envCurrencies.split(',').map(currency => currency.trim().toUpperCase());
  }
  return ['USD', 'EUR', 'BTC', 'ETH']; // Default fallback
};

const getPort = () => {
  return parseInt(process.env.PORT) || 3000;
};

const getCacheTimeout = () => {
  return parseInt(process.env.CACHE_TIMEOUT_MS) || 30000;
};

const getRateLimits = () => {
  return {
    weekday: parseInt(process.env.WEEKDAY_RATE_LIMIT) || 100,
    weekend: parseInt(process.env.WEEKEND_RATE_LIMIT) || 200
  };
};

export {
  getSupportedCurrencies,
  getPort,
  getCacheTimeout,
  getRateLimits
};