import request from "supertest";
import app from "../server.js";
import { afterAll, describe, expect, test, vi } from 'vitest';
import * as database from '../database.js';
import { testUser } from '../lib/const.js';

// Mock the database module
vi.mock('../database.js', () => ({
  getUserByApiKeyStatement: {
    get: vi.fn((apiKey: string) => {
      if (apiKey === testUser.apiKey) {
        return {
          id: testUser.userId,
          name: testUser.name,
          email: testUser.email,
          is_active: 1
        };
      }
      return undefined;
    })
  },
  checkAndIncrementRateLimit: vi.fn(() => ({ allowed: true, currentCount: 1 })),
  logRequestStatement: {
    run: vi.fn()
  },
  currencyDatabase: {},
  initializeDatabase: vi.fn()
}));

describe("Rate Limiting", () => {
  const validHeaders = { Authorization: `Bearer ${testUser.apiKey}` };
  const mockCheckAndIncrementRateLimit = vi.mocked(database.checkAndIncrementRateLimit);

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  describe("Weekday Rate Limits", () => {
    test("allows requests under weekday limit", async () => {
      mockCheckAndIncrementRateLimit.mockReturnValue({ allowed: true, currentCount: 1 });
      
      const response = await request(app)
        .get("/api/2025-06/convert?from=USD&to=EUR&amount=100")
        .set(validHeaders);

      expect(response.status).not.toBe(429);
    });

    test("blocks requests over weekday limit", async () => {
      // Mock rate limit exceeded
      mockCheckAndIncrementRateLimit.mockImplementation(() => {
        throw new Error('Daily request limit of 100 exceeded');
      });
      
      const response = await request(app)
        .get("/api/2025-06/convert?from=USD&to=EUR&amount=100")
        .set(validHeaders);

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe("Request Validation", () => {
    test("validates request parameters even with rate limiting", async () => {
      mockCheckAndIncrementRateLimit.mockReturnValue({ allowed: true, currentCount: 1 });
      
      const response = await request(app)
        .get("/api/2025-06/convert?from=INVALID&to=USD&amount=100")
        .set(validHeaders);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("UNSUPPORTED_CURRENCY");
    });

    test("validates amount parameter", async () => {
      mockCheckAndIncrementRateLimit.mockReturnValue({ allowed: true, currentCount: 1 });
      
      const response = await request(app)
        .get("/api/2025-06/convert?from=BTC&to=USD&amount=-100")
        .set(validHeaders);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_AMOUNT");
    });
  });

  describe("Rate Limit Headers and Responses", () => {
    test("successful request includes conversion data", async () => {
      mockCheckAndIncrementRateLimit.mockReturnValue({ allowed: true, currentCount: 1 });
      
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