/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { IUserToken } from 'src/shared/auth';
import { QUEUE_NAMES } from 'src/shared/infrastructure/bullmq';
import { ILogger } from 'src/shared/logger';
import { MessageService } from '../../application/services';

/**
 * Job data interface for Message delivery
 */
export interface MessageJobData {
  id: string; // Unique identifier for the message on eventstore
  messageId: string;
  tenant: string;
  channel: string;
  renderedMessage: string;
  correlationId: string;
  configCode: string;
  isRetry?: boolean;
  retryAttempt?: number;
  priority?: 'normal' | 'urgent' | 'critical';
}

/**
 * BullMQ processor for handling Message delivery jobs
 * This is now a thin coordinator that delegates business logic to use cases
 * Following DDD principles - infrastructure should only handle technical concerns
 */
@Injectable()
@Processor(QUEUE_NAMES.SLACK_MESSAGE)
export class MessageProcessor extends WorkerHost {
  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly messageService: MessageService,
  ) {
    super();
    this.logger.log(
      {
        component: 'MessageProcessor',
        method: 'constructor',
      },
      'MessageProcessor constructor called - processor instantiated',
    );
  }

  onModuleInit() {
    this.logger.log(
      {
        component: 'MessageProcessor',
        method: 'onModuleInit',
      },
      'MessageProcessor onModuleInit called - worker should be starting',
    );
  }

  @OnWorkerEvent('ready')
  onReady() {
    this.logger.log(
      {
        component: 'MessageProcessor',
        method: 'onReady',
      },
      'MessageProcessor worker is ready and listening for jobs',
    );
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(
      {
        component: 'MessageProcessor',
        method: 'onActive',
        jobId: job.id,
      },
      'MessageProcessor worker started processing job',
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(
      {
        component: 'MessageProcessor',
        method: 'onCompleted',
        jobId: job.id,
      },
      'MessageProcessor worker completed job',
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, err: Error) {
    this.logger.error(
      {
        component: 'MessageProcessor',
        method: 'onFailed',
        jobId: job?.id,
        error: err.message,
      },
      'MessageProcessor worker failed to process job',
    );
  }

  async process(job: Job<MessageJobData>): Promise<any> {
    const { data } = job;
    const logContext = {
      jobId: job.id,
      messageId: data.messageId,
      correlationId: data.correlationId,
      tenant: data.tenant,
      channel: data.channel,
      isRetry: data.isRetry || false,
      retryAttempt: data.retryAttempt || 0,
    };

    this.logger.log(
      {
        ...logContext,
        component: 'MessageProcessor',
        method: 'process',
      },
      'MessageProcessor.process() called - starting job processing',
    );

    try {
      this.logger.log(logContext, 'Processing Message delivery job');

      // Create system user token for audit purposes
      const systemUser: IUserToken = {
        sub: 'system',
        name: 'System',
        email: 'system@internal',
        tenant: data.tenant,
      };

      // Delegate to use case - all business logic is handled there
      const result = await this.messageService.processMessage(systemUser, {
        id: data.messageId,
        isRetry: data.isRetry,
        retryAttempt: data.retryAttempt || job.attemptsMade,
        priority: data.priority || 'normal',
      });

      if (result.success) {
        this.logger.log(
          {
            ...logContext,
            slackTimestamp: result.slackTimestamp,
            slackChannel: result.slackChannel,
          },
          'Successfully delivered Message',
        );

        return {
          ok: true,
          channel: result.slackChannel,
          ts: result.slackTimestamp,
          message: {
            text: data.renderedMessage,
            user: 'bot',
            ts: result.slackTimestamp,
          },
        };
      } else {
        // Handle failure based on use case result
        if (result.isRetryable) {
          // For retryable errors, throw to let BullMQ handle retry logic
          const error = new Error(result.error || 'Unknown retryable error');
          throw error;
        } else {
          // For permanent errors, don't throw (prevents retries)
          this.logger.error(
            {
              ...logContext,
              error: result.error,
              userFriendlyMessage: result.userFriendlyMessage,
              errorType: 'permanent',
            },
            'Message delivery permanently failed',
          );
          return; // Don't throw to prevent retries
        }
      }
    } catch (error) {
      // This catches unexpected errors and use case retryable errors
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        {
          ...logContext,
          error: errorMessage,
        },
        'Message delivery failed - will be retried by BullMQ',
      );

      // Re-throw to let BullMQ handle retry logic
      throw error;
    }
  }
}
