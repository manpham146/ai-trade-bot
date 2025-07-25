# 🤖 AI Trading Bot - Bot Giao Dịch Tự Động với Trí Tuệ Nhân Tạo

Bot giao dịch cryptocurrency tự động sử dụng AI (LSTM Neural Network) để dự đoán xu hướng giá Bitcoin và thực hiện giao dịch thông minh trên sàn Binance với mục tiêu lợi nhuận ổn định 1%/tuần.

## ✨ Tính Năng Chính

- 🧠 **AI Prediction**: Sử dụng mạng LSTM để dự đoán xu hướng giá BTC/USDT
- 📊 **Technical Analysis**: Phân tích kỹ thuật với RSI, MACD, Bollinger Bands, Stochastic
- ⚡ **Real-time Trading**: Giao dịch tự động 24/7 với kết nối WebSocket
- 🛡️ **Risk Management**: Quản lý rủi ro thông minh với stop-loss và take-profit động
- 📈 **Performance Tracking**: Theo dõi hiệu suất và thống kê giao dịch
- 🌐 **Web Dashboard**: Giao diện web trực quan để theo dõi và điều khiển bot
- 🔄 **Backtest Engine**: Kiểm thử chiến lược trên dữ liệu lịch sử
- 🏥 **Health Check**: Kiểm tra tình trạng hệ thống tự động
- 🔒 **Security**: Bảo mật API keys và quản lý quyền truy cập
- 📝 **Code Quality**: ESLint và Prettier để đảm bảo chất lượng code

## 🚀 Cài Đặt Nhanh

### 1. Clone Repository
```bash
git clone <repository-url>
cd ai-trade-bot
```

### 2. Cài Đặt Dependencies
```bash
npm install
```

### 3. Cấu Hình Môi Trường
```bash
cp .env.example .env
```

Chỉnh sửa file `.env` với thông tin của bạn:
```env
# API Keys cho sàn giao dịch
EXCHANGE_API_KEY=your_binance_api_key_here
EXCHANGE_SECRET=your_binance_secret_key_here
EXCHANGE_SANDBOX=true  # Đặt false khi ready để trade thật

# Cấu hình giao dịch
TRADING_SYMBOL=BTC/USDT
TRADING_AMOUNT=10
MAX_DAILY_TRADES=5
STOP_LOSS_PERCENTAGE=2
TAKE_PROFIT_PERCENTAGE=3

# Cấu hình AI
PREDICTION_CONFIDENCE_THRESHOLD=0.7
MODEL_UPDATE_INTERVAL=24

# Cấu hình rủi ro
MAX_POSITION_SIZE=0.1
RISK_PER_TRADE=0.01
MAX_DRAWDOWN=0.05

# Logging
LOG_LEVEL=info
LOG_TO_FILE=true
```

## 📚 Hướng Dẫn Sử Dụng

### Bước 1: Lấy API Keys từ Binance

1. Đăng nhập vào [Binance](https://www.binance.com)
2. Vào **Account** → **API Management**
3. Tạo API Key mới với quyền:
   - ✅ Enable Reading
   - ✅ Enable Spot & Margin Trading
   - ❌ Enable Withdrawals (KHÔNG bật để bảo mật)
4. Lưu lại **API Key** và **Secret Key**
5. Sao chép API Key và Secret Key vào file `.env`
6. Đặt `EXCHANGE_SANDBOX=true` để test trước

### Bước 2: Huấn Luyện Mô Hình AI

```bash
# Huấn luyện mô hình với dữ liệu lịch sử
npm run train
```

Quá trình này sẽ:
- Tải dữ liệu lịch sử 30 ngày từ Binance
- Tính toán các chỉ báo kỹ thuật
- Huấn luyện mô hình LSTM
- Lưu mô hình đã train vào thư mục `models/`

### Bước 3: Test Bot (Sandbox Mode)

```bash
# Chạy bot ở chế độ test
npm start
```

Bot sẽ:
- Kết nối với Binance (sandbox mode)
- Phân tích thị trường mỗi 5 phút
- Hiển thị tín hiệu mua/bán từ AI
- Quản lý rủi ro tự động
- KHÔNG thực hiện giao dịch thật khi EXCHANGE_SANDBOX=true

### Bước 4: Web Dashboard

Khởi động web dashboard để theo dõi bot:

```bash
# Chạy web dashboard
npm run web-dashboard

# Hoặc chạy cùng với bot
npm start  # Bot sẽ tự động khởi động dashboard
```

Truy cập: `http://localhost:3000`

**Tính năng Dashboard:**
- 📊 Theo dõi thống kê giao dịch real-time
- 🤖 Xem dự đoán AI và tín hiệu kỹ thuật
- 💰 Theo dõi P&L và hiệu suất
- ⚙️ Điều khiển bot (start/stop/emergency stop)
- 📈 Lịch sử giao dịch và biểu đồ

### Bước 5: Backtest

Kiểm thử chiến lược trên dữ liệu lịch sử:

```bash
npm run backtest
```

### Bước 6: Health Check

Kiểm tra tình trạng hệ thống:

```bash
npm run health-check
```

### Bước 7: Chạy Bot Thật (Production)

⚠️ **CẢNH BÁO**: Chỉ làm khi bạn đã test kỹ và hiểu rõ rủi ro!

1. Đặt `OKX_SANDBOX=false` trong `.env`
2. Đặt `TRADING_ENABLED=true` trong `.env`
3. Chạy bot:
```bash
npm start
```

## 🏗️ Kiến Trúc Hệ Thống

```
src/
├── index.js              # Entry point
├── bot/
│   ├── TradingBot.js     # Bot chính
│   ├── MarketAnalyzer.js # Phân tích kỹ thuật
│   └── RiskManager.js    # Quản lý rủi ro
├── ai/
│   ├── AIPredictor.js    # Mô hình AI
│   └── train.js          # Script huấn luyện
└── utils/
    └── Logger.js         # Logging system
```

## 🤖 Cách Hoạt Động của AI

### 1. Thu Thập Dữ Liệu
- Giá OHLCV từ OKX API
- Khối lượng giao dịch
- Các chỉ báo kỹ thuật (RSI, MACD, SMA, EMA)

### 2. Mô Hình LSTM
```javascript
// Kiến trúc mô hình
LSTM(50 units) → Dropout(0.2) →
LSTM(50 units) → Dropout(0.2) →
LSTM(50 units) → Dropout(0.2) →
Dense(25) → Dense(1)
```

### 3. Dự Đoán
- Input: 60 điểm dữ liệu gần nhất
- Output: Xác suất tăng/giảm giá
- Confidence threshold: 70% (có thể điều chỉnh)

### 4. Quyết Định Giao Dịch
```javascript
// Kết hợp AI + Technical Analysis
Final_Score = (AI_Prediction * 0.6) + (Technical_Analysis * 0.4)

if (Final_Score > 0.5 && Risk_Level < HIGH) {
    action = 'BUY'
} else if (Final_Score < -0.5 && Risk_Level < HIGH) {
    action = 'SELL'
} else {
    action = 'HOLD'
}
```

## 📊 Chỉ Báo Kỹ Thuật

| Chỉ Báo | Mô Tả | Tín Hiệu Mua | Tín Hiệu Bán |
|----------|-------|--------------|---------------|
| **RSI** | Relative Strength Index | RSI < 30 | RSI > 70 |
| **MACD** | Moving Average Convergence Divergence | MACD > Signal | MACD < Signal |
| **SMA** | Simple Moving Average | Price > SMA20 > SMA50 | Price < SMA20 < SMA50 |
| **Bollinger Bands** | Volatility Indicator | Price < Lower Band | Price > Upper Band |
| **Stochastic** | Momentum Oscillator | %K < 20, %D < 20 | %K > 80, %D > 80 |

## 🛡️ Quản Lý Rủi Ro

### 1. Stop Loss & Take Profit
- **Stop Loss**: 2% (có thể điều chỉnh)
- **Take Profit**: 3% (có thể điều chỉnh)
- **Dynamic Adjustment**: Tự động điều chỉnh dựa trên volatility

### 2. Position Sizing
- **Base Amount**: $10 mỗi lệnh
- **Risk-based Sizing**: Giảm kích thước khi rủi ro cao
- **Max Position**: $100 (có thể điều chỉnh)

### 3. Trading Limits
- **Max Trades/Day**: 5 lệnh
- **Confidence Threshold**: 70%
- **Risk Assessment**: Đánh giá trước mỗi lệnh

## 📈 Monitoring & Logs

### Log Levels
```bash
# Debug mode
LOG_LEVEL=debug npm run dev

# Production mode
LOG_LEVEL=info npm start
```

### Thống Kê Hiệu Suất
- Tổng số giao dịch
- Tỷ lệ thắng/thua
- Lợi nhuận/lỗ tổng
- Tỷ suất sinh lời

## ⚙️ Tùy Chỉnh Nâng Cao

### 1. Điều Chỉnh Mô Hình AI
```javascript
// Trong AIPredictor.js
this.sequenceLength = 60;  // Số điểm dữ liệu input
this.epochs = 50;          // Số epoch training
this.batchSize = 32;       // Batch size
```

### 2. Thêm Chỉ Báo Mới
```javascript
// Trong MarketAnalyzer.js
const newIndicator = this.calculateNewIndicator(data);
signals.individual.newIndicator = this.interpretNewIndicator(newIndicator);
```

### 3. Tùy Chỉnh Risk Management
```javascript
// Trong RiskManager.js
this.customRiskFactor = this.calculateCustomRisk(marketData);
```

## 🚨 Lưu Ý Quan Trọng

### ⚠️ Rủi Ro
- **Giao dịch cryptocurrency có rủi ro cao**
- **Có thể mất toàn bộ số tiền đầu tư**
- **Bot không đảm bảo lợi nhuận**
- **Luôn test kỹ trước khi dùng tiền thật**

### 🔒 Bảo Mật
- Không chia sẻ API keys
- Sử dụng IP whitelist trên Binance
- Không bật quyền withdraw cho API
- Backup file `.env` an toàn

### 📱 Monitoring
- Theo dõi bot thường xuyên
- Kiểm tra logs hàng ngày
- Đặt alert cho các lỗi quan trọng
- Có kế hoạch dừng khẩn cấp

## 🛠️ Troubleshooting

### Lỗi Thường Gặp

**1. Lỗi API Connection**
```bash
❌ Lỗi kết nối Binance: Invalid API key
```
**Giải pháp**: Kiểm tra API key và secret trong `.env`

**2. Lỗi Insufficient Balance**
```bash
❌ Lỗi thực hiện lệnh mua: Insufficient balance
```
**Giải pháp**: Nạp thêm USDT vào tài khoản

**3. Lỗi AI Model**
```bash
❌ Lỗi dự đoán AI: Model not loaded
```
**Giải pháp**: Chạy `npm run train-ai` để tạo mô hình

### Debug Mode
```bash
# Chạy với debug logs
LOG_LEVEL=debug npm run dev

# Kiểm tra model info
node -e "const AI = require('./src/ai/AIPredictor'); const ai = new AI(); console.log(ai.getModelInfo())"
```

## 📞 Hỗ Trợ

Nếu bạn gặp vấn đề hoặc có câu hỏi:

1. Kiểm tra [Issues](https://github.com/your-repo/issues)
2. Đọc kỹ documentation
3. Kiểm tra logs để tìm lỗi
4. Tạo issue mới với thông tin chi tiết

## 📄 License

MIT License - Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## ⭐ Contributing

Chúng tôi hoan nghênh mọi đóng góp! Vui lòng:

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Tạo Pull Request

---

**Disclaimer**: Bot này chỉ mang tính chất giáo dục và nghiên cứu. Tác giả không chịu trách nhiệm về bất kỳ tổn thất tài chính nào từ việc sử dụng bot này. Hãy luôn đầu tư có trách nhiệm và chỉ đầu tư số tiền bạn có thể chấp nhận mất.