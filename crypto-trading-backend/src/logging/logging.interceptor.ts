import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggingService } from './logging.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly loggingService: LoggingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'unknown';
    const startTime = Date.now();
    
    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          
          this.loggingService.log('HTTP Request', 'HTTP', {
            method,
            url,
            statusCode,
            duration,
            ip,
            userAgent,
            timestamp: new Date().toISOString(),
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          
          this.loggingService.logError(error as Error, 'HTTP', {
            method,
            url,
            duration,
            ip,
            userAgent,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
          });
        }
      })
    );
  }
}
