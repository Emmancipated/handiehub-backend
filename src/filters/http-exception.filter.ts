import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let errorResponse: any;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      errorResponse = exception.getResponse();
    } else {
      // Handle non-HTTP exceptions (unexpected errors)
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorResponse = {
        statusCode: status,
        message: 'Internal server error',
      };
    }

    // Format the error message for logging
    const errorMessage =
      typeof errorResponse === 'string'
        ? errorResponse
        : JSON.stringify(errorResponse);

    // Log the error with request details
    this.logger.error(
      `[${request.method}] ${request.url} - Status: ${status} - Error: ${errorMessage}`,
    );

    // Log request body for debugging (be careful with sensitive data in production)
    if (request.body && Object.keys(request.body).length > 0) {
      // Remove sensitive fields before logging
      const sanitizedBody = { ...request.body };
      delete sanitizedBody.password;
      delete sanitizedBody.confirmPassword;
      delete sanitizedBody.token;
      this.logger.debug(`Request body: ${JSON.stringify(sanitizedBody)}`);
    }

    // Log stack trace for unexpected errors
    if (!(exception instanceof HttpException)) {
      this.logger.error(`Stack trace:`, (exception as Error).stack);
    }

    // Send response
    response.status(status).json(
      typeof errorResponse === 'object'
        ? errorResponse
        : {
            statusCode: status,
            message: errorResponse,
          },
    );
  }
}
