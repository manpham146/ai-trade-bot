# ⏰ Cấu Hình Khung Thời Gian Phân Tích (MARKET_TIMEFRAME)

## 📋 Tổng Quan

Biến môi trường `MARKET_TIMEFRAME` cho phép bạn cấu hình khung thời gian mà bot sử dụng để phân tích thị trường và lấy dữ liệu OHLCV.

## ⚙️ Cách Cấu Hình

### 1. Trong File .env
```env
# Market Analysis Configuration
MARKET_TIMEFRAME=1h  # Khung thời gian phân tích: 1m, 5m, 15m, 1h, 4h, 1d
```

### 2. Các Giá Trị Hỗ Trợ

| Khung Thời Gian | Mô Tả | Phù Hợp Cho |
|-----------------|-------|-------------|
| `1m` | 1 phút | Scalping siêu ngắn hạn |
| `5m` | 5 phút | Scalping ngắn hạn |
| `15m` | 15 phút | Intraday trading |
| `1h` | 1 giờ | **Mặc định** - Cân bằng tốt |
| `4h` | 4 giờ | Swing trading |
| `1d` | 1 ngày | Position trading |

## 🎯 Khuyến Nghị Theo Chiến Lược

### 📈 Scalping (Mục tiêu: 0.1-0.3%/lệnh)
```env
MARKET_TIMEFRAME=5m
```
- **Ưu điểm**: Nhiều cơ hội giao dịch
- **Nhược điểm**: Nhiều noise, cần theo dõi sát
- **Phù hợp**: Trader có thời gian theo dõi liên tục

### ⚖️ Intraday (Mục tiêu: 0.5-1%/lệnh)
```env
MARKET_TIMEFRAME=1h  # Khuyến nghị
```
- **Ưu điểm**: Cân bằng giữa cơ hội và độ tin cậy
- **Nhược điểm**: Ít cơ hội hơn scalping
- **Phù hợp**: Chiến lược mặc định của bot

### 📊 Swing Trading (Mục tiêu: 2-5%/lệnh)
```env
MARKET_TIMEFRAME=4h
```
- **Ưu điểm**: Tín hiệu đáng tin cậy, ít stress
- **Nhược điểm**: Ít cơ hội, giữ lệnh lâu hơn
- **Phù hợp**: Trader ít thời gian theo dõi

## 🔧 Cách Thay Đổi Khung Thời Gian

### Bước 1: Cập Nhật File .env
```bash
# Mở file .env
nano .env

# Thay đổi dòng
MARKET_TIMEFRAME=5m  # Ví dụ chuyển sang 5 phút
```

### Bước 2: Khởi Động Lại Bot
```bash
# Dừng bot hiện tại (Ctrl+C)
# Sau đó khởi động lại
npm start
```

### Bước 3: Kiểm Tra Log
Tìm dòng log xác nhận:
```
[INFO] 📊 Lấy dữ liệu thị trường với khung thời gian: 5m
```

## ⚠️ Lưu Ý Quan Trọng

### 🎯 Tác Động Đến Chiến Lược
- **Khung ngắn (1m, 5m)**: Nhiều tín hiệu nhưng có thể có nhiều noise
- **Khung dài (4h, 1d)**: Ít tín hiệu nhưng đáng tin cậy hơn
- **Khung 1h**: Cân bằng tốt nhất cho mục tiêu 1%/tuần

### 📊 Tác Động Đến Chỉ Báo Kỹ Thuật
- RSI, MACD, EMA sẽ được tính dựa trên khung thời gian mới
- Bollinger Bands sẽ phản ánh volatility của khung thời gian
- Volume analysis sẽ thay đổi theo khung thời gian

### 🔄 Tác Động Đến Tần Suất Giao Dịch
- **Khung ngắn**: Nhiều cơ hội giao dịch hơn
- **Khung dài**: Ít cơ hội nhưng chất lượng cao hơn
- **Bot vẫn phân tích mỗi 5 phút** bất kể khung thời gian nào

## 🧪 Test Khung Thời Gian Mới

### 1. Demo Mode
```bash
# Test với demo trước
npm run demo
```

### 2. Backtest
```bash
# Chạy backtest với khung thời gian mới
npm run backtest
```

### 3. Paper Trading
```bash
# Đặt TRADING_ENABLED=false và quan sát
npm start
```

## 📈 Ví Dụ Cấu Hình Theo Mục Tiêu

### Mục Tiêu: 1%/tuần (Khuyến nghị)
```env
MARKET_TIMEFRAME=1h
STOP_LOSS_PERCENTAGE=2
TAKE_PROFIT_PERCENTAGE=3
```

### Mục Tiêu: Scalping Tích Cực
```env
MARKET_TIMEFRAME=5m
STOP_LOSS_PERCENTAGE=1
TAKE_PROFIT_PERCENTAGE=1.5
MAX_TRADES_PER_DAY=10
```

### Mục Tiêu: Swing Trading Ổn Định
```env
MARKET_TIMEFRAME=4h
STOP_LOSS_PERCENTAGE=3
TAKE_PROFIT_PERCENTAGE=5
MAX_TRADES_PER_DAY=2
```

## 🔍 Troubleshooting

### Lỗi: "Invalid timeframe"
- Kiểm tra giá trị MARKET_TIMEFRAME có đúng format không
- Sàn OKX hỗ trợ: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M

### Bot Không Lấy Dữ liệu
- Kiểm tra kết nối internet
- Kiểm tra API key OKX
- Xem log chi tiết để tìm lỗi

### Tín Hiệu Không Như Mong Đợi
- Khung thời gian khác nhau sẽ cho tín hiệu khác nhau
- Cần thời gian để bot thích ứng với khung mới
- Xem xét backtest trước khi áp dụng

---

**💡 Mẹo**: Bắt đầu với khung 1h (mặc định), sau đó điều chỉnh dần dựa trên kết quả thực tế.