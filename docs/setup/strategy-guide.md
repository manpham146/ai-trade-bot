# 🎯 HƯỚNG DẪN CHIẾN LƯỢC GIAO DỊCH MỚI

## 📋 Tổng Quan Chiến Lược

**Nguyên tắc cốt lõi:** "Giao dịch thuận xu hướng, chỉ hành động khi có xác nhận rõ ràng"

**Mục tiêu:** An toàn vốn là ưu tiên số một, lợi nhuận mục tiêu 1%/tuần

## 🔍 Phân Tích Thị Trường

### 1. Phân Tích D1 (Daily) với MA50/MA200

- **UPTREND:** Giá > MA50 > MA200 → Chỉ giao dịch LONG
- **DOWNTREND:** Giá < MA50 < MA200 → Chỉ giao dịch SHORT  
- **SIDEWAYS:** Không giao dịch (bảo vệ vốn)

### 2. Điều Kiện Vào Lệnh trên H1

#### Tín Hiệu LONG (Xu hướng tăng D1)
- Giá pullback về EMA20
- RSI < 40 (oversold)
- Xác nhận từ AI (confidence > 60%)

#### Tín Hiệu SHORT (Xu hướng giảm D1)
- Giá hồi về EMA20
- RSI > 60 (overbought)
- Xác nhận từ AI (confidence > 60%)

## 💰 Quản Lý Vốn & Rủi Ro

### Nguyên Tắc Quản Lý Vốn
- **Rủi ro mỗi lệnh:** ≤ 0.5% tài khoản
- **Giới hạn lỗ tuần:** ≤ 1.5% → Dừng bot đến hết tuần
- **Position size tối đa:** 10% tài khoản
- **Số lệnh tối đa/ngày:** 3 lệnh

### Chốt Lời & Cắt Lỗ
- **Take Profit:** 0.3% - 0.5%
- **Stop Loss:** Dựa trên đỉnh/đáy gần nhất (tạm thời 1%)
- **Risk/Reward tối thiểu:** 1:1.5

## 🤖 Tích Hợp AI

### Vai Trò AI
- **Xác nhận tín hiệu kỹ thuật** (không thay thế hoàn toàn)
- **Thu thập dữ liệu:** Giá, EMA, RSI, volume
- **Mô hình huấn luyện:**
  - Hồi quy tuyến tính → Dự đoán hướng giá ngắn hạn
  - Phân loại → Xác định tín hiệu tốt/xấu

### Điều Kiện AI Xác Nhận
- Confidence > 60%
- Hướng dự đoán phù hợp với tín hiệu kỹ thuật
- Không có xung đột với phân tích xu hướng

## 📊 Cách Sử Dụng

### 1. Chạy Test Chiến Lược
```bash
npm run test:strategy
# hoặc
npx ts-node src/test/strategy-test.ts
```

### 2. Khởi Động Bot với Chiến Lược Mới
```bash
npm start
```

### 3. Theo Dõi qua Web Dashboard
```bash
npm run web-dashboard
# Truy cập: http://localhost:3000
```

## 🛡️ Các Điều Kiện An Toàn

### Bot Sẽ KHÔNG Giao Dịch Khi:
1. Thị trường đang sideway (MA50/MA200 không rõ ràng)
2. Chưa có điều kiện vào lệnh (pullback EMA20 + RSI)
3. AI confidence < 60%
4. Đã đạt giới hạn lỗ tuần 1.5%
5. Đã giao dịch 3 lệnh trong ngày
6. Giá ở vùng Bollinger Bands cực đoan

### Bot Sẽ Dừng Tự Động Khi:
- Lỗ tuần vượt quá 1.5%
- Lỗi hệ thống nghiêm trọng
- Mất kết nối API exchange

## 📈 Kết Quả Test Mẫu

```
✅ QUẢN LÝ RỦI RO:
💰 Tài khoản: $10,000
📊 Position size an toàn: $1,000
⚠️ Rủi ro thực tế: 0.1% (mục tiêu ≤ 0.5%)
📅 Lỗ tuần: -1.2% (trong giới hạn 1.5%)

📊 PHÂN TÍCH KỸ THUẬT:
- Xu hướng D1: DOWNTREND
- MA50 D1: 42,284.88
- MA200 D1: 43,321.93
- EMA20 H1: 41,202.93
- Điều kiện vào lệnh: false
- Tín hiệu: HOLD

🤖 AI ANALYSIS:
- Dự đoán: UP
- Confidence: 75%
- Xác nhận: KHÔNG (xung đột với xu hướng D1)

🔍 KẾT LUẬN: CHƯA ĐỦ ĐIỀU KIỆN GIAO DỊCH
```

## 🔧 Cấu Hình Nâng Cao

### Environment Variables (.env)
```env
# Risk Management
MAX_POSITION_SIZE=50
STOP_LOSS_PERCENTAGE=1
TAKE_PROFIT_PERCENTAGE=0.5
MAX_TRADES_PER_DAY=3

# AI Settings
AI_CONFIDENCE_THRESHOLD=0.6
AI_MODEL_UPDATE_INTERVAL=24

# Strategy Settings
RSI_OVERSOLD=40
RSI_OVERBOUGHT=60
EMA_PULLBACK_THRESHOLD=0.002
```

### Tùy Chỉnh RiskManager
```typescript
const riskManager = new RiskManager();

// Kiểm tra giới hạn lỗ tuần
const canTrade = riskManager.checkWeeklyLossLimit(balance, weeklyProfit);

// Tính position size an toàn
const safeSize = riskManager.calculateSafePositionSize(
    balance, 
    entryPrice, 
    stopLoss
);
```

## 📚 Kiểm Tra & Xác Thực

### 1. Backtest (Bắt Buộc)
- **Dữ liệu:** BTC/USDT tối thiểu 6 tháng
- **Đánh giá:** Tỷ lệ thắng, lợi nhuận ròng, drawdown
- **Mục tiêu:** Win rate > 60%, Max drawdown < 5%

### 2. Paper Trading (Bắt Buộc)
- **Thời gian:** Tối thiểu 4 tuần
- **Mục tiêu:** Lợi nhuận ổn định 1%/tuần
- **Theo dõi:** Risk metrics, signal accuracy

### 3. Live Trading (Chỉ sau khi test thành công)
- **Vốn ban đầu:** Nhỏ (1-5% tổng vốn)
- **Theo dõi:** 24/7 monitoring
- **Điều chỉnh:** Dựa trên performance thực tế

## ⚠️ Lưu Ý Quan Trọng

1. **KHÔNG BAO GIỜ** sử dụng vốn thật trước khi test đầy đủ
2. **LUÔN LUÔN** ưu tiên bảo vệ vốn hơn lợi nhuận
3. **KIÊN NHẪN** chờ tín hiệu rõ ràng, không FOMO
4. **THEO DÕI** performance và điều chỉnh khi cần
5. **HỌC HỎI** từ mỗi giao dịch để cải thiện chiến lược

## 🎯 Mục Tiêu Hiệu Suất

- **Lợi nhuận mục tiêu:** 1%/tuần (52%/năm)
- **Max Drawdown:** < 5%
- **Win Rate:** > 60%
- **Risk/Reward:** > 1:1.5
- **Sharpe Ratio:** > 1.5

---

**Nhớ:** "An toàn vốn là ưu tiên số một. Lợi nhuận sẽ đến một cách tự nhiên khi bạn quản lý rủi ro tốt."

🚀 **Chúc bạn giao dịch thành công và an toàn!**