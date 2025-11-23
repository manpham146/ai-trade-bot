import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggingService } from '../../logging/logging.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly loggingService: LoggingService) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorDetails: any = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string' ? exceptionResponse : (exceptionResponse as any).message;
      errorDetails = typeof exceptionResponse === 'object' ? exceptionResponse : { message };
    } else if (exception instanceof Error) {
      message = exception.message;
      errorDetails = {
        message: exception.message,
        stack: exception.stack,
      };
    } else {
      // Handle non-Error objects
      message = String(exception);
      errorDetails = { exception };
    }

    // Log the error with context
    this.loggingService.logError(new Error(message), 'GlobalExceptionFilter', {
      status,
      message,
      path: request.url,
      method: request.method,
      ip: request.ip,
      userAgent: request.get('user-agent'),
      timestamp: new Date().toISOString(),
      errorDetails,
    });

    // Send structured error response
    const errorResponse = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error: {
        type: exception.constructor.name,
        details: status === HttpStatus.INTERNAL_SERVER_ERROR 
          ? 'An unexpected error occurred' 
          : errorDetails,
      },
    };

    response.status(status).json(errorResponse);
  }
}
