import request from "supertest";
import { afterAll, describe, expect, test, vi } from 'vitest';
import { testUser } from '../lib/const.js';
import app from "../server.js";

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

describe("Authentication", () => {
  afterAll(async () => {
    // Allow graceful shutdown
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  describe("Valid Authentication", () => {
    test("accepts valid Bearer token", async () => {
      const response = await request(app)
        .get("/api/2025-06/convert?from=BTC&to=USD&amount=1")
        .set("Authorization", "Bearer 550e8400-e29b-41d4-a716-446655440000");

      expect(response.status).not.toBe(401);
    });
  });

  describe("Invalid Authentication", () => {
    test("rejects missing Authorization header", async () => {
      const response = await request(app).get(
        "/api/2025-06/convert?from=BTC&to=USD&amount=1"
      );

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("MISSING_AUTHORIZATION");
    });

    test("rejects malformed Bearer token", async () => {
      const response = await request(app)
        .get("/api/2025-06/convert?from=BTC&to=USD&amount=1")
        .set("Authorization", "InvalidFormat test-api-key-12345");

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("INVALID_AUTH_FORMAT");
    });

    test("rejects missing API key", async () => {
      const response = await request(app)
        .get("/api/2025-06/convert?from=BTC&to=USD&amount=1")
        .set("Authorization", "Bearer");

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("INVALID_AUTH_FORMAT");
    });

    test("rejects invalid API key", async () => {
      const response = await request(app)
        .get("/api/2025-06/convert?from=BTC&to=USD&amount=1")
        .set("Authorization", "Bearer invalid-key");

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("INVALID_API_KEY");
    });
  });
});