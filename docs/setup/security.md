# 🔒 Hướng Dẫn Bảo Mật AI Trading Bot

## 🚨 Cảnh Báo Quan Trọng

**⚠️ KHÔNG BAO GIỜ CHIA SẺ API KEYS CỦA BẠN!**

API keys có thể được sử dụng để:
- Truy cập tài khoản trading của bạn
- Thực hiện giao dịch
- Rút tiền (nếu được cấp quyền)
- Xem thông tin tài khoản

## 🔐 Quản Lý API Keys An Toàn

### 1. Tạo API Keys Đúng Cách

#### Trên Binance:
1. **Đăng nhập** vào tài khoản Binance
2. Vào **Account > API Management**
3. **Tạo API key mới** với tên mô tả rõ ràng
4. **Chỉ cấp quyền cần thiết:**
   - ✅ **Enable Reading** (bắt buộc)
   - ✅ **Enable Spot & Margin Trading** (cho trading)
   - ❌ **Enable Withdrawals** (KHÔNG khuyến nghị)
   - ❌ **Enable Internal Transfer** (KHÔNG cần thiết)

#### Cấu Hình Bảo Mật:
```
✅ Restrict access to trusted IPs only
✅ Enable API Key restrictions
✅ Set trading limits
❌ Don't enable withdrawal permissions
```

### 2. Bảo Vệ API Keys

#### Trong Môi Trường Development:
```bash
# ✅ ĐÚNG - Sử dụng file .env
BINANCE_API_KEY=your_api_key_here
BINANCE_SECRET_KEY=your_secret_key_here

# ❌ SAI - Không hard-code trong source code
const apiKey = "pk_live_abcd1234"; // KHÔNG BAO GIỜ LÀM THẾ NÀY!
```

#### File .env Security:
```bash
# Đảm bảo .env không được commit
echo ".env" >> .gitignore

# Set quyền file chỉ owner đọc được
chmod 600 .env

# Kiểm tra .env không bị track
git status
```

#### Backup An Toàn:
```bash
# Tạo backup encrypted
gpg -c .env  # Tạo .env.gpg
rm .env      # Xóa file gốc

# Restore khi cần
gpg -d .env.gpg > .env
```

### 3. Environment Variables Best Practices

```bash
# ✅ Production Environment
export BINANCE_API_KEY="$(cat /secure/path/api_key)"
export BINANCE_SECRET_KEY="$(cat /secure/path/secret_key)"

# ✅ Docker Secrets
docker run -e BINANCE_API_KEY_FILE=/run/secrets/api_key \
           -e BINANCE_SECRET_KEY_FILE=/run/secrets/secret_key \
           trading-bot

# ✅ Kubernetes Secrets
kubectl create secret generic trading-secrets \
  --from-literal=api-key='your-api-key' \
  --from-literal=secret-key='your-secret-key'
```

## 🛡️ Bảo Mật Hệ Thống

### 1. Server Security

#### Firewall Configuration:
```bash
# Chỉ cho phép kết nối cần thiết
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 3000/tcp  # Web Dashboard (nếu cần)
sudo ufw deny 80/tcp     # HTTP (không cần)
sudo ufw deny 443/tcp    # HTTPS (không cần)
```

#### SSH Security:
```bash
# Disable password authentication
sudo nano /etc/ssh/sshd_config
# PasswordAuthentication no
# PubkeyAuthentication yes

# Restart SSH
sudo systemctl restart ssh
```

### 2. Application Security

#### Process Isolation:
```bash
# Chạy bot với user riêng
sudo useradd -r -s /bin/false tradingbot
sudo chown -R tradingbot:tradingbot /path/to/bot
sudo -u tradingbot node src/index.js
```

#### File Permissions:
```bash
# Set quyền hạn chế
chmod 700 /path/to/bot          # Chỉ owner access
chmod 600 .env                  # Chỉ owner đọc/ghi
chmod 644 src/*.js              # Read-only cho others
chmod 755 setup-wizard.js       # Executable
```

### 3. Network Security

#### IP Whitelisting:
```javascript
// Trong Binance API settings
const allowedIPs = [
    '203.0.113.1',      // Server IP
    '203.0.113.2/24'    # Subnet nếu cần
];
```

#### VPN/Proxy:
```bash
# Sử dụng VPN cho kết nối ổn định
# Tránh sử dụng public WiFi
# Cân nhắc dedicated server
```

## 🔍 Monitoring & Alerting

### 1. Security Monitoring

```javascript
// Trong TradingBot.js
class SecurityMonitor {
    constructor() {
        this.suspiciousActivities = [];
        this.loginAttempts = new Map();
    }
    
    detectSuspiciousActivity(event) {
        const suspicious = [
            'Multiple failed API calls',
            'Unusual trading patterns',
            'Large position sizes',
            'Off-hours activity'
        ];
        
        if (suspicious.includes(event.type)) {
            this.alertSecurity(event);
        }
    }
    
    alertSecurity(event) {
        // Send alert via email/SMS/Telegram
        console.log(`🚨 SECURITY ALERT: ${event.message}`);
    }
}
```

### 2. API Usage Monitoring

```javascript
// Rate limiting và monitoring
class APIMonitor {
    constructor() {
        this.requestCount = 0;
        this.errorCount = 0;
        this.lastReset = Date.now();
    }
    
    trackRequest(response) {
        this.requestCount++;
        
        if (response.status !== 200) {
            this.errorCount++;
            
            // Alert nếu quá nhiều lỗi
            if (this.errorCount > 10) {
                this.alertHighErrorRate();
            }
        }
        
        // Reset counters mỗi giờ
        if (Date.now() - this.lastReset > 3600000) {
            this.resetCounters();
        }
    }
}
```

## 🚨 Incident Response

### 1. Khi Phát Hiện Bất Thường

```bash
# 1. Dừng bot ngay lập tức
npm run emergency-stop

# 2. Revoke API keys
# Vào Binance > API Management > Delete API Key

# 3. Kiểm tra logs
tail -f logs/trading.log | grep ERROR
grep "SUSPICIOUS" logs/security.log

# 4. Kiểm tra tài khoản
# Đăng nhập Binance kiểm tra:
# - Lịch sử giao dịch
# - Số dư tài khoản
# - Hoạt động đăng nhập
```

### 2. Recovery Process

```bash
# 1. Tạo API keys mới
# 2. Cập nhật .env với keys mới
# 3. Chạy health check
npm run health-check

# 4. Test với demo mode
npm run demo

# 5. Kiểm tra backtest
npm run backtest

# 6. Khởi động lại bot
npm start
```

## 📋 Security Checklist

### ✅ Trước Khi Chạy Bot

- [ ] API keys được tạo với quyền tối thiểu
- [ ] IP whitelist được cấu hình
- [ ] File .env có quyền 600
- [ ] .env được thêm vào .gitignore
- [ ] Firewall được cấu hình đúng
- [ ] Bot chạy với user riêng
- [ ] Monitoring được thiết lập
- [ ] Emergency stop procedure được test

### ✅ Hàng Ngày

- [ ] Kiểm tra logs có bất thường
- [ ] Xem dashboard cho hoạt động lạ
- [ ] Kiểm tra số dư tài khoản
- [ ] Review trading performance
- [ ] Backup dữ liệu quan trọng

### ✅ Hàng Tuần

- [ ] Rotate API keys (khuyến nghị)
- [ ] Update dependencies
- [ ] Review security logs
- [ ] Test emergency procedures
- [ ] Backup configuration

### ✅ Hàng Tháng

- [ ] Security audit toàn bộ hệ thống
- [ ] Update bot lên version mới
- [ ] Review và optimize chiến lược
- [ ] Test disaster recovery
- [ ] Update documentation

## 🆘 Emergency Contacts

### Binance Support
- **Website**: https://www.binance.com/en/support
- **Email**: support@binance.com
- **Emergency**: Disable API keys ngay lập tức

### Bot Support
- **Health Check**: `npm run health-check`
- **Emergency Stop**: `npm run emergency-stop`
- **Logs**: `tail -f logs/trading.log`

## 📚 Tài Liệu Tham Khảo

- [Binance API Security](https://binance-docs.github.io/apidocs/spot/en/#general-info)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Docker Security](https://docs.docker.com/engine/security/)

---

**🎯 Nhớ: An toàn vốn là ưu tiên số 1. Khi nghi ngờ, hãy dừng bot và kiểm tra kỹ!**