import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { LoggingService } from './logging/logging.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { GlobalExceptionFilter } from './common/filters/global-exception-filter-new';

async function bootstrap() {
  let logger: LoggingService;
  
  try {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);
    
    // Use Winston logger instead of console.log
    app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
    logger = app.get(LoggingService);
    
    // Register global exception filter
    app.useGlobalFilters(new GlobalExceptionFilter(logger));
    
    const port = configService.get<number>('PORT') || 3001;
    const nodeEnv = configService.get<string>('NODE_ENV', 'development');
    
    // Global validation pipe
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    // Enable CORS
    app.enableCors({
      origin: configService.get<string>('CORS_ORIGIN') || '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });

    // Process-level error handlers
    setupProcessHandlers(logger);

    await app.listen(port);
    
    logger.log('Application started successfully', 'Bootstrap', {
      port,
      environment: nodeEnv,
      timestamp: new Date().toISOString(),
    });

    // Graceful shutdown handler
    setupGracefulShutdown(app, logger);
    
    } catch (error) {
    if (logger) {
      logger.logError(error as Error, 'Bootstrap', { error: (error as any).message, stack: (error as any).stack });
    } else {
      console.error('Failed to start application:', error);
    }
    process.exit(1);
  }
}

function setupProcessHandlers(logger: LoggingService) {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.logError(reason instanceof Error ? reason : new Error(String(reason)), 'ProcessHandler', {
      reason: (reason as any)?.message || reason,
      stack: (reason as any)?.stack,
      promise: promise.toString(),
    });
    // In production, you might want to gracefully shutdown here
    // For now, we log and continue
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.logError(error as Error, 'ProcessHandler', {
      error: error.message,
      stack: error.stack,
    });
    // Graceful shutdown for uncaught exceptions
    process.exit(1);
  });

  // Handle SIGTERM (Docker/Kubernetes graceful shutdown)
  process.on('SIGTERM', () => {
    logger.log('Received SIGTERM, initiating graceful shutdown', 'ProcessHandler');
    process.exit(0);
  });

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => {
    logger.log('Received SIGINT, initiating graceful shutdown', 'ProcessHandler');
    process.exit(0);
  });
}

function setupGracefulShutdown(app: any, logger: LoggingService) {
  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.log(`Received ${signal}, starting graceful shutdown...`, 'GracefulShutdown');
    
    try {
      // Close NestJS application
      await app.close();
      logger.log('Application closed successfully', 'GracefulShutdown');
      
      // Close database connections, cleanup resources here if needed
      
      process.exit(0);
    } catch (error) {
      logger.logError(error as Error, 'GracefulShutdown', { error: error.message });
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
