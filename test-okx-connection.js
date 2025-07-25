#!/usr/bin/env node

/**
 * Script test kết nối OKX
 * Kiểm tra API keys và kết nối cơ bản
 */

require('dotenv').config();
const ccxt = require('ccxt');

async function testOKXConnection() {
    console.log('🔧 Testing OKX Connection...');
    console.log('================================');
    
    // Kiểm tra biến môi trường
    const apiKey = process.env.OKX_API_KEY;
    const secret = process.env.OKX_SECRET_KEY;
    const passphrase = process.env.OKX_PASSPHRASE;
    const sandbox = process.env.OKX_SANDBOX === 'true';
    
    console.log(`📊 Environment: ${sandbox ? 'SANDBOX (Demo)' : 'LIVE (Real Money)'}`);
    console.log(`🔑 API Key: ${apiKey ? apiKey.substring(0, 8) + '...' : 'NOT SET'}`);
    console.log(`🔐 Secret: ${secret ? secret.substring(0, 8) + '...' : 'NOT SET'}`);
    console.log(`🔒 Passphrase: ${passphrase ? passphrase.substring(0, 3) + '...' : 'NOT SET'}`);
    console.log('');
    
    if (!apiKey || !secret || !passphrase) {
        console.log('❌ Missing API credentials!');
        console.log('💡 Please check your .env file or run: npm run setup-wizard');
        return;
    }
    
    try {
        // Tạo exchange instance
        const exchange = new ccxt.okx({
            apiKey: apiKey,
            secret: secret,
            password: passphrase,
            sandbox: sandbox,
            enableRateLimit: true
        });
        
        console.log('🔗 Connecting to OKX...');
        
        // Test 1: Lấy thông tin tài khoản
        console.log('📋 Test 1: Account Info');
        const balance = await exchange.fetchBalance();
        console.log('✅ Account connection successful!');
        console.log(`💰 USDT Balance: ${balance.USDT?.free || 0}`);
        console.log(`💰 BTC Balance: ${balance.BTC?.free || 0}`);
        console.log('');
        
        // Test 2: Lấy thông tin thị trường
        console.log('📋 Test 2: Market Data');
        const ticker = await exchange.fetchTicker('BTC/USDT');
        console.log('✅ Market data connection successful!');
        console.log(`📈 BTC/USDT Price: $${ticker.last}`);
        console.log(`📊 24h Volume: ${ticker.baseVolume?.toFixed(2)} BTC`);
        console.log('');
        
        // Test 3: Lấy order book
        console.log('📋 Test 3: Order Book');
        const orderbook = await exchange.fetchOrderBook('BTC/USDT', 5);
        console.log('✅ Order book access successful!');
        console.log(`🟢 Best Bid: $${orderbook.bids[0][0]}`);
        console.log(`🔴 Best Ask: $${orderbook.asks[0][0]}`);
        console.log('');
        
        console.log('🎉 All tests passed! OKX connection is working properly.');
        console.log('💡 You can now run: npm run demo or npm start');
        
    } catch (error) {
        console.log('❌ Connection failed!');
        console.log(`Error: ${error.message}`);
        console.log('');
        console.log('🔧 Troubleshooting:');
        
        if (error.message.includes('does not match current environment')) {
            console.log('   • API key environment mismatch');
            console.log(`   • Current setting: ${sandbox ? 'SANDBOX' : 'LIVE'}`);
            console.log('   • Solution: Check if your API key was created for the correct environment');
            console.log('   • Update OKX_SANDBOX in .env file accordingly');
        } else if (error.message.includes('Invalid signature')) {
            console.log('   • Invalid API credentials');
            console.log('   • Check API Key, Secret, and Passphrase');
            console.log('   • Make sure there are no extra spaces');
        } else if (error.message.includes('IP')) {
            console.log('   • IP whitelist issue');
            console.log('   • Add your current IP to OKX API whitelist');
            console.log('   • Or remove IP restrictions (less secure)');
        } else {
            console.log('   • Check internet connection');
            console.log('   • Verify API key permissions (Trade permission required)');
            console.log('   • Try regenerating API keys');
        }
        
        console.log('');
        console.log('📖 For detailed setup guide, read: OKX_SETUP_GUIDE.md');
    }
}

// Chạy test
testOKXConnection().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
});