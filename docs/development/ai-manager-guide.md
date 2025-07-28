# 🤖 AI Manager System Guide

## Tổng quan

AI Manager System là một hệ thống quản lý AI providers linh hoạt, cho phép bạn dễ dàng chuyển đổi giữa Internal AI (Local TensorFlow.js) và External AI services (Gemini, Claude, OpenAI). Hệ thống này được thiết kế với các tính năng:

- **Fallback tự động**: Chuyển giữa Internal và External providers khi có lỗi
- **Load balancing**: Phân phối tải giữa các providers
- **Cost monitoring**: Theo dõi chi phí sử dụng External services
- **Health checking**: Kiểm tra tình trạng providers định kỳ
- **Performance tracking**: Theo dõi hiệu suất và thống kê

## 🏗️ Architecture Overview

AI Manager sử dụng kiến trúc modular với các thành phần chính:

- **AI Manager**: Core component quản lý tất cả AI providers
- **AI Factory**: Factory pattern để tạo và cấu hình providers
- **Internal AI Provider**: Local TensorFlow.js implementation
- **External AI Provider**: Unified provider cho external services (Gemini, Claude, OpenAI)
- **Fallback System**: Tự động chuyển đổi giữa Internal và External providers
- **Health Check**: Giám sát trạng thái của các providers
- **Cost Management**: Theo dõi và kiểm soát chi phí API

### Available Providers

| Provider | Type | Services | Cost | Speed | Accuracy | Offline |
|----------|------|----------|------|-------|----------|----------|
| Internal | Local AI | TensorFlow.js | Free | Fast | Medium | ✅ |
| External | Cloud AI | Gemini, Claude, OpenAI | Variable | Medium | High | ❌ |

## Cấu trúc hệ thống

```
src/ai/
├── interfaces/
│   └── IAIProvider.ts          # Interface chung cho tất cả AI providers
├── providers/
│   ├── InternalAIProvider.ts   # Local TensorFlow.js AI
│   └── ExternalAIProvider.ts   # Unified external AI services (Gemini, Claude, OpenAI)
├── AIManager.ts                # Quản lý và chuyển đổi providers
└── AIFactory.ts                # Factory pattern để tạo providers
```

## Cấu hình Environment Variables

### AI Manager Configuration

```bash
# AI Manager Settings
AI_PRIMARY_PROVIDER=internal        # Primary AI provider (internal, external)
AI_FALLBACK_PROVIDER=external       # Fallback provider
AI_AUTO_SWITCH=true                 # Auto switch on provider failure
AI_HEALTH_CHECK_INTERVAL=300000     # Health check interval (5 minutes)
AI_COST_THRESHOLD=10.0              # Daily cost threshold (USD)
EXTERNAL_AI_SERVICE=gemini          # External AI service (gemini, claude, openai)
```

### Common AI Settings (Applied to All External Providers)

```bash
# Shared Configuration
AI_TIMEOUT=30000        # Request timeout (ms)
AI_MAX_RETRIES=3        # Max retries per request
AI_TEMPERATURE=0.3      # Model temperature (creativity)
AI_MAX_TOKENS=1000      # Max response tokens
```

### AI Provider API Keys

```bash
# API Keys
GEMINI_API_KEY=your_gemini_api_key_here
CLAUDE_API_KEY=your_claude_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_ORGANIZATION=your_openai_org_id # Optional
```

### AI Provider Models

```bash
# Model Selection
GEMINI_MODEL=gemini-pro
CLAUDE_MODEL=claude-3-haiku-20240307
OPENAI_MODEL=gpt-3.5-turbo
```

### AI Provider Rate Limits (Requests per Minute)

```bash
# Rate Limiting
GEMINI_RATE_LIMIT=60
CLAUDE_RATE_LIMIT=50
OPENAI_RATE_LIMIT=60
```

### Local AI Configuration

```bash
# Local AI Settings
LOCAL_AI_MODEL_PATH=./models/trading_model.json
LOCAL_AI_WEIGHTS_PATH=./models/trading_weights.bin
LOCAL_AI_SCALER_PATH=./models/scaler_params.json
LOCAL_AI_TIMEOUT=10000
```

## Sử dụng cơ bản

### 1. Khởi tạo AI Manager từ Environment

```typescript
import AIFactory from './src/ai/AIFactory';

// Tạo AI Manager từ environment variables
const factory = AIFactory.getInstance();
const aiManager = await factory.createAIManagerFromEnv();

// Sử dụng để dự đoán
const marketData = {
    symbol: 'BTC/USDT',
    currentPrice: 45000,
    timestamp: Date.now()
};

const prediction = await aiManager.predict(marketData);
console.log('Prediction:', prediction);
```

### 2. Khởi tạo AI Manager với cấu hình tùy chỉnh

```typescript
import AIFactory from './src/ai/AIFactory';
import { AIProviderType } from './src/ai/interfaces/IAIProvider';

const factory = AIFactory.getInstance();

const aiManager = await factory.createAIManager({
    primaryProvider: AIProviderType.GEMINI,
    fallbackProviders: [AIProviderType.LOCAL, AIProviderType.CLAUDE],
    autoSwitchOnError: true,
    maxRetries: 3,
    healthCheckInterval: 300000,
    costThreshold: 5.0,
    providers: {
        [AIProviderType.GEMINI]: {
            apiKey: 'your-gemini-key',
            model: 'gemini-pro',
            temperature: 0.3
        },
        [AIProviderType.CLAUDE]: {
            apiKey: 'your-claude-key',
            model: 'claude-3-haiku-20240307',
            temperature: 0.3
        }
    }
});
```

### 3. Chuyển đổi Provider thủ công

```typescript
// Chuyển sang Gemini
const success = await aiManager.switchProvider(AIProviderType.GEMINI);
if (success) {
    console.log('Switched to Gemini successfully');
}

// Kiểm tra provider hiện tại
const stats = aiManager.getStats();
console.log('Current provider:', stats.currentProvider);
```

## Tính năng nâng cao

### 1. Provider Recommendations

```typescript
const factory = AIFactory.getInstance();

// Gợi ý cho use case tiết kiệm chi phí
const costEffective = factory.getProviderRecommendations('cost-effective');
console.log('Cost-effective setup:', costEffective);

// Gợi ý cho độ chính xác cao
const highAccuracy = factory.getProviderRecommendations('high-accuracy');
console.log('High-accuracy setup:', highAccuracy);

// Gợi ý cho phản hồi nhanh
const fastResponse = factory.getProviderRecommendations('fast-response');
console.log('Fast-response setup:', fastResponse);

// Gợi ý cho chế độ offline
const offline = factory.getProviderRecommendations('offline');
console.log('Offline setup:', offline);
```

### 2. Monitoring và Statistics

```typescript
// Lấy thống kê tổng quan
const stats = aiManager.getStats();
console.log('AI Manager Stats:', {
    currentProvider: stats.currentProvider,
    requestCount: stats.requestCount,
    errorCount: stats.errorCount,
    dailyCost: stats.dailyCost,
    successRate: stats.successRate,
    availableProviders: stats.availableProviders,
    readyProviders: stats.readyProviders
});

// Lấy thông tin chi tiết tất cả providers
const providersInfo = aiManager.getAllProvidersInfo();
console.log('Providers Info:', providersInfo);
```

### 3. Validation và Available Providers

```typescript
const factory = AIFactory.getInstance();

// Kiểm tra providers có sẵn
const available = factory.getAvailableProviders();
console.log('Available providers:', available);

// Validate cấu hình provider
const isValid = factory.validateProviderConfig(AIProviderType.GEMINI, {
    apiKey: 'test-key',
    model: 'gemini-pro'
});
console.log('Config valid:', isValid);
```

## Testing

### Chạy test suite đầy đủ

```bash
npm run test-ai-manager
```

Test suite sẽ kiểm tra:
- AI Factory functionality
- Individual providers
- AI Manager operations
- Fallback mechanism
- Performance comparison

### Test từng provider riêng lẻ

```typescript
import AIFactory from './src/ai/AIFactory';
import { AIProviderType } from './src/ai/interfaces/IAIProvider';

const factory = AIFactory.getInstance();

// Test Gemini provider
const geminiProvider = await factory.createProvider(AIProviderType.GEMINI);
const connectionOk = await geminiProvider.testConnection();
if (connectionOk) {
    const prediction = await geminiProvider.predict(marketData);
    console.log('Gemini prediction:', prediction);
}
```

## So sánh Providers

| Provider | Chi phí | Tốc độ | Độ chính xác | Offline | Ghi chú |
|----------|---------|--------|--------------|---------|----------|
| **Internal AI** | Miễn phí | Rất nhanh | Trung bình | ✅ | Local TensorFlow.js, không cần internet |
| **External AI** | Variable | Nhanh | Cao | ❌ | Unified access to Gemini, Claude, OpenAI |

## Best Practices

### 1. Cấu hình Production

```typescript
// Cấu hình cho production
const productionConfig = {
    primaryProvider: AIProviderType.GEMINI,     // Chi phí thấp, độ chính xác cao
    fallbackProviders: [                       // Fallback theo thứ tự ưu tiên
        AIProviderType.LOCAL,                   // Miễn phí, luôn có sẵn
        AIProviderType.CLAUDE                   // Backup chất lượng cao
    ],
    autoSwitchOnError: true,
    maxRetries: 3,
    healthCheckInterval: 300000,                // 5 phút
    costThreshold: 10.0                         // $10/ngày
};
```

### 2. Cấu hình Development

```typescript
// Cấu hình cho development
const devConfig = {
    primaryProvider: AIProviderType.LOCAL,      // Miễn phí, nhanh
    fallbackProviders: [AIProviderType.GEMINI], // Backup khi cần
    autoSwitchOnError: true,
    maxRetries: 2,
    healthCheckInterval: 600000,                // 10 phút
    costThreshold: 1.0                          // $1/ngày
};
```

### 3. Error Handling

```typescript
try {
    const prediction = await aiManager.predict(marketData);
    
    // Kiểm tra confidence level
    if (prediction.confidence < 0.7) {
        console.warn('Low confidence prediction:', prediction.confidence);
    }
    
    // Kiểm tra risk level
    if (prediction.riskLevel === 'HIGH') {
        console.warn('High risk prediction detected');
    }
    
} catch (error) {
    console.error('Prediction failed:', error);
    
    // Fallback to manual analysis hoặc conservative strategy
    const conservativePrediction = {
        signal: 'HOLD',
        confidence: 0.5,
        reasoning: 'AI prediction failed, using conservative approach',
        riskLevel: 'LOW'
    };
}
```

### 4. Cost Management

```typescript
// Theo dõi chi phí
const stats = aiManager.getStats();
if (stats.dailyCost > 5.0) {
    console.warn('Daily cost threshold approaching:', stats.dailyCost);
    
    // Chuyển sang provider rẻ hơn
    await aiManager.switchProvider(AIProviderType.LOCAL);
}

// Lên lịch reset cost tracking
setInterval(() => {
    const currentStats = aiManager.getStats();
    console.log('Daily cost report:', {
        cost: currentStats.dailyCost,
        requests: currentStats.requestCount,
        avgCostPerRequest: currentStats.dailyCost / currentStats.requestCount
    });
}, 24 * 60 * 60 * 1000); // Mỗi 24 giờ
```

## Troubleshooting

### Lỗi thường gặp

1. **Provider không khởi tạo được**
   ```
   ❌ Failed to initialize provider gemini: API key not found
   ```
   **Giải pháp**: Kiểm tra API key trong `.env` file

2. **Tất cả providers fail**
   ```
   ❌ All AI providers failed, using fallback prediction
   ```
   **Giải pháp**: Kiểm tra kết nối internet và API keys

3. **Rate limit exceeded**
   ```
   ❌ Rate limit exceeded for provider gemini
   ```
   **Giải pháp**: Tăng `rateLimitPerMinute` hoặc chuyển sang provider khác

### Debug mode

```typescript
// Bật debug logging
process.env.LOG_LEVEL = 'debug';

// Kiểm tra health của tất cả providers
const providersInfo = aiManager.getAllProvidersInfo();
for (const [provider, info] of Object.entries(providersInfo)) {
    console.log(`${provider}: ${info.status}`);
    if (info.lastError) {
        console.error(`Last error: ${info.lastError}`);
    }
}
```

## Kết luận

AI Manager System cung cấp một giải pháp linh hoạt và mạnh mẽ để quản lý nhiều AI providers. Với khả năng fallback tự động, monitoring chi phí, và performance tracking, hệ thống này đảm bảo trading bot của bạn luôn có AI prediction đáng tin cậy với chi phí tối ưu.

Hãy bắt đầu với cấu hình đơn giản và dần dần tùy chỉnh theo nhu cầu cụ thể của dự án.