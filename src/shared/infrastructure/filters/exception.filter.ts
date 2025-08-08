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
import { DomainException, IException } from '../../domain/exceptions';
import { ILogger } from '../../logger';

interface IPolicyResult {
  status_code?: number;
  message?: string;
  error_code?: string;
}

interface IRequestWithPolicy extends Request {
  policyresult?: IPolicyResult;
}

interface IExceptionResponse {
  timestamp: string;
  path: string;
  message: string;
  description: string;
  code: string;
  statusCode: number;
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
        ...message,
        message: request.policyresult.message ?? message.message,
        code: request.policyresult.error_code ?? message.code,
      };
    }

    return { status, message };
  }

  private getHttpStatus(exception: unknown): number {
    if (exception instanceof DomainException) {
      return exception.statusCode;
    }
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getErrorMessage(exception: unknown): IException {
    // Handle domain exceptions first - they already have the proper IException structure
    if (exception instanceof DomainException) {
      return {
        message: exception.message,
        description: exception.description,
        code: exception.code,
        exception: exception.exception,
        statusCode: exception.statusCode,
        domain: exception.domain,
      };
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return {
          message: response,
          description: 'HTTP Exception occurred',
          code: 'HTTP_EXCEPTION',
          exception: 'HttpException',
          statusCode: exception.getStatus(),
          domain: 'INFRASTRUCTURE',
        };
      }

      if (typeof response === 'object' && response !== null) {
        const responseObj = response as Record<string, unknown>;
        return {
          message:
            typeof responseObj.message === 'string'
              ? responseObj.message
              : 'Unknown error',
          description:
            typeof responseObj.description === 'string'
              ? responseObj.description
              : 'No description provided',
          code:
            typeof responseObj.code === 'string'
              ? responseObj.code
              : 'UNKNOWN_ERROR',
          exception:
            typeof responseObj.exception === 'string'
              ? responseObj.exception
              : 'HttpException',
          statusCode:
            typeof responseObj.statusCode === 'number'
              ? responseObj.statusCode
              : exception.getStatus(),
          domain:
            typeof responseObj.domain === 'string'
              ? responseObj.domain
              : 'INFRASTRUCTURE',
        };
      }
    }

    if (exception instanceof Error) {
      return {
        message: exception.message,
        description: 'Runtime error occurred',
        code: 'RUNTIME_ERROR',
        exception: 'Error',
        statusCode: 500,
        domain: 'INFRASTRUCTURE',
      };
    }

    return {
      message: 'Unknown error occurred',
      description: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      exception: 'UnknownException',
      statusCode: 500,
      domain: 'INFRASTRUCTURE',
    };
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
      code: message.code,
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
      errorCode: message.code || null,
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
