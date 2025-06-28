import { Response, NextFunction } from "express";
import { logRequestStatement } from "../database.js";
import { RateLimitedRequest, ConversionResponse } from "../types/index.js";

export const requestLoggerMiddleware = (req: RateLimitedRequest, res: Response, next: NextFunction): void => {
  const originalSend = res.send;

  res.send = function (responseBody: any): Response {
    try {
      if (!req.authenticatedUser) {
        console.log("Request logging skipped: No authenticated user");
        return originalSend.call(this, responseBody);
      }

      const authenticatedUserId = req.authenticatedUser.id;
      const { from, to, amount } = req.query;

      let parsedResponse: ConversionResponse;
      try {
        parsedResponse =
          typeof responseBody === "string"
            ? JSON.parse(responseBody)
            : responseBody;
      } catch (error) {
        parsedResponse = { success: false, response: responseBody } as any;
      }

      if (parsedResponse.success && parsedResponse.data) {
        const conversionData = parsedResponse.data;

        logRequestStatement.run(
          authenticatedUserId,
          conversionData.from,
          conversionData.to,
          conversionData.amount,
          conversionData.converted_amount,
          conversionData.exchange_rate,
          JSON.stringify(parsedResponse)
        );

        console.log(
          `Request logged: ${authenticatedUserId} - ${from} to ${to}, amount: ${amount}`
        );
      } else {
        console.log(
          `Failed request not logged: ${authenticatedUserId} - ${res.statusCode}`
        );
      }
    } catch (error) {
      console.error("Request logging error:", error);
    }

    return originalSend.call(this, responseBody);
  };

  next();
};