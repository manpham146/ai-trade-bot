import 'dotenv/config';
import TradingBot from './bot/TradingBot';
import Logger from './utils/Logger';

/**
 * AI Trading Bot - Entry Point
 * Bot giao dịch tự động với tích hợp AI cho cặp BTC/USDT
 */

interface BotConfig {
    exchange: string;
    symbol: string;
    apiKey: string;
    secret: string;
    passphrase: string;
    sandbox: boolean;
}

async function main(): Promise<void> {
    try {
        Logger.info('🚀 Khởi động AI Trading Bot...');

        // Kiểm tra cấu hình môi trường
        if (!process.env.OKX_API_KEY || !process.env.OKX_SECRET_KEY || !process.env.OKX_PASSPHRASE) {
            throw new Error('❌ Thiếu API keys! Vui lòng cấu hình file .env');
        }

        // Khởi tạo bot
        const botConfig: BotConfig = {
            exchange: 'okx',
            symbol: process.env.TRADING_PAIR || 'BTC/USDT',
            apiKey: process.env.OKX_API_KEY,
            secret: process.env.OKX_SECRET_KEY,
            passphrase: process.env.OKX_PASSPHRASE,
            sandbox: process.env.OKX_SANDBOX === 'true'
        };

        const bot = new TradingBot(botConfig);

        // Khởi động bot
        await bot.start();

        Logger.info('✅ Bot đã khởi động thành công!');

        // Xử lý tín hiệu thoát
        process.on('SIGINT', async(): Promise<void> => {
            Logger.info('🛑 Đang dừng bot...');
            await bot.stop();
            process.exit(0);
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        Logger.error('❌ Lỗi khởi động bot:', errorMessage);
        process.exit(1);
    }
}

// Khởi chạy ứng dụng
if (require.main === module) {
    main();
}

export { main };
