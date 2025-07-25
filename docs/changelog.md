# Changelog

Tất cả các thay đổi quan trọng của dự án AI Trading Bot sẽ được ghi lại trong file này.

## [2.0.0] - 2025-01-25

### ✨ Tính năng mới

#### 🌐 Web Dashboard
- Thêm giao diện web trực quan để theo dõi bot
- Dashboard real-time hiển thị thống kê giao dịch
- Điều khiển bot từ xa (start/stop/emergency stop)
- Theo dõi dự đoán AI và tín hiệu kỹ thuật
- Lịch sử giao dịch với biểu đồ P&L
- Responsive design cho mobile và desktop

#### 🔄 Backtest Engine
- Module kiểm thử chiến lược trên dữ liệu lịch sử
- Tính toán các metrics hiệu suất (ROI, Sharpe ratio, Win rate)
- Báo cáo chi tiết với thống kê giao dịch
- Hỗ trợ nhiều khung thời gian
- Simulation engine chính xác

#### 🏥 Health Check System
- Kiểm tra tự động tình trạng hệ thống
- Monitoring API connection, memory, disk space
- Validation biến môi trường và dependencies
- Báo cáo sức khỏe chi tiết
- Cảnh báo và khuyến nghị tự động

#### 📝 Code Quality
- Tích hợp ESLint với rules tùy chỉnh
- Prettier configuration cho code formatting
- Improved error handling và logging
- Better code structure và documentation

### 🔧 Cải tiến

#### 📊 Enhanced Data Management
- Lưu trữ dữ liệu giao dịch persistent
- Cache dự đoán AI và market data
- Backup và restore bot state
- Data retention policies

#### 🚀 Performance Optimization
- Cải thiện memory usage
- Optimized API calls
- Better error recovery
- Reduced latency

#### 🔒 Security Enhancements
- Improved API key management
- Rate limiting protection
- Input validation
- Secure data storage

### 📦 Dependencies

#### Thêm mới
- `express`: ^4.18.2 - Web server cho dashboard
- `cors`: ^2.8.5 - CORS middleware
- `helmet`: ^7.1.0 - Security middleware
- `compression`: ^1.7.4 - Response compression
- `winston`: ^3.11.0 - Advanced logging
- `node-cache`: ^5.1.2 - In-memory caching
- `uuid`: ^9.0.1 - UUID generation
- `eslint`: ^8.56.0 - Code linting
- `prettier`: ^3.1.1 - Code formatting

#### Cập nhật
- `ccxt`: ^4.1.0 → ^4.2.0
- `@tensorflow/tfjs-node`: ^4.10.0 → ^4.15.0
- `axios`: ^1.5.0 → ^1.6.0
- `ws`: ^8.14.0 → ^8.16.0
- `moment`: ^2.29.4 → ^2.30.1
- `node-cron`: ^3.0.2 → ^3.0.3
- `nodemon`: ^3.0.1 → ^3.0.2

### 🛠️ Scripts mới

```json
{
  "web-dashboard": "node src/web/server.js",
  "backtest": "node src/backtest/backtest.js",
  "health-check": "node src/utils/healthCheck.js",
  "lint": "eslint src/",
  "lint:fix": "eslint src/ --fix",
  "format": "prettier --write src/",
  "test:watch": "jest --watch",
  "update-deps": "npm update"
}
```

### 📁 Cấu trúc dự án mới

```
src/
├── web/
│   ├── server.js          # Web dashboard server
│   └── public/
│       └── index.html     # Dashboard UI
├── backtest/
│   └── backtest.js        # Backtest engine
├── utils/
│   ├── Logger.js          # Enhanced logging
│   └── healthCheck.js     # Health check system
data/                      # Data storage
├── trades.json           # Trading history
├── predictions.json      # AI predictions
├── bot_data.json        # Bot state
└── health_report.json   # Health reports
```

### ⚙️ Cấu hình mới

#### .env variables
```bash
WEB_PORT=3000
WEB_DASHBOARD_ENABLED=true
```

#### ESLint & Prettier
- `.eslintrc.js` - ESLint configuration
- `.prettierrc.js` - Prettier configuration

### 🐛 Bug Fixes
- Fixed memory leaks trong AI prediction
- Improved error handling cho API failures
- Better WebSocket connection management
- Fixed timezone issues trong logging

### 📚 Documentation
- Updated README.md với hướng dẫn mới
- Thêm QUICK_START.md guide
- Enhanced code comments
- API documentation cho web endpoints

### 🔄 Migration Guide

#### Từ v1.0.0 lên v2.0.0

1. **Cập nhật dependencies:**
   ```bash
   npm install
   ```

2. **Cập nhật .env file:**
   ```bash
   npm run setup
   # Thêm WEB_PORT=3000 và WEB_DASHBOARD_ENABLED=true
   ```

3. **Chạy health check:**
   ```bash
   npm run health-check
   ```

4. **Test backtest:**
   ```bash
   npm run backtest
   ```

5. **Khởi động dashboard:**
   ```bash
   npm run web-dashboard
   ```

### ⚠️ Breaking Changes

- TradingBot constructor giờ yêu cầu global instance setup
- Data storage format đã thay đổi (tự động migrate)
- Log format mới với enhanced information
- API endpoints mới cho web dashboard

### 🎯 Roadmap v2.1.0

- [ ] Real-time charts trong dashboard
- [ ] Telegram bot integration
- [ ] Multiple exchange support
- [ ] Advanced AI models (Transformer)
- [ ] Portfolio management
- [ ] Paper trading mode
- [ ] Mobile app

---

## [1.0.0] - 2024-12-01

### ✨ Tính năng ban đầu

- 🧠 AI Prediction với LSTM Neural Network
- 📊 Technical Analysis (RSI, MACD, Bollinger Bands)
- ⚡ Real-time trading với Binance API
- 🛡️ Risk Management system
- 📈 Basic performance tracking
- 🔒 API key security

### 📦 Dependencies ban đầu

- `ccxt`: ^4.1.0
- `@tensorflow/tfjs-node`: ^4.10.0
- `dotenv`: ^16.3.1
- `axios`: ^1.5.0
- `ws`: ^8.14.0
- `moment`: ^2.29.4
- `lodash`: ^4.17.21
- `node-cron`: ^3.0.2

### 📁 Cấu trúc ban đầu

```
src/
├── ai/
│   ├── AIPredictor.js
│   └── train.js
├── bot/
│   ├── TradingBot.js
│   ├── MarketAnalyzer.js
│   └── RiskManager.js
├── utils/
│   └── Logger.js
└── index.js
```