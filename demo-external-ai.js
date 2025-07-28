#!/usr/bin/env node

/**
 * 🚀 Demo External AI Only
 * 
 * Script demo đơn giản để test External AI configuration
 */

const { config } = require('dotenv');
config();

console.log('🤖 External AI Demo - Trading Bot');
console.log('=' .repeat(50));

// Check configuration
console.log('\n📋 Configuration Check:');
console.log(`AI Primary Provider: ${process.env.AI_PRIMARY_PROVIDER}`);
console.log(`AI Fallback Provider: ${process.env.AI_FALLBACK_PROVIDER}`);
console.log(`External AI Service: ${process.env.EXTERNAL_AI_SERVICE}`);
console.log(`Gemini API Key: ${process.env.GEMINI_API_KEY ? '✅ Configured' : '❌ Missing'}`);

if (process.env.AI_PRIMARY_PROVIDER !== 'external') {
    console.log('\n⚠️ Warning: AI_PRIMARY_PROVIDER is not set to "external"');
    console.log('Please update your .env file:');
    console.log('AI_PRIMARY_PROVIDER=external');
    process.exit(1);
}

if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    console.log('\n❌ Error: GEMINI_API_KEY is not configured');
    console.log('Please get your API key from: https://makersuite.google.com/app/apikey');
    console.log('And update your .env file:');
    console.log('GEMINI_API_KEY=your_actual_api_key_here');
    process.exit(1);
}

console.log('\n✅ Configuration looks good!');
console.log('\n🧪 Running External AI test...');
console.log('Please wait...');

// Import and run the test
const { spawn } = require('child_process');

const testProcess = spawn('npm', ['run', 'test-external-ai'], {
    stdio: 'inherit',
    shell: true
});

testProcess.on('close', (code) => {
    if (code === 0) {
        console.log('\n🎉 External AI test completed successfully!');
        console.log('\n💡 Next steps:');
        console.log('1. Run the trading bot: npm run demo');
        console.log('2. Start web dashboard: npm run web-dashboard');
        console.log('3. Monitor AI usage and costs');
    } else {
        console.log('\n❌ External AI test failed.');
        console.log('Please check the error messages above and fix the configuration.');
    }
});

testProcess.on('error', (error) => {
    console.error('\n❌ Failed to run test:', error.message);
    console.log('\nTry running manually: npm run test-external-ai');
});