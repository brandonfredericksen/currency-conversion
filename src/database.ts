import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { getRateLimits } from './config/environment.js';
import { RateLimitResult } from './types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const databasePath = join(__dirname, "../currency_conversion.db");
const currencyDatabase: Database.Database = new Database(databasePath);

// Type definitions for prepared statements
type LogRequestStatement = Database.Statement<[
  string, string, string, number, number, number, string
]>;
type GetUserByApiKeyStatement = Database.Statement<[string]>;

let logRequestStatement: LogRequestStatement;
let getUserByApiKeyStatement: GetUserByApiKeyStatement;

export const initializeDatabase = (): void => {
  currencyDatabase.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      api_key TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS requests (
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

  const seedUser = currencyDatabase.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, api_key) 
    VALUES (?, ?, ?, ?)
  `);

  seedUser.run(
    "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "Trunk Tools",
    "api@trunktools.com",
    "dab458d6-8352-42e6-88a1-88acc76b4e43"
  );

  seedUser.run(
    "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "Test User",
    "test@example.com",
    "550e8400-e29b-41d4-a716-446655440000"
  );

  console.log("Database initialized successfully");

  logRequestStatement = currencyDatabase.prepare(`
    INSERT INTO requests (user_id, from_currency, to_currency, amount, converted_amount, exchange_rate, response_body)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `) as LogRequestStatement;

  getUserByApiKeyStatement = currencyDatabase.prepare(`
    SELECT id, name, email, is_active FROM users WHERE api_key = ?
  `) as GetUserByApiKeyStatement;
};

export const checkAndIncrementRateLimit = currencyDatabase.transaction(
  (authenticatedUserId: string, currentDateUTC: string, isWeekendDay: boolean): RateLimitResult => {
    const rateLimits = getRateLimits();
    const dailyRequestLimit = isWeekendDay ? rateLimits.weekend : rateLimits.weekday;

    // Count requests for this user and date
    const countStmt = currencyDatabase.prepare(`
      SELECT COUNT(*) as request_count FROM requests WHERE user_id = ? AND DATE(timestamp) = ?
    `);
    const result = countStmt.get(authenticatedUserId, currentDateUTC) as { request_count: number };
    const currentCount = result ? result.request_count : 0;
      
    if (currentCount >= dailyRequestLimit) {
      throw new Error(`Daily request limit of ${dailyRequestLimit} exceeded`);
    }

    // Allow request, increment will happen when request is logged
    return {
      allowed: true,
      currentCount: currentCount + 1,
    };
  }
);

export {
  currencyDatabase,
  logRequestStatement,
  getUserByApiKeyStatement,
};