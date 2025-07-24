# 🚀 Hướng Dẫn Bắt Đầu Nhanh - AI Trading Bot

## ⚡ Chạy Bot Trong 5 Phút

### Bước 1: Cài Đặt
```bash
# Clone và cài đặt
git clone <your-repo>
cd ai-trade-bot
npm install
```

### Bước 2: Cấu Hình
```bash
# Tạo file cấu hình
npm run setup

# Chỉnh sửa file .env
nano .env
```

**Cấu hình tối thiểu trong `.env`:**
```env
OKX_API_KEY=your_api_key_here
OKX_SECRET_KEY=your_secret_key_here
OKX_PASSPHRASE=your_passphrase_here
OKX_SANDBOX=true
TRADING_ENABLED=false
```

### Bước 3: Chạy Demo
```bash
# Chạy bot demo (an toàn)
npm run demo
```

## 🎯 Các Lệnh Quan Trọng

| Lệnh | Mô Tả | An Toàn |
|------|-------|----------|
| `npm run demo` | Chạy bot demo (không giao dịch) | ✅ An toàn |
| `npm run train-ai` | Huấn luyện mô hình AI | ✅ An toàn |
| `npm run dev` | Chạy bot development | ⚠️ Tùy cấu hình |
| `npm start` | Chạy bot production | ❌ Có thể giao dịch thật |

## 📋 Checklist Trước Khi Giao Dịch Thật

- [ ] ✅ Đã test với `npm run demo`
- [ ] ✅ Đã huấn luyện AI với `npm run train-ai`
- [ ] ✅ Đã kiểm tra API keys hoạt động
- [ ] ✅ Đã đặt stop-loss và take-profit phù hợp
- [ ] ✅ Đã hiểu rõ rủi ro
- [ ] ✅ Chỉ đầu tư số tiền có thể chấp nhận mất

## 🔧 Cấu Hình Nhanh

### Cho Người Mới Bắt Đầu
```env
TRADE_AMOUNT=10
STOP_LOSS_PERCENTAGE=2
TAKE_PROFIT_PERCENTAGE=3
MAX_TRADES_PER_DAY=3
PREDICTION_CONFIDENCE_THRESHOLD=0.8
```

### Cho Người Có Kinh Nghiệm
```env
TRADE_AMOUNT=50
STOP_LOSS_PERCENTAGE=1.5
TAKE_PROFIT_PERCENTAGE=2.5
MAX_TRADES_PER_DAY=8
PREDICTION_CONFIDENCE_THRESHOLD=0.6
```

## 🚨 Lưu Ý Quan Trọng

1. **Luôn bắt đầu với DEMO**: `npm run demo`
2. **Không bao giờ chia sẻ API keys**
3. **Bắt đầu với số tiền nhỏ**
4. **Theo dõi bot thường xuyên**
5. **Có kế hoạch dừng lỗ**

## 🆘 Khắc Phục Lỗi Nhanh

### Lỗi API Key
```bash
❌ Invalid API key
```
**Giải pháp**: Kiểm tra API key trong file `.env`

### Lỗi Mô Hình AI
```bash
❌ Model not found
```
**Giải pháp**: Chạy `npm run train-ai`

### Lỗi Kết Nối
```bash
❌ Network error
```
**Giải pháp**: Kiểm tra internet và firewall

## 📞 Hỗ Trợ

- 📖 Đọc [README.md](README.md) để hiểu chi tiết
- 🐛 Báo lỗi tại [Issues](https://github.com/your-repo/issues)
- 💬 Thảo luận tại [Discussions](https://github.com/your-repo/discussions)

---

**⚠️ CẢNH BÁO**: Bot này chỉ mang tính giáo dục. Luôn đầu tư có trách nhiệm!