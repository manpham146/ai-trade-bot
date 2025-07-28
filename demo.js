require('dotenv').config();
const TradingBot = require('./src/bot/TradingBot');
const Logger = require('./src/utils/Logger');

/**
 * Demo Script - Chạy bot ở chế độ demo để test
 * Script này sẽ chạy bot mà không thực hiện giao dịch thật
 */

async function runDemo() {
    try {
        Logger.info('🎮 Chạy AI Trading Bot ở chế độ DEMO');
        Logger.info('📝 Bot sẽ phân tích thị trường và đưa ra tín hiệu mà KHÔNG giao dịch thật');
        Logger.info('⚠️  Đảm bảo TRADING_ENABLED=false trong file .env');
        
        // Kiểm tra cấu hình an toàn
        if (process.env.TRADING_ENABLED === 'true') {
            Logger.warn('⚠️  CẢNH BÁO: TRADING_ENABLED=true!');
            Logger.warn('⚠️  Đặt TRADING_ENABLED=false để chạy demo an toàn');
            
            const readline = require('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            
            const answer = await new Promise(resolve => {
                rl.question('Bạn có muốn tiếp tục với giao dịch thật? (yes/no): ', resolve);
            });
            
            rl.close();
            
            if (answer.toLowerCase() !== 'yes') {
                Logger.info('✅ Dừng demo để bảo mật');
                process.exit(0);
            }
        }
        
        // Hiển thị cấu hình hiện tại
        Logger.info('⚙️  Cấu hình hiện tại:');
        Logger.info(`   Trading Pair: ${process.env.TRADING_PAIR || 'BTC/USDT'}`);
        Logger.info(`   Trade Amount: $${process.env.TRADE_AMOUNT || '10'}`);
        Logger.info(`   Stop Loss: ${process.env.STOP_LOSS_PERCENTAGE || '2'}%`);
        Logger.info(`   Take Profit: ${process.env.TAKE_PROFIT_PERCENTAGE || '3'}%`);
        Logger.info(`   Max Trades/Day: ${process.env.MAX_TRADES_PER_DAY || '5'}`);
        Logger.info(`   AI Confidence Threshold: ${process.env.PREDICTION_CONFIDENCE_THRESHOLD || '0.7'}`);
        Logger.info(`   Sandbox Mode: ${process.env.OKX_SANDBOX || 'true'}`);
        Logger.info(`   Trading Enabled: ${process.env.TRADING_ENABLED || 'false'}`);
        
        // Khởi tạo bot
        const bot = new TradingBot({
            exchange: 'okx',
            symbol: process.env.TRADING_PAIR || 'BTC/USDT',
            apiKey: process.env.OKX_API_KEY,
            secret: process.env.OKX_SECRET_KEY,
            passphrase: process.env.OKX_PASSPHRASE,
            sandbox: process.env.OKX_SANDBOX !== 'false'
        });
        
        // Khởi động bot
        await bot.start();
        
        Logger.info('✅ Demo bot đã khởi động thành công!');
        Logger.info('📊 Bot sẽ phân tích thị trường mỗi 5 phút...');
        Logger.info('🛑 Nhấn Ctrl+C để dừng bot');
        
        // Hiển thị hướng dẫn
        setTimeout(() => {
            Logger.info('💡 HƯỚNG DẪN SỬ DỤNG:');
            Logger.info('   1. Quan sát các tín hiệu mua/bán từ AI');
            Logger.info('   2. Kiểm tra độ chính xác của dự đoán');
            Logger.info('   3. Điều chỉnh tham số nếu cần thiết');
            Logger.info('   4. Khi hài lòng, đặt TRADING_ENABLED=true để giao dịch thật');
        }, 5000);
        
        // Xử lý tín hiệu thoát
        process.on('SIGINT', async () => {
            Logger.info('🛑 Đang dừng demo bot...');
            await bot.stop();
            Logger.info('👋 Cảm ơn bạn đã sử dụng AI Trading Bot Demo!');
            process.exit(0);
        });
        
    } catch (error) {
        Logger.error('❌ Lỗi chạy demo:', error.message);
        
        // Gợi ý khắc phục lỗi
        if (error.message.includes('API')) {
            Logger.info('💡 Gợi ý: Kiểm tra API keys trong file .env');
        } else if (error.message.includes('Model')) {
            Logger.info('💡 Gợi ý: Chạy "npm run test-external-ai" để kiểm tra External AI');
        } else if (error.message.includes('Network')) {
            Logger.info('💡 Gợi ý: Kiểm tra kết nối internet');
        }
        
        process.exit(1);
    }
}

// Chạy demo
if (require.main === module) {
    runDemo();
}

module.exports = { runDemo };