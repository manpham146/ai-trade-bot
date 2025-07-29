/**
 * Test Gemini API trực tiếp để debug lỗi kết nối
 */

require('dotenv').config();

async function testGeminiAPI() {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    
    console.log('🔑 API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING');
    console.log('🤖 Model:', model);
    
    if (!apiKey) {
        console.error('❌ GEMINI_API_KEY không được cấu hình trong .env');
        return;
    }
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const requestBody = {
        contents: [{
            parts: [{
                text: "Hello, this is a test message. Please respond with 'API working'."
            }]
        }],
        generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 100
        }
    };
    
    console.log('🌐 Testing Gemini API connection...');
    console.log('📡 URL:', url.replace(apiKey, 'HIDDEN_KEY'));
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('📊 Response Status:', response.status);
        console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('📄 Raw Response:', responseText);
        
        if (!response.ok) {
            console.error('❌ API Error:', response.status, responseText);
            return;
        }
        
        const data = JSON.parse(responseText);
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            console.log('✅ API Response:', data.candidates[0].content.parts[0].text);
            console.log('🎉 Gemini API hoạt động bình thường!');
        } else {
            console.error('❌ Invalid response format:', data);
        }
        
    } catch (error) {
        console.error('❌ Network/Fetch Error:');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        if (error.cause) {
            console.error('Error cause:', error.cause);
        }
    }
}

// Chạy test
testGeminiAPI().catch(console.error);