# Currency Conversion Service

A service for converting between fiat and cryptocurrency pairs. Built with Express, featuring real-time exchange rates, user authentication, rate limiting, and request logging.

## Features

- **Real-time currency conversion**
- **User authentication**
- **Rate limiting**
- **Request logging**
- **Exchange rate caching**

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/brandonfredericksen/currency-conversion
cd currency-conversion

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Running the Service

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start

# Run tests
npm test
```

The service will start on port 3000 by default.

### API Usage

```bash
# Make a currency conversion request
curl -H "Authorization: Bearer 550e8400-e29b-41d4-a716-446655440000" \
  "http://localhost:3000/api/2025-06/convert?from=BTC&to=USD&amount=0.1"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "from": "BTC",
    "to": "USD",
    "amount": 0.1,
    "converted_amount": 4260.00,
    "exchange_rate": 42600.00,
    "timestamp": "2025-06-28T12:30:00Z",
    "rate_last_updated": "2025-06-28T12:29:45Z"
  }
}
```

### Environment Configuration

Create a `.env` file (see `.env.example`):

```bash
PORT=3000
SUPPORTED_CURRENCIES=USD,EUR,BTC,ETH
CACHE_TIMEOUT_MS=30000
WEEKDAY_RATE_LIMIT=100
WEEKEND_RATE_LIMIT=200
```

### Available API Keys

For testing purposes, the following API keys are pre-seeded:

- **Test User:** `550e8400-e29b-41d4-a716-446655440000`
- **Trunk Tools:** `dab458d6-8352-42e6-88a1-88acc76b4e43`

## Architecture Decisions

When building this currency conversion service, I made several key decisions that shaped the final implementation. Here's my thinking behind each choice:

### Database: SQLite with better-sqlite3

I chose SQLite over PostgreSQL or MongoDB for several reasons:
- **Zero setup overhead** - No database server to manage or configure
- **Single file deployment** - Simplifies production deployment significantly

The `better-sqlite3` library provides synchronous operations in clean syntax, for rate limiting.

### API Versioning: Date-based folders

```
routes/
└── <VERSION>/
    └── convert.js
```

- **Backward compatibility** - Multiple versions can coexist seamlessly

### Rate Limiting: Database-backed with transactions

I implemented rate limiting in the database rather than using Redis or in-memory storage:
- **Consistency** - Survives server restarts
- **Simplicity** - One less service to deploy and manage
- **Perfect for scale** - Handles concurrent requests correctly

### Exchange Rate Caching: in-memory cache

I implemented a simple in-memory cache with fallback logic:
- **Reduces API calls** - Coinbase API requests could cost money some day
- **Resilience** - Falls back to cached data if API fails
- **Transparency** - Returns `rate_last_updated` timestamp

### Middleware Architecture: Layered responsibility

I structured the middleware stack with clear separation of concerns:
```
Authentication → Rate Limiting → Request Logging → Business Logic
```