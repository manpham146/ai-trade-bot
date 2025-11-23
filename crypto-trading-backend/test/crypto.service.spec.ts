import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { CryptoService } from '../src/security/crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ MASTER_ENCRYPTION_KEY: '12345678901234567890123456789012' })],
        }),
      ],
      providers: [CryptoService],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
    // Manually call onModuleInit to initialize the service
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should encrypt and decrypt text correctly', () => {
    const originalText = 'Hello, Crypto Trading!';
    
    const encrypted = service.encrypt(originalText);
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(originalText);
    
    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(originalText);
  });

  it('should throw error for invalid key length', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ MASTER_ENCRYPTION_KEY: 'invalid-key' })],
        }),
      ],
      providers: [CryptoService],
    }).compile();

    const cryptoService = module.get<CryptoService>(CryptoService);
    expect(() => cryptoService.onModuleInit()).toThrow('MASTER_ENCRYPTION_KEY must be exactly 32 characters');
  });
});