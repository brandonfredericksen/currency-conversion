import request from "supertest";
import app from "../server.js";

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
