/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { IException } from '../../domain/exceptions';
import { ILogger } from '../../logger';

interface IPolicyResult {
  status_code?: number;
  message?: string;
  error_code?: string;
}

interface IRequestWithPolicy extends Request {
  policyresult?: IPolicyResult;
}

interface IExceptionResponse extends IException {
  timestamp: string;
  path: string;
}

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  constructor(@Inject('ILogger') protected readonly logger: ILogger) {
    // Constructor implementation
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<IRequestWithPolicy>();

    const { status, message } = this.extractExceptionDetails(
      exception,
      request,
    );
    const responseData = this.buildErrorResponse(status, message, request);

    this.logMessage(request, message, status, exception);
    response.status(status).json(responseData);
  }

  private extractExceptionDetails(
    exception: unknown,
    request: IRequestWithPolicy,
  ): { status: number; message: IException } {
    let status = this.getHttpStatus(exception);
    let message = this.getErrorMessage(exception);

    // Override with policy result if available
    if (request.policyresult) {
      status = request.policyresult.status_code ?? status;
      message = {
        message: request.policyresult.message ?? message.message,
        errorCode: request.policyresult.error_code ?? message.errorCode,
      };
    }

    return { status, message };
  }

  private getHttpStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getErrorMessage(exception: unknown): IException {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return { message: response, statusCode: 400 };
      }

      if (typeof response === 'object' && response !== null) {
        return {
          message: (response as any).message ?? 'Unknown error',
          description:
            (response as any).description ?? 'No description provided',
          code: (response as any).code ?? 'UNKNOWN_ERROR',
          exception: (response as any).exception ?? 'HttpException',
          statusCode: (response as any).statusCode ?? 400,
          domain: (response as any).domain ?? 'INFRASTRUCTURE',
        };
      }
    }

    if (exception instanceof Error) {
      return { message: exception.message, errorCode: '' };
    }

    return { message: 'Unknown error occurred', errorCode: '' };
  }

  private buildErrorResponse(
    status: number,
    message: IException,
    request: IRequestWithPolicy,
  ): IExceptionResponse {
    return {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url ?? '',
      message: message.message,

      description: message.description,
      code: message.errorCode,
      exception: 'AllExceptionFilter',
      statusCode: status,
      domain: 'true',
      errorCode: message.errorCode,
    };
  }

  private logMessage(
    request: IRequestWithPolicy,
    message: IException,
    status: number,
    exception: unknown,
  ): void {
    const logData = {
      method: request.method ?? 'UNKNOWN',
      status,
      errorCode: message.errorCode || null,
      message: message.message || null,
      path: request.path ?? '',
    };

    const logMessage = `${logData.method} ${logData.path} - ${logData.status}`;

    if (status >= 500) {
      const stack = this.extractStackTrace(exception);
      this.logger.error(
        {
          ...logData,
          stack,
        },
        logMessage,
      );
    } else {
      this.logger.warn(logData, logMessage);
    }
  }

  private extractStackTrace(exception: unknown): string {
    if (
      exception instanceof Error &&
      exception.stack &&
      exception.stack.trim() !== '' &&
      !exception.stack.startsWith('HttpException')
    ) {
      return exception.stack;
    }
    return '';
  }
}
