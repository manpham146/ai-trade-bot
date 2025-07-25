# 🔧 Hướng Dẫn Cấu Hình OKX API cho Trading Bot

## 📋 Bước 1: Tạo API Keys trên OKX

### 1.1 Đăng nhập vào OKX
- Truy cập: https://www.okx.com/
- Đăng nhập vào tài khoản của bạn

### 1.2 Tạo API Keys
1. Vào **Account** → **API Management**
2. Click **Create API Key**
3. Điền thông tin:
   - **API Key Name**: `Trading Bot`
   - **Passphrase**: Tạo passphrase mạnh (ví dụ: `MyBot@2024!`)
   - **Permissions**: Chọn **Trade** (để bot có thể giao dịch)
   - **IP Whitelist**: Thêm IP của máy bạn (hoặc để trống nếu IP động)

### 1.3 Lưu thông tin
- **API Key**: Chuỗi dài bắt đầu bằng chữ và số
- **Secret Key**: Chuỗi dài khác
- **Passphrase**: Chuỗi bạn đã tạo ở bước trên

## 📋 Bước 2: Cấu hình Bot

### 2.1 Cập nhật file .env
Mở file `.env` và cập nhật:

```env
# API Keys cho sàn giao dịch OKX
OKX_API_KEY=your_actual_api_key_here
OKX_SECRET_KEY=your_actual_secret_key_here
OKX_PASSPHRASE=your_actual_passphrase_here

# Môi trường giao dịch
OKX_SANDBOX=false  # false = live trading, true = demo trading

# Cấu hình giao dịch
TRADING_ENABLED=false  # Đặt true khi sẵn sàng giao dịch thật
```

### 2.2 Hoặc sử dụng Setup Wizard
```bash
npm run setup-wizard
```

## 🧪 Bước 3: Test Kết Nối

### 3.1 Test với Demo Mode
```bash
# Đặt OKX_SANDBOX=true trong .env
npm run demo
```

### 3.2 Test với Live Mode (cẩn thận!)
```bash
# Đặt OKX_SANDBOX=false trong .env
# Đặt TRADING_ENABLED=false để chỉ xem dữ liệu
npm run demo
```

## ⚠️ Lưu Ý Quan Trọng

### 🔒 Bảo Mật
- **KHÔNG BAO GIỜ** chia sẻ API keys với ai
- Sử dụng IP whitelist nếu có thể
- Tạo passphrase mạnh
- Chỉ cấp quyền **Trade**, không cấp **Withdraw**

### 💰 An Toàn Tài Chính
- Bắt đầu với số tiền nhỏ
- Luôn đặt `TRADING_ENABLED=false` khi test
- Kiểm tra kỹ cấu hình trước khi bật trading
- Sử dụng Demo Trading trước khi chuyển sang Live

### 🎯 Môi Trường Trading
- **Demo Trading** (`OKX_SANDBOX=true`): 
  - Sử dụng tiền ảo
  - An toàn để test
  - Cần API keys riêng cho demo
- **Live Trading** (`OKX_SANDBOX=false`):
  - Sử dụng tiền thật
  - Cần cẩn thận
  - API keys phải được tạo cho live environment

## 🚨 Khắc Phục Lỗi Thường Gặp

### Lỗi: "APIKey does not match current environment"
**Nguyên nhân**: API key được tạo cho môi trường khác với cài đặt bot

**Giải pháp**:
1. Kiểm tra API key được tạo cho Demo hay Live
2. Cập nhật `OKX_SANDBOX` trong `.env` cho phù hợp:
   - Nếu API key cho Demo: `OKX_SANDBOX=true`
   - Nếu API key cho Live: `OKX_SANDBOX=false`

### Lỗi: "Invalid signature"
**Nguyên nhân**: Secret key hoặc passphrase sai

**Giải pháp**:
1. Kiểm tra lại Secret Key và Passphrase
2. Đảm bảo không có khoảng trắng thừa
3. Tạo lại API key nếu cần

### Lỗi: "IP not in whitelist"
**Nguyên nhân**: IP hiện tại không được phép

**Giải pháp**:
1. Thêm IP hiện tại vào whitelist
2. Hoặc xóa IP whitelist (ít an toàn hơn)

## 📞 Hỗ Trợ

Nếu gặp vấn đề, hãy:
1. Kiểm tra lại từng bước trong hướng dẫn
2. Đảm bảo API keys được tạo đúng môi trường
3. Test với số tiền nhỏ trước
4. Liên hệ hỗ trợ OKX nếu vấn đề từ phía sàn

---

**🎯 Mục tiêu**: Bot hoạt động ổn định với mục tiêu lợi nhuận 1%/tuần và quản lý rủi ro chặt chẽ.