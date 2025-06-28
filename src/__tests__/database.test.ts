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

      CREATE TABLE rate_limits (
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        request_count INTEGER DEFAULT 0,
        is_weekend BOOLEAN NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, date),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
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
    test('creates new rate limit record', () => {
      const createStmt = testDb.prepare(`
        INSERT INTO rate_limits (user_id, date, request_count, is_weekend) 
        VALUES (?, ?, 1, ?)
      `);
      
      const result = createStmt.run(testUser.userId, '2024-01-15', 0); // Use 0 instead of false
      
      expect(result.changes).toBe(1);
    });

    test('increments existing rate limit record', () => {
      const incrementStmt = testDb.prepare(`
        UPDATE rate_limits 
        SET request_count = request_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND date = ?
      `);
      
      const result = incrementStmt.run(testUser.userId, '2024-01-15');
      
      expect(result.changes).toBe(1);
    });

    test('retrieves current usage', () => {
      const getUsageStmt = testDb.prepare(`
        SELECT request_count, is_weekend 
        FROM rate_limits 
        WHERE user_id = ? AND date = ?
      `);
      
      const usage = getUsageStmt.get(testUser.userId, '2024-01-15') as any;
      
      expect(usage).toBeDefined();
      expect(usage.request_count).toBe(2); // 1 initial + 1 increment
      expect(usage.is_weekend).toBe(0); // false
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