# PROJECT CONTEXT: Hybrid Crypto Trading Bot (Local Development Phase)

## 1. System Architecture
- **Environment**: LOCALHOST ONLY (No deployment/Docker/Nginx required yet).
- **Backend**: NestJS (Main logic, API, Scheduler) running on HTTP.
- **Database**: Local MongoDB (Time Series for candles + Regular collections for trades).
- **Caching**: In-memory (`cache-manager` + `@nestjs/cache-manager`) - No Redis needed for MVP.
- **AI**: Gemini AI (Primary) / OpenAI (Backup) - JSON-only responses, strict timeout.
- **Frontend**: React + Vite + ShadcnUI (Dashboard) running locally.
- **Security**: AES-256-CBC encryption for sensitive keys.

## 2. Enhanced Core Workflow
1. **Trigger**: Cron job (H4: 0 */4 * * *, H1: 0 * * * *)
2. **Data**: Fetch OHLCV → Save to Local Mongo Time Series → Index optimization
3. **Hard Filter**: 
   - Indicators: RSI(14), MACD(12,26,9), Volume MA(20)
   - Logic: Strict technical rules to filter noise before calling AI
   - **Criteria (Strict)**:
     - RSI between 30-70 (Neutral zone, ready for breakout)
     - Volume Ratio (Current Volume / Volume MA20) ≥ 1.2 (Significant volume spike)
     - Price Change Body Size (`Abs(Close - Open) / Open`) ≥ 0.5% (Avoid Doji/Sideway)
   - Purpose: Reduce API calls and improve signal quality
4. **AI Validation**: 
   - Provider: Google Gemini AI (Primary) / OpenAI GPT (Backup)
   - Payload: 20 latest candles + 3 calculated indicators + market context
   - Output Requirement: JSON `{action: "BUY"|"SELL"|"WAIT", confidence: 0-100, ...}`
   - Decision Rule: Only trade if action="BUY" AND confidence ≥ 80%
   - Fallback: Returns "WAIT" if AI service unavailable or API errors
5. **Execution**: 
   - Paper Mode: Validate position limits → Calculate Size → Simulate Order
   - Live Mode (Future): Decrypt keys → Place Order via CCXT
6. **Monitoring**: TP/SL cron (1 min), health checks logged to console/file.

## 3. Environment Variables Structure
# Environment Setup
NODE_ENV=development
PORT=3001
HOST=localhost

# Security
MASTER_ENCRYPTION_KEY=12345678901234567890123456789012

# Core Services  
MONGODB_URI=mongodb://localhost:27017/crypto_bot

# APIs
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
EXCHANGE_ID=binance
EXCHANGE_API_KEY=encrypted_api_key_placeholder
EXCHANGE_SECRET=encrypted_secret_placeholder

# Trading Config
TRADING_MODE=PAPER
MAX_POSITIONS=3
RISK_PER_TRADE=0.02

# Performance & Logs
RATE_LIMIT_PER_MINUTE=60
LOG_LEVEL=debug

## 4. Tech Stack Constraints
- **Code Quality (Strict)**: MANDATORY execution of `npm run lint` and `npm run format` before running any tests. Code must be clean before testing.
- **Execution**: Optimize for `npm run start:dev` (Hot-reload). Do not use production build commands.
- **Networking**: Use standard HTTP. Skip SSL/HTTPS configurations.
- **TypeScript**: Strict mode enabled, no `any`, interfaces for all DTOs.
- **Mongoose**: Use schema validation, handle connection errors gracefully.
- **NestJS**: Use standard `@nestjs/schedule` and `@nestjs/axios`.
- **Error Handling**: Implement Exponential Backoff for API calls (retry 3 times).
- **Security**: Input validation (DTOs), keys must be encrypted at rest.
- **Logging**: Use structured JSON logging (Winston or NestJS built-in) printed to stdout.

## 5. AI Integration Details

### Gemini AI Configuration
- **SDK**: `@google/generative-ai` 
- **Model**: `gemini-2.5-flash` (Optimized for speed & cost)
- **Config**: Enable `{ responseMimeType: "application/json" }` for reliable parsing.
- **Timeout**: 10 seconds with retry logic
- **Temperature**: 0.3 (Low creativity, high consistency)
- **Max Tokens**: 500

### AI Response Format (Strict Contract)
```json
{
  "action": "BUY" | "SELL" | "WAIT",
  "confidence": 0-100,
  "reason": "Detailed market analysis under 50 words",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "suggestedStopLoss": 45000.00,     // Optional
  "suggestedTakeProfit": 52000.00    // Optional
}
```

### Error Handling
- **API Unavailable**: Returns `WAIT` action with 0 confidence
- **Invalid Response**: Graceful fallback to safe default
- **Network Errors**: Exponential backoff retry (3 attempts)
- **Rate Limiting**: Built-in request queuing and delays