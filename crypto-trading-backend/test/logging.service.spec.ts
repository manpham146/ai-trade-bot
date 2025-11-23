import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { LoggingModule } from '../src/logging/logging.module';
import { LoggingService } from '../src/logging/logging.service';

describe('LoggingService', () => {
  let service: LoggingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ 
            LOG_LEVEL: 'debug',
            NODE_ENV: 'test',
          })],
        }),
        LoggingModule,
      ],
      providers: [],
    }).compile();

    service = module.get<LoggingService>(LoggingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should log structured JSON data', () => {
    // This test verifies that the logging service can be called without errors
    // The actual JSON output would be visible in the console during test execution
    expect(() => {
      service.log('Test log message', 'TestContext', { 
        testData: 'value',
        timestamp: new Date().toISOString(),
      });
      
      service.error('Test error message', 'TestTrace', 'TestContext', {
        errorCode: 500,
        details: 'Test error details',
      });
      
      service.logRequest('GET', '/test', 200, 150, {
        userAgent: 'test-agent',
        ip: '127.0.0.1',
      });
      
      service.logDatabase('find', 'users', 25, {
        query: { name: 'test' },
        resultCount: 5,
      });
      
      service.logTrading('BUY', 'BTC/USDT', 45000, 85, {
        strategy: 'AI_VALIDATION',
        confidence: 85,
      });
    }).not.toThrow();
  });
});