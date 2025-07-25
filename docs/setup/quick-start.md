# 🚀 Hướng Dẫn Nhanh - AI Trading Bot

## ✅ Trạng Thái Dự Án

- ✅ **Lỗi AI đã được khắc phục**: Đã giải quyết lỗi `util_1.isNullOrUndefined` bằng cách chuyển từ `@tensorflow/tfjs-node` sang `@tensorflow/tfjs`
- ✅ **Mô hình AI hoạt động**: Đã huấn luyện và lưu mô hình thành công
- ✅ **OKX exchange integration**: Hoàn thành tích hợp và live trading
- ✅ **Setup wizard hoàn chỉnh**: Hỗ trợ cấu hình Binance API
- ✅ **Connection testing tools**: Công cụ kiểm tra kết nối và troubleshooting
- ✅ **Cấu trúc dự án ổn định**: TypeScript build thành công

## 🎯 Bắt Đầu Nhanh

### 1. Cài Đặt Dependencies
```bash
npm install
```

### 2. Cấu Hình Bot (Tùy Chọn)
```bash
npm run setup-wizard
```
*Lưu ý: Bạn có thể bỏ qua bước này để chạy demo mà không cần API keys*

### 3. Huấn Luyện Mô Hình AI
```bash
npm run train
```
*Mô hình sẽ được lưu trong thư mục `./models/`*

### 4. Chạy Demo
```bash
# Demo đơn giản (không cần API)
npm run demo

# Demo đầy đủ (cần API keys)
npm run demo-full
```

### 5. Chạy Bot Thực Tế
```bash
# Build project
npm run build

# Khởi động bot
npm start
```

## 📊 Các Lệnh Hữu Ích

| Lệnh | Mô Tả |
|------|-------|
| `npm run train` | Huấn luyện mô hình AI với dữ liệu BTC/USDT |
| `npm run demo` | Demo nhanh không cần API |
| `npm run setup-wizard` | Cấu hình API keys và settings |
| `npm run backtest` | Kiểm thử chiến lược trên dữ liệu lịch sử |
| `npm run health` | Kiểm tra tình trạng hệ thống |
| `npm run web` | Khởi động web interface |

## 🔧 Cấu Hình Nâng Cao

### Biến Môi Trường (.env)
```env
# Binance API (Bắt buộc cho trading thực)
BINANCE_API_KEY=your_api_key
BINANCE_SECRET_KEY=your_secret_key
BINANCE_SANDBOX=true

# Trading Settings
TRADING_SYMBOL=BTC/USDT
TRADING_AMOUNT=10
RISK_PERCENTAGE=1
STOP_LOSS_PERCENTAGE=2
TAKE_PROFIT_PERCENTAGE=3

# AI Settings
AI_ENABLED=true
AI_CONFIDENCE_THRESHOLD=0.7
AI_MODEL_PATH=./models/btc_prediction_model.json
```

## 🎯 Mục Tiêu Lợi Nhuận

- **Target**: 1%/tuần trên tổng vốn
- **Risk Management**: Tối đa 1% rủi ro mỗi giao dịch
- **Strategy**: AI-powered với technical indicators
- **Timeframe**: 5m, 15m, 1h analysis

## 🛡️ An Toàn & Bảo Mật

1. **Sandbox Mode**: Luôn test trên sandbox trước
2. **API Permissions**: Chỉ cấp quyền trading, không withdraw
3. **Risk Limits**: Đặt giới hạn rủi ro nghiêm ngặt
4. **Monitoring**: Theo dõi bot 24/7 trong giai đoạn đầu

## 📈 Kết Quả Mô Hình AI

- **Accuracy**: ~14% (cần cải thiện)
- **Model Type**: Dense Neural Network
- **Features**: OHLCV + RSI + MACD + SMA
- **Training Data**: 8640+ điểm dữ liệu BTC/USDT

## 🔄 Cập Nhật & Bảo Trì

```bash
# Cập nhật mô hình với dữ liệu mới
npm run train

# Kiểm tra hiệu suất
npm run backtest

# Theo dõi logs
tail -f logs/trading.log
```

## 🆘 Khắc Phục Sự Cố

### Lỗi Thường Gặp

1. **"Cannot find module"**: Chạy `npm install`
2. **"API key invalid"**: Kiểm tra .env file
3. **"Model not found"**: Chạy `npm run train` trước
4. **"Connection timeout"**: Kiểm tra internet/firewall

### Liên Hệ Hỗ Trợ

- 📧 Email: support@ai-trading-bot.com
- 💬 Discord: [AI Trading Community]
- 📖 Docs: [Documentation Link]

---

**⚠️ Cảnh Báo**: Đây là phần mềm giáo dục. Luôn test kỹ trước khi sử dụng với tiền thật!