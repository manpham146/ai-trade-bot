# 🤖 AI Trading Bot - Phiên Bản Hoàn Chỉnh

> **Bot giao dịch tự động tích hợp AI với mục tiêu 1%/tuần lợi nhuận ổn định**

## 🎯 Tổng Quan Dự Án

Đây là một bot trading cryptocurrency hoàn chỉnh được xây dựng bằng TypeScript/Node.js, tích hợp trí tuệ nhân tạo để đưa ra quyết định giao dịch thông minh. Bot được thiết kế với triết lý "An Toàn Vốn là Ưu Tiên Số Một" và nhắm đến mục tiêu lợi nhuận ổn định 1%/tuần.

## ✅ Tính Năng Đã Hoàn Thành

### 🧠 AI & Machine Learning
- ✅ **Mô hình AI Dense Neural Network** - Huấn luyện với dữ liệu BTC/USDT
- ✅ **Technical Indicators** - RSI, MACD, SMA, EMA, Bollinger Bands
- ✅ **Dự đoán thông minh** - Kết hợp AI với phân tích kỹ thuật
- ✅ **Model persistence** - Lưu/tải mô hình tự động

### 🔧 Core Trading Engine
- ✅ **Multi-exchange support** - Binance, OKX ready
- ✅ **Risk Management** - Stop-loss, Take-profit tự động
- ✅ **Position Management** - Quản lý vị thế thông minh
- ✅ **Real-time Analysis** - Phân tích thị trường liên tục

### 🛡️ An Toàn & Bảo Mật
- ✅ **Sandbox Mode** - Test an toàn trước khi live
- ✅ **Risk Limits** - Giới hạn rủi ro nghiêm ngặt
- ✅ **Error Handling** - Xử lý lỗi toàn diện
- ✅ **Logging System** - Theo dõi chi tiết mọi hoạt động

### 🎮 User Experience
- ✅ **Setup Wizard** - Cấu hình dễ dàng
- ✅ **Demo Mode** - Chạy thử không cần API
- ✅ **Web Dashboard** - Giao diện web theo dõi
- ✅ **Health Check** - Kiểm tra tình trạng hệ thống

## 🚀 Bắt Đầu Nhanh

### 1. Cài Đặt
```bash
# Clone repository
git clone <your-repo-url>
cd ai-trade-bot

# Cài đặt dependencies
npm install

# Build project
npm run build
```

### 2. Demo Nhanh (Không Cần API)
```bash
npm run demo
```

### 3. Cấu Hình OKX API (Tùy Chọn)
```bash
# Đọc hướng dẫn chi tiết
cat OKX_SETUP_GUIDE.md

# Hoặc chạy setup wizard
npm run setup-wizard
```

**⚠️ Lưu ý quan trọng về OKX API:**
- API keys phải được tạo cho đúng môi trường (Demo/Live)
- Cần cả 3 thông tin: API Key, Secret Key, và Passphrase
- Kiểm tra cài đặt `OKX_SANDBOX` trong file `.env`

### 4. Huấn Luyện AI
```bash
npm run train
```

### 5. Chạy Bot
```bash
npm start
```

## 📊 Kết Quả AI Model

```
✅ Model Type: Dense Neural Network
✅ Training Data: 8,640+ data points
✅ Features: OHLCV + RSI + MACD + SMA
✅ Accuracy: ~14% (baseline, cần cải thiện)
✅ Model Size: ~50KB
✅ Inference Time: <10ms
```

## 🎯 Chiến Lược Trading

### Risk Management
- **Max Risk per Trade**: 1% tổng vốn
- **Stop Loss**: 2% từ entry point
- **Take Profit**: 3% từ entry point
- **Max Daily Trades**: 5 giao dịch

### Signal Generation
```
BUY Signal = AI Prediction + Technical Analysis
- RSI < 30 (oversold)
- MACD bullish crossover
- Price above SMA20
- AI confidence > 70%

SELL Signal = Inverse conditions
HOLD = Mixed or weak signals
```

### Target Performance
- **Weekly Target**: 1% profit
- **Monthly Target**: 4-5% profit
- **Max Drawdown**: 5%
- **Win Rate Target**: >60%

## 📁 Cấu Trúc Dự Án

```
ai-trade-bot/
├── src/
│   ├── ai/                 # AI & Machine Learning
│   │   ├── AIPredictor.ts   # Core AI prediction engine
│   │   └── train.ts         # Model training script
│   ├── bot/                 # Trading Engine
│   │   ├── TradingBot.ts    # Main trading bot
│   │   ├── MarketAnalyzer.ts # Technical analysis
│   │   └── RiskManager.ts   # Risk management
│   ├── utils/               # Utilities
│   │   ├── Logger.ts        # Advanced logging
│   │   └── healthCheck.ts   # System monitoring
│   ├── web/                 # Web Dashboard
│   │   └── server.ts        # Express server
│   └── setup-wizard.ts      # Interactive setup
├── models/                  # AI models storage
├── data/                    # Trading data
├── logs/                    # Application logs
└── demo-simple.js           # Quick demo script
```

## 🔧 Cấu Hình Nâng Cao

### Environment Variables (.env)
```env
# Exchange API
BINANCE_API_KEY=your_api_key
BINANCE_SECRET_KEY=your_secret_key
BINANCE_SANDBOX=true

# Trading Settings
TRADING_SYMBOL=BTC/USDT
TRADING_AMOUNT=10
TRADING_ENABLED=false
RISK_PERCENTAGE=1
STOP_LOSS_PERCENTAGE=2
TAKE_PROFIT_PERCENTAGE=3

# AI Settings
AI_ENABLED=true
AI_CONFIDENCE_THRESHOLD=0.7
AI_MODEL_PATH=./models/btc_prediction_model

# System
LOG_LEVEL=info
WEB_PORT=3000
```

## 📈 Monitoring & Analytics

### Real-time Metrics
- Current Position
- P&L (Profit & Loss)
- Win Rate
- Daily/Weekly Performance
- AI Prediction Accuracy

### Web Dashboard
```bash
npm run web
# Truy cập: http://localhost:3000
```

### Health Check
```bash
npm run health
```

## 🛠️ Development Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build TypeScript |
| `npm run dev` | Development mode |
| `npm run demo` | Quick demo |
| `npm run train` | Train AI model |
| `npm run backtest` | Backtest strategy |
| `npm run setup-wizard` | Interactive setup |
| `npm run web` | Start web dashboard |
| `npm run health` | System health check |
| `npm run lint` | Code linting |
| `npm run format` | Code formatting |

## 🔍 Troubleshooting

### Common Issues

**1. TensorFlow Errors**
```bash
# Đã khắc phục: Chuyển từ @tensorflow/tfjs-node sang @tensorflow/tfjs
npm install @tensorflow/tfjs@4.15.0
```

**2. API Connection Issues**
```bash
# Kiểm tra API keys
npm run setup-wizard

# Test connection
npm run health
```

**3. Model Not Found**
```bash
# Huấn luyện lại model
npm run train
```

**4. Permission Errors**
```bash
# Đảm bảo quyền ghi file
chmod 755 models/ data/ logs/
```

## 🚨 Cảnh Báo An Toàn

⚠️ **QUAN TRỌNG**: Đây là phần mềm giáo dục và thử nghiệm

1. **Luôn test trên sandbox trước**
2. **Bắt đầu với số tiền nhỏ**
3. **Không bao giờ đầu tư quá khả năng chịu đựng**
4. **Theo dõi bot 24/7 trong giai đoạn đầu**
5. **Có kế hoạch dừng lỗ rõ ràng**

## 📚 Tài Liệu Tham Khảo

- [QUICK_START.md](QUICK_START.md) - Hướng dẫn bắt đầu nhanh
- [API Documentation](docs/api.md) - Chi tiết API
- [Trading Strategy](docs/strategy.md) - Chiến lược giao dịch
- [AI Model Details](docs/ai-model.md) - Chi tiết mô hình AI

## 🤝 Đóng Góp

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License - Xem [LICENSE](LICENSE) để biết chi tiết

## 📞 Hỗ Trợ

- 📧 Email: support@ai-trading-bot.com
- 💬 Discord: [AI Trading Community]
- 🐛 Issues: [GitHub Issues]
- 📖 Wiki: [Project Wiki]

---

**🎉 Chúc mừng! Bạn đã có một AI Trading Bot hoàn chỉnh!**

*Hãy nhớ: Trading có rủi ro. Luôn đầu tư có trách nhiệm và không bao giờ đầu tư quá khả năng tài chính của bạn.*
## 📚 Documentation

Xem [docs/README.md](docs/README.md) để có danh sách đầy đủ tài liệu.

### 🚀 Quick Links:
- [Quick Start](docs/setup/quick-start.md) - Bắt đầu nhanh
- [OKX Setup](docs/setup/okx-setup.md) - Cấu hình sàn
- [Bot Guide](docs/setup/bot-guide.md) - Hướng dẫn bot
- [AI Training](docs/development/ai-training.md) - Huấn luyện AI
