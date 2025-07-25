require('dotenv').config();
const TradingBot = require('./dist/bot/TradingBot').default;
const Logger = require('./dist/utils/Logger').default;

async function runDemo() {
    try {
        Logger.info('🚀 Khởi động Demo AI Trading Bot...');
        
        // Kiểm tra file .env
        if (!process.env.OKX_API_KEY || !process.env.OKX_SECRET_KEY || !process.env.OKX_PASSPHRASE) {
            Logger.warn('⚠️ Chưa cấu hình API keys. Chạy "npm run setup-wizard" để cấu hình.');
            Logger.info('📝 Demo sẽ chạy ở chế độ simulation...');
        }
        
        // Tạo config mặc định cho demo
        const config = {
            exchange: 'okx',
            symbol: 'BTC/USDT',
            apiKey: process.env.OKX_API_KEY || 'demo_key',
            secret: process.env.OKX_SECRET_KEY || 'demo_secret',
            passphrase: process.env.OKX_PASSPHRASE || 'demo_passphrase',
            sandbox: process.env.OKX_SANDBOX === 'true'
        };
        
        // Khởi tạo bot
        const bot = new TradingBot(config);
        
        Logger.info('🔧 Đang khởi tạo Trading Bot...');
        
        // Chỉ khởi tạo exchange nếu có API keys
        if (process.env.OKX_API_KEY && process.env.OKX_SECRET_KEY && process.env.OKX_PASSPHRASE) {
            await bot.initializeExchange();
            Logger.info('📊 Đang phân tích thị trường...');
            await bot.analyzeAndTrade();
        } else {
            Logger.info('📊 Demo mode: Mô phỏng phân tích thị trường...');
            Logger.info('🎯 Tín hiệu demo: HOLD (Confidence: 75%)');
            Logger.info('💭 Lý do: Demo mode - không có kết nối thực tế');
        }
        
        Logger.info('✅ Demo hoàn thành!');
        Logger.info('💡 Để chạy bot thực tế, sử dụng: npm start');
        
    } catch (error) {
        Logger.error('❌ Lỗi demo:', error.message);
        Logger.info('💡 Hướng dẫn khắc phục:');
        Logger.info('   1. Chạy "npm run setup-wizard" để cấu hình');
        Logger.info('   2. Kiểm tra kết nối internet');
        Logger.info('   3. Đảm bảo API keys hợp lệ');
    }
}

// Chạy demo
runDemo().then(() => {
    process.exit(0);
}).catch(error => {
    Logger.error('❌ Demo thất bại:', error);
    process.exit(1);
});