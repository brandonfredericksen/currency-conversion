import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { describe, beforeAll, afterAll, test, expect } from 'vitest';
import { testUser } from '../lib/const.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Database Operations', () => {
  let testDb: Database.Database;
  
  beforeAll(() => {
    // Create in-memory test database
    testDb = new Database(':memory:');
    
    // Initialize schema
    testDb.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        api_key TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1
      );

      CREATE TABLE requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        from_currency TEXT NOT NULL,
        to_currency TEXT NOT NULL,
        amount REAL NOT NULL,
        converted_amount REAL NOT NULL,
        exchange_rate REAL NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        response_body TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_requests_user_timestamp ON requests(user_id, timestamp);
    `);
    
    // Seed test user
    testDb.prepare(`
      INSERT INTO users (id, name, email, api_key) 
      VALUES (?, ?, ?, ?)
    `).run(testUser.userId, testUser.name, testUser.email, testUser.apiKey);
  });
  
  afterAll(() => {
    testDb.close();
  });

  describe('User Operations', () => {
    test('retrieves user by API key', () => {
      const getUserStmt = testDb.prepare('SELECT * FROM users WHERE api_key = ?');
      const user = getUserStmt.get(testUser.apiKey) as any;
      
      expect(user).toBeDefined();
      expect(user.id).toBe(testUser.userId);
      expect(user.name).toBe(testUser.name);
      expect(user.is_active).toBe(1);
    });

    test('returns null for invalid API key', () => {
      const getUserStmt = testDb.prepare('SELECT * FROM users WHERE api_key = ?');
      const user = getUserStmt.get('invalid-key');
      
      expect(user).toBeUndefined();
    });
  });

  describe('Request Logging', () => {
    test('logs request successfully', () => {
      const logStmt = testDb.prepare(`
        INSERT INTO requests (user_id, from_currency, to_currency, amount, converted_amount, exchange_rate, response_body)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = logStmt.run(
        testUser.userId,
        'BTC',
        'USD',
        0.1,
        4260.00,
        42600.00,
        JSON.stringify({ success: true, data: {} })
      );
      
      expect(result.lastInsertRowid).toBeDefined();
      expect(result.changes).toBe(1);
    });

    test('retrieves logged requests', () => {
      const getRequestsStmt = testDb.prepare('SELECT * FROM requests WHERE user_id = ?');
      const requests = getRequestsStmt.all(testUser.userId) as any[];
      
      expect(requests.length).toBeGreaterThan(0);
      expect(requests[0]).toHaveProperty('from_currency');
      expect(requests[0]).toHaveProperty('to_currency');
      expect(requests[0]).toHaveProperty('amount');
      expect(requests[0]).toHaveProperty('response_body');
    });
  });

  describe('Rate Limiting', () => {
    test('counts requests for rate limiting', () => {
      // Insert two requests for the same day
      const logStmt = testDb.prepare(`
        INSERT INTO requests (user_id, from_currency, to_currency, amount, converted_amount, exchange_rate, response_body, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const date = '2024-01-15';
      logStmt.run(testUser.userId, 'BTC', 'USD', 0.1, 4260.00, 42600.00, JSON.stringify({ success: true }), `${date}T10:00:00.000Z`);
      logStmt.run(testUser.userId, 'BTC', 'USD', 0.2, 8520.00, 42600.00, JSON.stringify({ success: true }), `${date}T12:00:00.000Z`);

      // Count requests for that day
      const countStmt = testDb.prepare('SELECT COUNT(*) as request_count FROM requests WHERE user_id = ? AND DATE(timestamp) = ?');
      const result = countStmt.get(testUser.userId, date) as any;
      expect(result.request_count).toBe(2);
    });
  });

  describe('Foreign Key Constraints', () => {
    test('enforces foreign key on requests table', () => {
      const logStmt = testDb.prepare(`
        INSERT INTO requests (user_id, from_currency, to_currency, amount, converted_amount, exchange_rate, response_body)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      expect(() => {
        logStmt.run(
          'nonexistent-user',
          'BTC',
          'USD',
          0.1,
          4260.00,
          42600.00,
          JSON.stringify({ success: true })
        );
      }).toThrow();
    });
  });
});