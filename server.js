import express from "express";
import cors from "cors";
import helmet from "helmet";
import { initializeDatabase } from "./database.js";
import { authenticateUser } from "./middleware/auth.js";
import { rateLimitMiddleware } from "./middleware/rateLimit.js";
import { requestLoggerMiddleware } from "./middleware/requestLogger.js";
import { convertCurrency } from "./services/exchangeRates.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

initializeDatabase();

app.get(
  "/api/v1/convert",
  authenticateUser,
  rateLimitMiddleware,
  requestLoggerMiddleware,
  async (req, res) => {
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
            message: "Supported currencies: USD, EUR, BTC, ETH",
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
  }
);

app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Currency conversion service running on port ${PORT}`);
});

export default app;
