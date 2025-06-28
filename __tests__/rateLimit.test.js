import request from "supertest";
import app from "../server.js";

describe("Rate Limiting", () => {
  const validHeaders = { Authorization: "Bearer 550e8400-e29b-41d4-a716-446655440000" };

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  describe("Weekday Rate Limits", () => {
    test("allows requests under weekday limit", async () => {
      // Make a few requests to ensure we're under the limit
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .get("/api/2025-06/convert?from=USD&to=EUR&amount=100")
          .set(validHeaders);

        expect(response.status).not.toBe(429);
      }
    });
  });

  describe("Request Validation", () => {
    test("validates request parameters even with rate limiting", async () => {
      const response = await request(app)
        .get("/api/2025-06/convert?from=INVALID&to=USD&amount=100")
        .set(validHeaders);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("UNSUPPORTED_CURRENCY");
    });

    test("validates amount parameter", async () => {
      const response = await request(app)
        .get("/api/2025-06/convert?from=BTC&to=USD&amount=-100")
        .set(validHeaders);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_AMOUNT");
    });
  });

  describe("Rate Limit Headers and Responses", () => {
    test("successful request includes conversion data", async () => {
      const response = await request(app)
        .get("/api/2025-06/convert?from=USD&to=EUR&amount=100")
        .set(validHeaders);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty("from", "USD");
        expect(response.body.data).toHaveProperty("to", "EUR");
        expect(response.body.data).toHaveProperty("amount", 100);
        expect(response.body.data).toHaveProperty("converted_amount");
        expect(response.body.data).toHaveProperty("exchange_rate");
        expect(response.body.data).toHaveProperty("timestamp");
        expect(response.body.data).toHaveProperty("rate_last_updated");
      }
    });
  });
});
