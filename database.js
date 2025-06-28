import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const databasePath = join(__dirname, 'currency_conversion.db');
const currencyDatabase = new Database(databasePath);

// Only prepare statements after database is initialized
let getCurrentUsageStatement, incrementRequestCountStatement, createNewDayRecordStatement, logRequestStatement, getUserByApiKeyStatement;

const initializeDatabase = () => {
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

    CREATE TABLE IF NOT EXISTS rate_limits (
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      request_count INTEGER DEFAULT 0,
      is_weekend BOOLEAN NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_requests_user_timestamp ON requests(user_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_rate_limits_date ON rate_limits(date);
  `);

  const seedTestUser = currencyDatabase.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, api_key) 
    VALUES (?, ?, ?, ?)
  `);

  seedTestUser.run(
    'dab458d6-8352-42e6-88a1-88acc76b4e43',
    'Test User',
    'test@example.com',
    'test-api-key-12345'
  );

  console.log('Database initialized successfully');

  // Prepare statements after tables are created
  getCurrentUsageStatement = currencyDatabase.prepare(`
    SELECT request_count, is_weekend 
    FROM rate_limits 
    WHERE user_id = ? AND date = ?
  `);

  incrementRequestCountStatement = currencyDatabase.prepare(`
    UPDATE rate_limits 
    SET request_count = request_count + 1, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND date = ?
  `);

  createNewDayRecordStatement = currencyDatabase.prepare(`
    INSERT INTO rate_limits (user_id, date, request_count, is_weekend) 
    VALUES (?, ?, 1, ?)
  `);

  logRequestStatement = currencyDatabase.prepare(`
    INSERT INTO requests (user_id, from_currency, to_currency, amount, converted_amount, exchange_rate, response_body)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  getUserByApiKeyStatement = currencyDatabase.prepare(`
    SELECT id, name, email, is_active FROM users WHERE api_key = ?
  `);
};

const checkAndIncrementRateLimit = currencyDatabase.transaction((authenticatedUserId, currentDateUTC, isWeekendDay) => {
  const dailyRequestLimit = isWeekendDay ? 200 : 100;
  
  const currentUsageRecord = getCurrentUsageStatement.get(authenticatedUserId, currentDateUTC);
  
  if (!currentUsageRecord) {
    createNewDayRecordStatement.run(authenticatedUserId, currentDateUTC, isWeekendDay ? 1 : 0);
    return { allowed: true, currentCount: 1 };
  }
  
  if (currentUsageRecord.request_count >= dailyRequestLimit) {
    throw new Error(`Daily request limit of ${dailyRequestLimit} exceeded`);
  }
  
  incrementRequestCountStatement.run(authenticatedUserId, currentDateUTC);
  return { allowed: true, currentCount: currentUsageRecord.request_count + 1 };
});

export {
  currencyDatabase,
  initializeDatabase,
  checkAndIncrementRateLimit,
  logRequestStatement,
  getUserByApiKeyStatement
};