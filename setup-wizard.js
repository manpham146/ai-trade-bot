#!/usr/bin/env node

const readline = require('readline');
const fs = require('fs');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}

function printHeader() {
    console.log(colorize('\n🚀 AI Trading Bot - Setup Wizard', 'cyan'));
    console.log(colorize('=====================================', 'cyan'));
    console.log('Chào mừng bạn đến với AI Trading Bot v2.0.0!');
    console.log('Wizard này sẽ giúp bạn cấu hình bot một cách dễ dàng.\n');
}

function printStep(step, title) {
    console.log(colorize(`\n📋 Bước ${step}: ${title}`, 'yellow'));
    console.log(colorize('─'.repeat(50), 'yellow'));
}

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

function validateApiKey(apiKey) {
    // Basic validation for OKX API key format
    return apiKey && apiKey.length >= 64 && /^[A-Za-z0-9]+$/.test(apiKey);
}

function validateSecretKey(secretKey) {
    // Basic validation for OKX secret key format
    return secretKey && secretKey.length >= 32 && /^[A-Za-z0-9+/=]+$/.test(secretKey);
}

function validatePassphrase(passphrase) {
    // Basic validation for OKX passphrase
    return passphrase && passphrase.length >= 1 && passphrase.length <= 30;
}

async function setupApiKeys() {
    printStep(1, 'Cấu hình API Keys');

    console.log('🔑 Để sử dụng bot, bạn cần API keys từ OKX.');
    console.log('\n📖 Hướng dẫn lấy API keys:');
    console.log('1. Đăng nhập vào OKX.com');
    console.log('2. Vào Profile > API Management');
    console.log('3. Tạo API key mới với quyền "Trade"');
    console.log('4. Lưu lại API Key, Secret Key và Passphrase');
    console.log('5. Thêm IP của bạn vào whitelist (khuyến nghị)');

    const hasApiKeys = await question('\n❓ Bạn đã có API keys chưa? (y/n): ');

    if (hasApiKeys.toLowerCase() !== 'y') {
        console.log(colorize('\n⚠️  Vui lòng lấy API keys trước khi tiếp tục.', 'yellow'));
        console.log('🌐 Link: https://www.okx.com/account/my-api');
        process.exit(0);
    }

    let apiKey, secretKey, passphrase;

    do {
        apiKey = await question('\n🔑 Nhập OKX API Key: ');
        if (!validateApiKey(apiKey)) {
            console.log(colorize('❌ API Key không hợp lệ. Vui lòng kiểm tra lại.', 'red'));
        }
    } while (!validateApiKey(apiKey));

    do {
        secretKey = await question('🔐 Nhập OKX Secret Key: ');
        if (!validateSecretKey(secretKey)) {
            console.log(colorize('❌ Secret Key không hợp lệ. Vui lòng kiểm tra lại.', 'red'));
        }
    } while (!validateSecretKey(secretKey));

    do {
        passphrase = await question('🔒 Nhập OKX Passphrase: ');
        if (!validatePassphrase(passphrase)) {
            console.log(colorize('❌ Passphrase không hợp lệ. Vui lòng kiểm tra lại.', 'red'));
        }
    } while (!validatePassphrase(passphrase));

    return { apiKey, secretKey, passphrase };
}

async function setupTradingConfig() {
    printStep(2, 'Cấu hình Trading');

    console.log('💰 Thiết lập các thông số giao dịch:');

    const tradingPair = await question('\n📊 Trading Pair (mặc định BTC/USDT): ') || 'BTC/USDT';
    const tradeAmount = await question('💵 Số tiền mỗi lệnh ($) (mặc định 10): ') || '10';
    const stopLoss = await question('🛡️  Stop Loss (%) (mặc định 2): ') || '2';
    const takeProfit = await question('🎯 Take Profit (%) (mặc định 3): ') || '3';
    const maxTrades = await question('📈 Max trades/ngày (mặc định 5): ') || '5';

    return {
        tradingPair,
        tradeAmount: parseFloat(tradeAmount),
        stopLoss: parseFloat(stopLoss),
        takeProfit: parseFloat(takeProfit),
        maxTrades: parseInt(maxTrades)
    };
}

async function setupRiskLevel() {
    printStep(3, 'Chọn Mức Độ Rủi Ro');

    console.log('⚖️  Chọn mức độ rủi ro phù hợp với bạn:');
    console.log('\n1. 🟢 Thấp (Conservative) - Mục tiêu 0.5%/tuần');
    console.log('   • Stop Loss: 1%');
    console.log('   • Take Profit: 1.5%');
    console.log('   • AI Confidence: 0.8');
    console.log('   • Max Trades: 3/ngày');

    console.log('\n2. 🟡 Trung Bình (Balanced) - Mục tiêu 1%/tuần');
    console.log('   • Stop Loss: 2%');
    console.log('   • Take Profit: 3%');
    console.log('   • AI Confidence: 0.7');
    console.log('   • Max Trades: 5/ngày');

    console.log('\n3. 🔴 Cao (Aggressive) - Mục tiêu 2%/tuần');
    console.log('   • Stop Loss: 3%');
    console.log('   • Take Profit: 4%');
    console.log('   • AI Confidence: 0.6');
    console.log('   • Max Trades: 8/ngày');

    let riskLevel;
    do {
        riskLevel = await question('\n❓ Chọn mức rủi ro (1-3): ');
    } while (!['1', '2', '3'].includes(riskLevel));

    const riskConfigs = {
        '1': { stopLoss: 1, takeProfit: 1.5, confidence: 0.8, maxTrades: 3 },
        '2': { stopLoss: 2, takeProfit: 3, confidence: 0.7, maxTrades: 5 },
        '3': { stopLoss: 3, takeProfit: 4, confidence: 0.6, maxTrades: 8 }
    };

    return riskConfigs[riskLevel];
}

async function setupMode() {
    printStep(4, 'Chọn Chế Độ Hoạt Động');

    console.log('🎮 Chọn chế độ hoạt động:');
    console.log('\n1. 🧪 Demo Mode - Chỉ phân tích, không giao dịch');
    console.log('2. 📄 Paper Trading - Giao dịch ảo với dữ liệu thật');
    console.log('3. 💰 Live Trading - Giao dịch thật (CẨN THẬN!)');

    let mode;
    do {
        mode = await question('\n❓ Chọn chế độ (1-3): ');
    } while (!['1', '2', '3'].includes(mode));

    const modeConfigs = {
        '1': { tradingEnabled: false, sandbox: true, description: 'Demo Mode' },
        '2': { tradingEnabled: false, sandbox: true, description: 'Paper Trading' },
        '3': { tradingEnabled: true, sandbox: false, description: 'Live Trading' }
    };

    const config = modeConfigs[mode];

    if (mode === '3') {
        console.log(colorize('\n⚠️  CẢNH BÁO: BẠN ĐANG CHỌN LIVE TRADING!', 'red'));
        console.log(colorize('💸 Bot sẽ giao dịch với tiền thật của bạn!', 'red'));
        const confirm = await question('❓ Bạn có chắc chắn? (yes/no): ');
        if (confirm.toLowerCase() !== 'yes') {
            console.log('✅ Chuyển về Paper Trading để an toàn.');
            return modeConfigs['2'];
        }
    }

    return config;
}

function generateEnvFile(config) {
    const envContent = `# API Configuration
OKX_API_KEY=${config.apiKey}
OKX_SECRET_KEY=${config.secretKey}
OKX_PASSPHRASE=${config.passphrase}
OKX_SANDBOX=${config.sandbox}

# Trading Configuration
TRADING_PAIR=${config.tradingPair}
BASE_CURRENCY=USDT
TRADE_AMOUNT=${config.tradeAmount}
MAX_TRADES_PER_DAY=${config.maxTrades}

# Risk Management
STOP_LOSS_PERCENTAGE=${config.stopLoss}
TAKE_PROFIT_PERCENTAGE=${config.takeProfit}
MAX_POSITION_SIZE=100

# AI Configuration
AI_MODEL_PATH=./models/btc_prediction_model
TRAINING_DATA_DAYS=30
PREDICTION_CONFIDENCE_THRESHOLD=${config.confidence}

# Bot Settings
TRADING_ENABLED=${config.tradingEnabled}
LOG_LEVEL=info
WEB_PORT=3000
WEB_DASHBOARD_ENABLED=true
WEBHOOK_URL=

# Database (Optional)
MONGO_URI=mongodb://localhost:27017/trading-bot
`;

    fs.writeFileSync('.env', envContent);
    console.log(colorize('\n✅ File .env đã được tạo thành công!', 'green'));
}

async function runHealthCheck() {
    printStep(5, 'Kiểm Tra Hệ Thống');

    console.log('🏥 Đang chạy health check...');

    try {
        execSync('npm run health-check', { stdio: 'inherit' });
    } catch (error) {
        console.log(colorize('\n⚠️  Có một số vấn đề được phát hiện.', 'yellow'));
        console.log('📋 Vui lòng xem báo cáo chi tiết ở trên.');
    }
}

async function showNextSteps(config) {
    printStep(6, 'Các Bước Tiếp Theo');

    console.log(colorize('🎉 Thiết lập hoàn tất!', 'green'));
    console.log(`\n📊 Cấu hình của bạn:`);
    console.log(`   • Chế độ: ${config.description}`);
    console.log(`   • Trading Pair: ${config.tradingPair}`);
    console.log(`   • Số tiền/lệnh: $${config.tradeAmount}`);
    console.log(`   • Stop Loss: ${config.stopLoss}%`);
    console.log(`   • Take Profit: ${config.takeProfit}%`);
    console.log(`   • Max Trades: ${config.maxTrades}/ngày`);

    console.log(colorize('\n🚀 Các lệnh hữu ích:', 'cyan'));
    console.log('   npm run demo          # Chạy demo mode');
    console.log('   npm run train-ai      # Huấn luyện AI model');
    console.log('   npm run backtest      # Kiểm thử chiến lược');
    console.log('   npm run web-dashboard # Khởi động dashboard');
    console.log('   npm start             # Chạy bot');

    console.log(colorize('\n📚 Tài liệu:', 'cyan'));
    console.log('   README.md             # Hướng dẫn chi tiết');
    console.log('   QUICK_START.md        # Hướng dẫn nhanh');
    console.log('   UPGRADE_GUIDE.md      # Hướng dẫn nâng cấp');

    if (!config.tradingEnabled) {
        console.log(colorize('\n💡 Khuyến nghị:', 'yellow'));
        console.log('1. Chạy "npm run train-ai" để huấn luyện AI');
        console.log('2. Chạy "npm run backtest" để test chiến lược');
        console.log('3. Chạy "npm run demo" để xem bot hoạt động');
        console.log('4. Khi sẵn sàng, bật TRADING_ENABLED=true trong .env');
    } else {
        console.log(colorize('\n⚠️  Lưu ý quan trọng:', 'red'));
        console.log('• Bot sẽ giao dịch với tiền thật!');
        console.log('• Theo dõi dashboard thường xuyên');
        console.log('• Đặt stop-loss chặt chẽ');
        console.log('• Bắt đầu với số tiền nhỏ');
    }

    console.log(colorize('\n🎯 Mục tiêu: An toàn vốn là ưu tiên số 1!', 'green'));
}

async function main() {
    try {
        printHeader();

        // Step 1: API Keys
        const { apiKey, secretKey } = await setupApiKeys();

        // Step 2: Trading Config
        const tradingConfig = await setupTradingConfig();

        // Step 3: Risk Level
        const riskConfig = await setupRiskLevel();

        // Step 4: Mode
        const modeConfig = await setupMode();

        // Combine all configs
        const finalConfig = {
            apiKey,
            secretKey,
            ...tradingConfig,
            ...riskConfig,
            ...modeConfig
        };

        // Generate .env file
        generateEnvFile(finalConfig);

        // Run health check
        await runHealthCheck();

        // Show next steps
        await showNextSteps(finalConfig);

    } catch (error) {
        console.error(colorize('\n❌ Lỗi trong quá trình setup:', 'red'), error.message);
    } finally {
        rl.close();
    }
}

if (require.main === module) {
    main();
}

module.exports = { main };
