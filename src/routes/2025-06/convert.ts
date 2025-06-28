import { Response } from 'express';
import { convertCurrency } from '../../services/exchangeRates.js';
import { getSupportedCurrencies } from '../../config/environment.js';
import { RateLimitedRequest, SupportedCurrency } from '../../types/index.js';

export const convertRoute = async (req: RateLimitedRequest, res: Response): Promise<void> => {
  try {
    const { from, to, amount } = req.query;

    if (!from || !to || !amount) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PARAMETERS",
          message: "Missing required parameters: from, to, amount",
        },
      });
      return;
    }

    const numericAmount = parseFloat(amount as string);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_AMOUNT",
          message: "Amount must be a positive number",
        },
      });
      return;
    }

    const fromCurrency = (from as string).toUpperCase() as SupportedCurrency;
    const toCurrency = (to as string).toUpperCase() as SupportedCurrency;

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

    if (error instanceof Error && error.message.includes("Unsupported currency")) {
      res.status(400).json({
        success: false,
        error: {
          code: "UNSUPPORTED_CURRENCY",
          message: `Supported currencies: ${getSupportedCurrencies().join(', ')}`,
        },
      });
      return;
    }

    if (
      error instanceof Error && (
        error.message.includes("Exchange rate not available") ||
        error.message.includes("No exchange rate data")
      )
    ) {
      res.status(503).json({
        success: false,
        error: {
          code: "EXCHANGE_RATE_UNAVAILABLE",
          message: "Exchange rate service temporarily unavailable",
        },
      });
      return;
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