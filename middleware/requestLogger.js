import { logRequestStatement } from "../database.js";

const requestLoggerMiddleware = (req, res, next) => {
  const originalSend = res.send;

  res.send = function (responseBody) {
    try {
      const authenticatedUserId = req.authenticatedUser.id;
      const { from, to, amount } = req.query;

      let parsedResponse;
      try {
        parsedResponse =
          typeof responseBody === "string"
            ? JSON.parse(responseBody)
            : responseBody;
      } catch (error) {
        parsedResponse = { response: responseBody };
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

export { requestLoggerMiddleware };
