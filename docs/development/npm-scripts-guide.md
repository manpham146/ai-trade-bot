# 📋 NPM Scripts Guide

## Tổng quan

Các scripts trong `package.json` đã được tổ chức lại theo nhóm chức năng để dễ sử dụng và quản lý:

## 🚀 Production Scripts

### `npm run build`
- **Mục đích**: Compile TypeScript thành JavaScript
- **Output**: Tạo thư mục `dist/` với code đã compile
- **Khi nào dùng**: Trước khi deploy production

### `npm run start`
- **Mục đích**: Chạy bot trong môi trường production
- **Hoạt động**: Build code và chạy từ `dist/index.js`
- **Khi nào dùng**: Khi deploy bot lên server

## 🛠️ Development Scripts

### `npm run dev`
- **Mục đích**: Chạy bot trong môi trường development
- **Hoạt động**: Chạy trực tiếp từ TypeScript source
- **Khi nào dùng**: Khi phát triển và debug

### `npm run dev:watch`
- **Mục đích**: Chạy bot với auto-reload khi có thay đổi
- **Hoạt động**: Sử dụng nodemon để theo dõi file changes
- **Khi nào dùng**: Khi phát triển và muốn auto-restart

### `npm run dev:dashboard`
- **Mục đích**: Khởi chạy web dashboard
- **URL**: http://localhost:3000
- **Khi nào dùng**: Khi muốn monitor bot qua web interface

## 🧪 Testing Scripts

### `npm run test`
- **Mục đích**: Chạy tất cả unit tests
- **Framework**: Jest
- **Khi nào dùng**: Trước khi commit code

### `npm run test:watch`
- **Mục đích**: Chạy tests với watch mode
- **Hoạt động**: Auto-run tests khi có file changes
- **Khi nào dùng**: Khi viết tests

### `npm run test:strategy`
- **Mục đích**: Test trading strategies
- **File**: `src/test/strategy-test.ts`
- **Khi nào dùng**: Khi phát triển/test chiến lược trading

### `npm run test:ai-manager`
- **Mục đích**: Test AI Manager system
- **File**: `scripts/test-ai-manager.ts`
- **Khi nào dùng**: Khi test AI providers và fallback

### `npm run test:external-ai`
- **Mục đích**: Test external AI integrations
- **File**: `src/test/external-ai-test.ts`
- **Khi nào dùng**: Khi test Gemini/Claude/OpenAI

### `npm run test:okx`
- **Mục đích**: Test OKX exchange connection
- **File**: `test-okx-connection.js`
- **Khi nào dùng**: Khi setup hoặc debug OKX API

## 🎮 Demo Scripts

### `npm run demo`
- **Mục đích**: Chạy demo đơn giản
- **File**: `demo-simple.js`
- **Khi nào dùng**: Để hiểu cách bot hoạt động cơ bản

### `npm run demo:full`
- **Mục đích**: Chạy demo đầy đủ tính năng
- **File**: `demo.js`
- **Khi nào dùng**: Để test toàn bộ workflow

### `npm run demo:external-ai`
- **Mục đích**: Demo external AI integration
- **File**: `demo-external-ai.js`
- **Khi nào dùng**: Để test AI predictions

## ⚙️ Setup Scripts

### `npm run setup`
- **Mục đích**: Setup môi trường development
- **Hoạt động**: Copy `.env.example` thành `.env`
- **Khi nào dùng**: Lần đầu setup project

### `npm run setup:wizard`
- **Mục đích**: Chạy setup wizard interactive
- **File**: `src/setup-wizard.ts`
- **Khi nào dùng**: Khi muốn setup guided

## 🔧 Tools Scripts

### `npm run tools:backtest`
- **Mục đích**: Chạy backtest trading strategies
- **File**: `src/backtest/backtest.ts`
- **Khi nào dùng**: Để test chiến lược với dữ liệu lịch sử

### `npm run tools:health-check`
- **Mục đích**: Kiểm tra health của system
- **File**: `src/utils/healthCheck.ts`
- **Khi nào dùng**: Để debug hoặc monitor system

## 🎨 Code Quality Scripts

### `npm run lint`
- **Mục đích**: Kiểm tra code style và lỗi
- **Tool**: ESLint
- **Khi nào dùng**: Trước khi commit

### `npm run lint:fix`
- **Mục đích**: Tự động fix các lỗi lint
- **Tool**: ESLint với --fix
- **Khi nào dùng**: Khi có nhiều lỗi lint

### `npm run format`
- **Mục đích**: Format code theo chuẩn
- **Tool**: Prettier
- **Khi nào dùng**: Trước khi commit

### `npm run type-check`
- **Mục đích**: Kiểm tra TypeScript types
- **Tool**: TypeScript compiler
- **Khi nào dùng**: Để debug type errors

## 🔧 Maintenance Scripts

### `npm run maintenance:update-deps`
- **Mục đích**: Update tất cả dependencies
- **Tool**: npm update
- **Khi nào dùng**: Định kỳ để update packages

## 📝 Workflow Recommendations

### Development Workflow:
```bash
# 1. Setup lần đầu
npm run setup
npm run setup:wizard

# 2. Development
npm run dev:watch
# Hoặc chạy dashboard
npm run dev:dashboard

# 3. Testing
npm run test:strategy
npm run test:ai-manager

# 4. Code quality
npm run lint:fix
npm run format
npm run type-check
```

### Production Deployment:
```bash
# 1. Final testing
npm run test
npm run tools:health-check

# 2. Build và deploy
npm run build
npm run start
```

### Troubleshooting:
```bash
# Kiểm tra connections
npm run test:okx
npm run test:external-ai

# Health check
npm run tools:health-check

# Demo để test
npm run demo
```

## 💡 Tips

1. **Sử dụng tab completion**: Gõ `npm run` và nhấn Tab để xem tất cả scripts
2. **Chạy multiple scripts**: Có thể chạy nhiều terminal với các scripts khác nhau
3. **Check logs**: Tất cả scripts đều có logging, check console output
4. **Environment**: Đảm bảo `.env` file được setup đúng trước khi chạy