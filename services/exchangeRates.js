const exchangeRateCache = {
  data: null,
  lastUpdated: null,
  cacheTimeoutMs: 30000 // 30 seconds
};

const getCachedOrFreshRates = async (baseCurrency) => {
  const now = Date.now();
  const cacheExpired = !exchangeRateCache.lastUpdated || 
    (now - exchangeRateCache.lastUpdated) > exchangeRateCache.cacheTimeoutMs;
  
  if (cacheExpired) {
    try {
      const response = await fetch(`https://api.coinbase.com/v2/exchange-rates?currency=${baseCurrency}`);
      
      if (!response.ok) {
        throw new Error(`Coinbase API error: ${response.status} ${response.statusText}`);
      }
      
      const freshData = await response.json();
      
      if (!freshData.data || !freshData.data.rates) {
        throw new Error('Invalid response format from Coinbase API');
      }
      
      exchangeRateCache.data = freshData.data;
      exchangeRateCache.lastUpdated = now;
      
      console.log(`Exchange rates refreshed for ${baseCurrency} at ${new Date(now).toISOString()}`);
      
    } catch (error) {
      console.error('Coinbase API failed, using cached rates:', error);
      
      if (!exchangeRateCache.data) {
        throw new Error('No exchange rate data available');
      }
    }
  }
  
  return {
    rates: exchangeRateCache.data,
    lastUpdated: new Date(exchangeRateCache.lastUpdated).toISOString()
  };
};

const convertCurrency = async (fromCurrency, toCurrency, amount) => {
  const supportedCurrencies = ['USD', 'EUR', 'BTC', 'ETH'];
  
  if (!supportedCurrencies.includes(fromCurrency) || !supportedCurrencies.includes(toCurrency)) {
    throw new Error('Unsupported currency pair');
  }
  
  if (fromCurrency === toCurrency) {
    return {
      convertedAmount: amount,
      exchangeRate: 1.0,
      rateLastUpdated: new Date().toISOString()
    };
  }
  
  const rateData = await getCachedOrFreshRates(fromCurrency);
  const exchangeRate = parseFloat(rateData.rates.rates[toCurrency]);
  
  if (!exchangeRate || isNaN(exchangeRate)) {
    throw new Error(`Exchange rate not available for ${fromCurrency} to ${toCurrency}`);
  }
  
  const convertedAmount = amount * exchangeRate;
  
  return {
    convertedAmount: parseFloat(convertedAmount.toFixed(8)),
    exchangeRate: parseFloat(exchangeRate.toFixed(8)),
    rateLastUpdated: rateData.lastUpdated
  };
};

export { convertCurrency, getCachedOrFreshRates };