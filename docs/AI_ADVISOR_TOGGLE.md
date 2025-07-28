# AI Advisor Toggle Feature

## Tổng quan

Tính năng AI Advisor Toggle cho phép bạn bật/tắt cố vấn AI trong Trading Bot. Khi tắt AI Advisor, bot sẽ chỉ sử dụng phân tích kỹ thuật thuần túy để đưa ra quyết định giao dịch.

## Cấu hình

### Trong file .env

```bash
# Bật/tắt AI Advisor
AI_ADVISOR_ENABLED=true  # true để bật, false để tắt
```

## Cách hoạt động

### Khi AI Advisor được BẬT (AI_ADVISOR_ENABLED=true)

- Bot sử dụng kết hợp phân tích kỹ thuật + AI để đưa ra quyết định
- AI Manager được khởi tạo và kết nối với Gemini API
- Confidence cao hơn nhờ sự xác nhận từ AI
- Có thể sử dụng các tính năng AI nâng cao

### Khi AI Advisor bị TẮT (AI_ADVISOR_ENABLED=false)

- Bot chỉ sử dụng phân tích kỹ thuật (RSI, MACD, Bollinger Bands)
- AI Manager không được khởi tạo → tiết kiệm tài nguyên
- Không có chi phí API cho AI
- Confidence được điều chỉnh phù hợp với phân tích kỹ thuật
- Sử dụng fallback prediction dựa trên technical analysis

## Ưu điểm của từng chế độ

### Chế độ AI Enabled
✅ Độ chính xác cao hơn  
✅ Phân tích đa chiều  
✅ Học hỏi từ dữ liệu thị trường  
❌ Chi phí API  
❌ Phụ thuộc vào kết nối mạng  

### Chế độ AI Disabled
✅ Không có chi phí API  
✅ Hoạt động offline  
✅ Tốc độ xử lý nhanh hơn  
✅ Ổn định, không phụ thuộc external service  
❌ Độ chính xác thấp hơn  
❌ Chỉ dựa vào technical indicators  

## Kiểm tra tính năng

### Chạy test tự động

```bash
npm run test:ai-advisor-toggle
```

Test sẽ kiểm tra:
1. ✅ AI Manager khởi tạo đúng khi enabled
2. ✅ AI Manager bị vô hiệu hóa khi disabled  
3. ✅ Fallback prediction hoạt động đúng

### Kiểm tra thủ công

1. **Kiểm tra log khởi động:**
   - AI enabled: `✅ AI Manager đã được khởi tạo thành công!`
   - AI disabled: `🔇 AI Advisor bị tắt - Bot sẽ chỉ sử dụng phân tích kỹ thuật`

2. **Kiểm tra prediction:**
   - AI enabled: Có note từ AI service
   - AI disabled: Note "AI Advisor disabled - Using technical analysis only"

## Khuyến nghị sử dụng

### Khi nào nên BẬT AI Advisor:
- Khi bạn có budget cho API calls
- Khi muốn độ chính xác cao nhất
- Khi thị trường biến động phức tạp
- Khi có kết nối internet ổn định

### Khi nào nên TẮT AI Advisor:
- Khi muốn tiết kiệm chi phí
- Khi kết nối internet không ổn định
- Khi muốn test thuật toán technical analysis thuần túy
- Khi Gemini API gặp sự cố

## Chuyển đổi trong runtime

Hiện tại, để thay đổi cấu hình AI Advisor, bạn cần:

1. Dừng bot: `Ctrl+C`
2. Sửa file `.env`: `AI_ADVISOR_ENABLED=false`
3. Khởi động lại bot: `npm run dev`

## Troubleshooting

### Lỗi thường gặp:

1. **"Gemini API attempt 3/3 failed"**
   - Giải pháp: Tắt AI Advisor để sử dụng technical analysis only
   - Cấu hình: `AI_ADVISOR_ENABLED=false`

2. **Bot không phản hồi khi AI enabled**
   - Kiểm tra API key Gemini
   - Kiểm tra kết nối internet
   - Tạm thời tắt AI Advisor

3. **Confidence thấp khi AI disabled**
   - Đây là hành vi bình thường
   - Bot tự động điều chỉnh threshold phù hợp

## Kết luận

Tính năng AI Advisor Toggle mang lại sự linh hoạt cho Trading Bot, cho phép bạn lựa chọn giữa độ chính xác cao (với AI) và sự ổn định, tiết kiệm (technical analysis only) tùy theo nhu cầu và điều kiện cụ thể.