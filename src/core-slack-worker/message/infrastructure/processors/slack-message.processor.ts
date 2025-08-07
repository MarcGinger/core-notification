/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { ILogger } from 'src/shared/logger';
import { IUserToken } from 'src/shared/auth';
import { QUEUE_NAMES } from 'src/shared/infrastructure/bullmq';
import { SendSlackMessageUseCase } from '../../application/usecases';

/**
 * Job data interface for Slack message delivery
 */
export interface SlackMessageJobData {
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
 * BullMQ processor for handling Slack message delivery jobs
 * This is now a thin coordinator that delegates business logic to use cases
 * Following DDD principles - infrastructure should only handle technical concerns
 */
@Injectable()
@Processor(QUEUE_NAMES.SLACK_MESSAGE)
export class SlackMessageProcessor extends WorkerHost {
  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly sendSlackMessageUseCase: SendSlackMessageUseCase,
  ) {
    super();
    this.logger.log(
      {
        component: 'SlackMessageProcessor',
        method: 'constructor',
      },
      'SlackMessageProcessor constructor called - processor instantiated',
    );
  }

  onModuleInit() {
    this.logger.log(
      {
        component: 'SlackMessageProcessor',
        method: 'onModuleInit',
      },
      'SlackMessageProcessor onModuleInit called - worker should be starting',
    );
  }

  @OnWorkerEvent('ready')
  onReady() {
    this.logger.log(
      {
        component: 'SlackMessageProcessor',
        method: 'onReady',
      },
      'SlackMessageProcessor worker is ready and listening for jobs',
    );
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(
      {
        component: 'SlackMessageProcessor',
        method: 'onActive',
        jobId: job.id,
      },
      'SlackMessageProcessor worker started processing job',
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(
      {
        component: 'SlackMessageProcessor',
        method: 'onCompleted',
        jobId: job.id,
      },
      'SlackMessageProcessor worker completed job',
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, err: Error) {
    this.logger.error(
      {
        component: 'SlackMessageProcessor',
        method: 'onFailed',
        jobId: job?.id,
        error: err.message,
      },
      'SlackMessageProcessor worker failed to process job',
    );
  }

  async process(job: Job<SlackMessageJobData>): Promise<any> {
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
        component: 'SlackMessageProcessor',
        method: 'process',
      },
      'SlackMessageProcessor.process() called - starting job processing',
    );

    try {
      this.logger.log(logContext, 'Processing Slack message delivery job');

      // Create system user token for audit purposes
      const systemUser: IUserToken = {
        sub: 'system',
        name: 'System',
        email: 'system@internal',
        tenant: data.tenant,
      };

      // Delegate to use case - all business logic is handled there
      const result = await this.sendSlackMessageUseCase.execute(systemUser, {
        messageId: data.messageId,
        tenant: data.tenant,
        channel: data.channel,
        renderedMessage: data.renderedMessage,
        correlationId: data.correlationId,
        configCode: data.configCode,
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
          'Successfully delivered Slack message',
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
            'Slack message delivery permanently failed',
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
        'Slack message delivery failed - will be retried by BullMQ',
      );

      // Re-throw to let BullMQ handle retry logic
      throw error;
    }
  }
}
