import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { SecurityModule } from './security/security.module';
import { LoggingModule } from './logging/logging.module';
import { LoggingService } from './logging/logging.service';
import { LoggingInterceptor } from './logging/logging.interceptor';
import { MarketDataModule } from './market-data/market-data.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    LoggingModule,
    DatabaseModule,
    SecurityModule,
    MarketDataModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useFactory: (loggingService: LoggingService) => new LoggingInterceptor(loggingService),
      inject: [LoggingService],
    },
  ],
})
export class AppModule {}
