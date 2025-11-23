import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import { LoggingService } from './logging.service';

@Module({
  imports: [
    WinstonModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        level: configService.get<string>('LOG_LEVEL', 'info'),
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json(),
        ),
        defaultMeta: {
          service: 'crypto-trading-backend',
          environment: configService.get<string>('NODE_ENV', 'development'),
        },
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.json(),
            ),
          }),
        ],
        exceptionHandlers: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.json(),
            ),
          }),
        ],
        rejectionHandlers: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.json(),
            ),
          }),
        ],
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [LoggingService],
  exports: [LoggingService, WinstonModule],
})
export class LoggingModule {}