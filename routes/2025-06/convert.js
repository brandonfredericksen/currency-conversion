import { convertCurrency } from '../../services/exchangeRates.js';
import { getSupportedCurrencies } from '../../config/environment.js';

const convertRoute = async (req, res) => {
  try {
    const { from, to, amount } = req.query;

    if (!from || !to || !amount) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PARAMETERS",
          message: "Missing required parameters: from, to, amount",
        },
      });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_AMOUNT",
          message: "Amount must be a positive number",
        },
      });
    }

    const fromCurrency = from.toUpperCase();
    const toCurrency = to.toUpperCase();

    const conversionResult = await convertCurrency(
      fromCurrency,
      toCurrency,
      numericAmount
    );

    res.json({
      success: true,
      data: {
        from: fromCurrency,
        to: toCurrency,
        amount: numericAmount,
        converted_amount: conversionResult.convertedAmount,
        exchange_rate: conversionResult.exchangeRate,
        timestamp: new Date().toISOString(),
        rate_last_updated: conversionResult.rateLastUpdated,
      },
    });
  } catch (error) {
    console.error("Conversion error:", error);

    if (error.message.includes("Unsupported currency")) {
      return res.status(400).json({
        success: false,
        error: {
          code: "UNSUPPORTED_CURRENCY",
          message: `Supported currencies: ${getSupportedCurrencies().join(', ')}`,
        },
      });
    }

    if (
      error.message.includes("Exchange rate not available") ||
      error.message.includes("No exchange rate data")
    ) {
      return res.status(503).json({
        success: false,
        error: {
          code: "EXCHANGE_RATE_UNAVAILABLE",
          message: "Exchange rate service temporarily unavailable",
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    });
  }
};

export { convertRoute };