#!/usr/bin/env ts-node

import * as readline from 'readline';
import { promises as fs } from 'fs';
import * as path from 'path';
import Logger from './utils/Logger';

/**
 * Setup Wizard - Hướng dẫn cấu hình bot từng bước
 */

interface SetupConfig {
    exchangeApiKey: string;
    exchangeSecret: string;
    exchangePassphrase: string;
    exchangeSandbox: boolean;
    tradingSymbol: string;
    tradingAmount: number;
    stopLossPercentage: number;
    takeProfitPercentage: number;
    maxDailyTrades: number;
    riskPerTrade: number;
    maxPositionSize: number;
    predictionConfidenceThreshold: number;
}

class SetupWizard {
    private rl: readline.Interface;
    private config: Partial<SetupConfig> = {};

    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    /**
     * Bắt đầu setup wizard
     */
    async start(): Promise<void> {
        try {
            console.log('\n🤖 Chào mừng đến với AI Trading Bot Setup Wizard!');
            console.log('📝 Tôi sẽ hướng dẫn bạn cấu hình bot từng bước\n');

            await this.collectApiCredentials();
            await this.collectTradingSettings();
            await this.collectRiskSettings();
            await this.collectAISettings();
            await this.confirmSettings();
            await this.saveConfiguration();
            await this.showNextSteps();

        } catch (error) {
            Logger.error('❌ Lỗi trong quá trình setup:', (error as Error).message);
        } finally {
            this.rl.close();
        }
    }

    /**
     * Thu thập thông tin API
     */
    private async collectApiCredentials(): Promise<void> {
        console.log('🔑 BƯỚC 1: Cấu hình API Keys');
        console.log('Bạn cần API keys từ OKX để bot có thể giao dịch\n');

        this.config.exchangeApiKey = await this.ask('Nhập OKX API Key: ');
        this.config.exchangeSecret = await this.ask('Nhập OKX Secret Key: ');
        this.config.exchangePassphrase = await this.ask('Nhập OKX Passphrase: ');
        
        const sandboxChoice = await this.ask('Sử dụng Demo Trading (khuyến nghị cho test)? (y/n): ');
        this.config.exchangeSandbox = sandboxChoice.toLowerCase() === 'y';

        console.log('✅ API credentials đã được cấu hình\n');
    }

    /**
     * Thu thập cài đặt giao dịch
     */
    private async collectTradingSettings(): Promise<void> {
        console.log('💰 BƯỚC 2: Cấu hình Giao Dịch');
        
        const symbol = await this.ask('Trading pair (mặc định BTC/USDT): ');
        this.config.tradingSymbol = symbol || 'BTC/USDT';
        
        const amount = await this.ask('Số tiền mỗi lệnh ($) (mặc định 10): ');
        this.config.tradingAmount = parseFloat(amount) || 10;
        
        const maxTrades = await this.ask('Số lệnh tối đa mỗi ngày (mặc định 5): ');
        this.config.maxDailyTrades = parseInt(maxTrades) || 5;

        console.log('✅ Cài đặt giao dịch đã được cấu hình\n');
    }

    /**
     * Thu thập cài đặt quản lý rủi ro
     */
    private async collectRiskSettings(): Promise<void> {
        console.log('🛡️ BƯỚC 3: Quản Lý Rủi Ro (Quan trọng!)');
        console.log('Mục tiêu: 1%/tuần với rủi ro thấp\n');
        
        const stopLoss = await this.ask('Stop Loss % (mặc định 2%): ');
        this.config.stopLossPercentage = parseFloat(stopLoss) || 2;
        
        const takeProfit = await this.ask('Take Profit % (mặc định 3%): ');
        this.config.takeProfitPercentage = parseFloat(takeProfit) || 3;
        
        const riskPerTrade = await this.ask('Risk per trade % của tổng vốn (mặc định 1%): ');
        this.config.riskPerTrade = parseFloat(riskPerTrade) / 100 || 0.01;
        
        const maxPosition = await this.ask('Max position size % của tổng vốn (mặc định 10%): ');
        this.config.maxPositionSize = parseFloat(maxPosition) / 100 || 0.1;

        console.log('✅ Quản lý rủi ro đã được cấu hình\n');
    }

    /**
     * Thu thập cài đặt AI
     */
    private async collectAISettings(): Promise<void> {
        console.log('🧠 BƯỚC 4: Cấu hình AI');
        
        const confidence = await this.ask('AI Confidence threshold (0.1-1.0, mặc định 0.7): ');
        this.config.predictionConfidenceThreshold = parseFloat(confidence) || 0.7;

        console.log('✅ Cài đặt AI đã được cấu hình\n');
    }

    /**
     * Xác nhận cài đặt
     */
    private async confirmSettings(): Promise<void> {
        console.log('📋 XÁC NHẬN CÀI ĐẶT:');
        console.log('========================');
        console.log(`Exchange: OKX`);
        console.log(`API Key: ${this.maskApiKey(this.config.exchangeApiKey!)}`);
        console.log(`Passphrase: ${this.maskApiKey(this.config.exchangePassphrase!)}`);
        console.log(`Demo Trading: ${this.config.exchangeSandbox ? 'Có' : 'Không'}`);
        console.log(`Trading Pair: ${this.config.tradingSymbol}`);
        console.log(`Amount per trade: $${this.config.tradingAmount}`);
        console.log(`Max trades/day: ${this.config.maxDailyTrades}`);
        console.log(`Stop Loss: ${this.config.stopLossPercentage}%`);
        console.log(`Take Profit: ${this.config.takeProfitPercentage}%`);
        console.log(`Risk per trade: ${(this.config.riskPerTrade! * 100).toFixed(1)}%`);
        console.log(`Max position: ${(this.config.maxPositionSize! * 100).toFixed(1)}%`);
        console.log(`AI Confidence: ${this.config.predictionConfidenceThreshold}`);
        console.log('========================\n');

        const confirm = await this.ask('Xác nhận cài đặt này? (y/n): ');
        if (confirm.toLowerCase() !== 'y') {
            console.log('❌ Setup bị hủy');
            process.exit(0);
        }
    }

    /**
     * Lưu cấu hình vào file .env
     */
    private async saveConfiguration(): Promise<void> {
        const envContent = `# API Keys cho sàn giao dịch OKX
EXCHANGE_API_KEY=${this.config.exchangeApiKey}
EXCHANGE_SECRET=${this.config.exchangeSecret}
EXCHANGE_PASSPHRASE=${this.config.exchangePassphrase}
EXCHANGE_SANDBOX=${this.config.exchangeSandbox}

# Cấu hình giao dịch
TRADING_SYMBOL=${this.config.tradingSymbol}
TRADING_AMOUNT=${this.config.tradingAmount}
MAX_DAILY_TRADES=${this.config.maxDailyTrades}
STOP_LOSS_PERCENTAGE=${this.config.stopLossPercentage}
TAKE_PROFIT_PERCENTAGE=${this.config.takeProfitPercentage}

# Cấu hình AI
PREDICTION_CONFIDENCE_THRESHOLD=${this.config.predictionConfidenceThreshold}
MODEL_UPDATE_INTERVAL=24

# Cấu hình rủi ro
MAX_POSITION_SIZE=${this.config.maxPositionSize}
RISK_PER_TRADE=${this.config.riskPerTrade}
MAX_DRAWDOWN=0.05

# Logging
LOG_LEVEL=info
LOG_TO_FILE=true

# Database (tùy chọn)
DATABASE_URL=sqlite:./data/trading.db

# Cấu hình khác
TIMEZONE=Asia/Ho_Chi_Minh
BACKTEST_DAYS=30
DATA_RETENTION_DAYS=90
`;

        await fs.writeFile('.env', envContent);
        console.log('✅ Cấu hình đã được lưu vào file .env\n');
    }

    /**
     * Hiển thị các bước tiếp theo
     */
    private async showNextSteps(): Promise<void> {
        console.log('🎉 SETUP HOÀN THÀNH!');
        console.log('\n📋 CÁC BƯỚC TIẾP THEO:');
        console.log('1. npm run build          # Build project');
        console.log('2. npm run train-ai       # Huấn luyện AI (tùy chọn)');
        console.log('3. npm start              # Chạy bot');
        console.log('\n⚠️  LƯU Ý:');
        console.log('- Bot sẽ chạy ở sandbox mode để test an toàn');
        console.log('- Theo dõi log để đảm bảo bot hoạt động đúng');
        console.log('- Chỉ chuyển sang mainnet khi đã test kỹ');
        console.log('\n🎯 MỤC TIÊU: 1%/tuần với rủi ro thấp');
        console.log('📈 TRIẾT LÝ: An Toàn Vốn Là Ưu Tiên Số Một\n');
    }

    /**
     * Hỏi người dùng
     */
    private async ask(question: string): Promise<string> {
        return new Promise((resolve) => {
            this.rl.question(question, resolve);
        });
    }

    /**
     * Ẩn API key
     */
    private maskApiKey(apiKey: string): string {
        if (!apiKey || apiKey.length < 8) return '***';
        return apiKey.substring(0, 4) + '***' + apiKey.substring(apiKey.length - 4);
    }
}

// Chạy setup wizard
if (require.main === module) {
    const wizard = new SetupWizard();
    wizard.start().catch(console.error);
}

export default SetupWizard;