# 🚀 Hướng Dẫn Chạy AI Trading Bot

## 📋 Tổng Quan
Bot AI Trading này được thiết kế để giao dịch tự động trên sàn OKX với mục tiêu lợi nhuận 1%/tuần và ưu tiên bảo toàn vốn.

## 🔧 Chuẩn Bị Trước Khi Chạy

### 1. Kiểm Tra Cài Đặt
```bash
# Kiểm tra Node.js version (cần >= 16)
node --version

# Kiểm tra npm
npm --version

# Cài đặt dependencies
npm install
```

### 2. Cấu Hình API Keys
```bash
# Chạy setup wizard để cấu hình
npm run setup-wizard
```

**Hoặc cấu hình thủ công:**
1. Copy file `.env.example` thành `.env`
2. Điền thông tin API từ OKX:
   - `OKX_API_KEY`: API Key từ OKX
   - `OKX_SECRET_KEY`: Secret Key từ OKX  
   - `OKX_PASSPHRASE`: Passphrase từ OKX
   - `OKX_SANDBOX`: `true` cho demo, `false` cho live

### 3. Build Project
```bash
npm run build
```

## 🎮 Các Cách Chạy Bot

### 1. Demo Mode (Khuyến Nghị Cho Người Mới)
```bash
# Demo đơn giản - nhanh chóng
npm run demo

# Demo đầy đủ - có giao diện tương tác
node demo.js
```

**Đặc điểm Demo Mode:**
- ✅ An toàn 100% - không giao dịch thật
- ✅ Test kết nối với OKX
- ✅ Xem tín hiệu AI
- ✅ Kiểm tra cấu hình

### 2. Test Kết Nối
```bash
# Test kết nối OKX
npm run test-okx
```

### 3. Chạy Bot Thực Tế
```bash
# Chạy bot với giao dịch thật
npm start

# Hoặc
node dist/index.js
```

⚠️ **CẢNH BÁO**: Chỉ chạy bot thực tế khi:
- Đã test demo thành công
- Đã kiểm tra kỹ cấu hình
- Hiểu rõ rủi ro
- Đặt `TRADING_ENABLED=true` trong `.env`

## 📊 Giám Sát Bot

### 1. Xem Logs
```bash
# Xem logs realtime
tail -f logs/trading.log

# Xem logs lỗi
tail -f logs/error.log
```

### 2. Web Dashboard (Đang Phát Triển)
```bash
# Khởi động web interface
npm run web
```

## ⚙️ Cấu Hình Quan Trọng

### File .env Cơ Bản
```env
# API Keys
OKX_API_KEY=your_api_key
OKX_SECRET_KEY=your_secret_key
OKX_PASSPHRASE=your_passphrase
OKX_SANDBOX=false

# Trading Settings
TRADING_ENABLED=false  # Đặt true để giao dịch thật
TRADING_PAIR=BTC/USDT
TRADE_AMOUNT=10

# Risk Management
STOP_LOSS_PERCENTAGE=2
TAKE_PROFIT_PERCENTAGE=3
MAX_POSITION_SIZE=0.1
RISK_PER_TRADE=0.01

# AI Settings
PREDICTION_CONFIDENCE_THRESHOLD=0.7
```

## 🛡️ An Toàn & Bảo Mật

### 1. Quyền API
- ✅ **Trade**: Cần thiết cho giao dịch
- ❌ **Withdraw**: KHÔNG bao giờ cấp quyền này
- ✅ **Read**: Cần thiết để đọc dữ liệu

### 2. Kiểm Tra Trước Khi Chạy
```bash
# Kiểm tra balance
npm run test-okx

# Kiểm tra cấu hình
cat .env | grep -E "(TRADING_ENABLED|OKX_SANDBOX|TRADE_AMOUNT)"
```

### 3. Backup & Recovery
```bash
# Backup cấu hình
cp .env .env.backup

# Backup logs
cp -r logs logs_backup_$(date +%Y%m%d)
```

## 🚨 Xử Lý Lỗi Thường Gặp

### 1. Lỗi API Key
```
AuthenticationError: APIKey does not match current environment
```
**Giải pháp:**
- Kiểm tra `OKX_SANDBOX` trong `.env`
- Đảm bảo API key phù hợp với môi trường (demo/live)

### 2. Lỗi Kết Nối
```
Network Error
```
**Giải pháp:**
- Kiểm tra internet
- Kiểm tra firewall
- Thử lại sau vài phút

### 3. Lỗi AI Model
```
Model not found
```
**Giải pháp:**
```bash
npm run train-ai
```

## 📈 Chiến Lược Trading

### Mục Tiêu
- 🎯 **Lợi nhuận**: 1%/tuần
- 🛡️ **Rủi ro**: Tối đa 1% mỗi lệnh
- 📊 **Win rate**: 60-70%
- ⏰ **Timeframe**: 4H, 1D

### Nguyên Tắc
1. **An toàn vốn là ưu tiên số 1**
2. **Không FOMO, không revenge trading**
3. **Tuân thủ stop-loss nghiêm ngặt**
4. **Chỉ trade khi AI confidence > 70%**

## 📞 Hỗ Trợ

### Tài Liệu
- `README.md`: Hướng dẫn cơ bản
- `OKX_SETUP_GUIDE.md`: Cấu hình OKX chi tiết
- `SECURITY.md`: Hướng dẫn bảo mật
- `QUICK_START.md`: Bắt đầu nhanh

### Commands Hữu Ích
```bash
# Xem tất cả scripts
npm run

# Kiểm tra phiên bản
npm run version

# Clean build
npm run clean && npm run build

# Update dependencies
npm update
```

---

## 🎯 Quy Trình Khuyến Nghị

### Lần Đầu Chạy
1. `npm install`
2. `npm run setup-wizard`
3. `npm run build`
4. `npm run test-okx`
5. `npm run demo`
6. Quan sát 1-2 ngày
7. Đặt `TRADING_ENABLED=true`
8. `npm start`

### Hàng Ngày
1. Kiểm tra logs
2. Xem performance
3. Điều chỉnh nếu cần
4. Backup dữ liệu

**🎉 Chúc bạn trading thành công và an toàn!**