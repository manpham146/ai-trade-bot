# Crypto Trading Backend

Backend API for a hybrid crypto trading bot built with NestJS. Implements market data ingestion, strict technical analysis (Hard Filter), and AI validation (Gemini priority).

## Prerequisites
- Node.js 18+
- Local MongoDB running at `mongodb://localhost:27017/crypto_bot`

## Setup
1. Install dependencies:
   - `npm install`
2. Configure environment:
   - Copy `.env.example` to `.env`
   - Fill `GEMINI_API_KEY` and set `GEMINI_MODEL` (recommended `gemini-2.5-flash`)
3. Build:
   - `npm run build`

## Run
- Development (recommended): `npm run start:dev`
- Production: `npm run start:prod`

Default port: `3001` (configurable via `PORT`)

## Key Endpoints
- Health:
  - `GET /health` — app health
  - `GET /market-data/health/exchange` — Binance connection status
  - `GET /market-data/health/ai` — Gemini AI connectivity check
- Market Data:
  - `GET /market-data/exchange-info` — exchange capabilities (symbols/timeframes)
  - `POST /market-data/sync` — manual sync (`symbols`, `timeframes`, `limit`)
  - `GET /market-data/stats` — orchestrator status and latest stats
  - `GET /market-data/candles` — fetch candles by `symbol`, `timeframe`, optional `limit`

## Phases Overview
- Phase 3: Technical Analysis (Hard Filter)
  - RSI(14), MACD(12,26,9), Volume MA(20)
  - BUY if: RSI<30 and MACD histogram>0 and Volume Ratio≥1.2 and Price Body≥0.5%
  - SELL if: RSI>70 and MACD histogram<0; else NEUTRAL
  - Implemented in `TechnicalAnalysisService`

- Phase 4: AI Integration (Gemini)
  - `AiService.validateSignal(symbol, analysisResult)`
  - Prompt demands STRICT JSON (`action`, `confidence`, `reason`, `riskLevel`)
  - SDK first; REST fallback if needed (v1beta `models/<model>:generateContent`)
  - Only invoked when Phase 3 returns non-NEUTRAL; decision is logged

## Testing & Linting
- Lint: `npm run lint`
- Unit tests: `npm run test`

## Env Highlights
- `GEMINI_API_KEY` — required for AI
- `GEMINI_MODEL` — recommended `gemini-2.5-flash`
- `EXCHANGE_ID` — `binance`
- Trading mode defaults to `PAPER`

## Notes
- Logs are structured JSON via Winston
- Rate limiting and retry with exponential backoff for external calls

A secure NestJS backend for crypto trading applications with MongoDB and AES-256-CBC encryption.

## Phase 1: Infrastructure & Security ✅

### Features Implemented

1. **Standard NestJS Project Structure**
   - TypeScript configuration
   - Proper module organization
   - Development and production scripts

2. **Docker Infrastructure**
   - MongoDB (mongo:7)
   - Mongo Express (port 8081)
   - Docker Compose configuration

3. **Database Module**
   - Mongoose integration
   - Connection configuration via MONGODB_URI
   - Automatic connection handling with logging

4. **Security Module**
   - CryptoService with AES-256-CBC encryption
   - `encrypt(text)` and `decrypt(text)` methods
   - Master key validation on startup
   - Secure key generation utility

5. **Structured Logging Module**
   - Winston-based JSON logging to stdout
   - Configurable log levels (debug, info, warn, error)
   - Structured metadata for all log entries
   - HTTP request/response logging
   - Database operation logging
   - Trading decision logging
   - Application error logging

6. **Application Module**
   - ConfigModule for environment variables
   - DatabaseModule integration
   - SecurityModule integration
   - LoggingModule integration
   - Health check endpoint

## Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*
LOG_LEVEL=info

# MongoDB Configuration
MONGODB_URI=mongodb://admin:admin123@localhost:27017/crypto_bot?authSource=admin

# Security Configuration
MASTER_ENCRYPTION_KEY=your-32-character-encryption-key-here

# JWT Configuration (for future use)
JWT_SECRET=your-jwt-secret-key-here
JWT_EXPIRATION=7d
```

## Quick Start

1. **Start MongoDB and Mongo Express:**
   ```bash
   docker-compose up -d
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the application:**
   ```bash
   npm run start:dev
   ```

5. **Access Mongo Express:**
   - URL: http://localhost:8081
   - Username: admin
   - Password: admin123

## Security Notes

- **CRITICAL**: The `MASTER_ENCRYPTION_KEY` must be exactly 32 characters for AES-256 encryption
- The CryptoService will throw an error on startup if the master key is missing or invalid
- All sensitive data should be encrypted using the CryptoService before storage
- Use the `CryptoService.generateSecureKey()` method to generate a secure encryption key

## Structured Logging Features

The application implements comprehensive structured JSON logging:

### Log Levels
- `debug`: Detailed debugging information
- `info`: General application information
- `warn`: Warning messages
- `error`: Error messages with stack traces

### Log Types
- **HTTP Requests**: Method, URL, status code, duration, IP, user agent
- **Database Operations**: Operation type, collection, duration, query details
- **Trading Decisions**: Action, symbol, price, confidence, strategy
- **Application Errors**: Error messages, stack traces, context
- **General Events**: Custom events with structured metadata

### Example Log Output
```json
{
  "context": "DatabaseConnection",
  "environment": "development",
  "level": "info",
  "message": "MongoDB connected successfully",
  "service": "crypto-trading-backend",
  "timestamp": "2025-11-22T07:29:04.354Z",
  "host": "localhost",
  "port": 27017
}
```

## API Endpoints

- `GET /` - Welcome message
- `GET /health` - Health check with environment info

## Next Steps

Phase 1 is complete! The infrastructure is ready for:
- User authentication implementation
- Trading logic development
- API security enhancements
- Database schema design

## License

ISC
