import { Controller, Get, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private configService: ConfigService,
  ) {}

  @Get()
  getHello(): string {
    this.logger.log('Health check endpoint accessed', 'AppController', {
      endpoint: '/',
      method: 'GET',
    });
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): { status: string; timestamp: string; environment: string } {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: this.configService.get<string>('NODE_ENV') || 'development',
    };
    
    this.logger.log('Health check endpoint accessed', 'AppController', {
      endpoint: '/health',
      method: 'GET',
      status: healthData.status,
      environment: healthData.environment,
    });
    
    return healthData;
  }
}