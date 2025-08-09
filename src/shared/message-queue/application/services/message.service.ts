/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Inject, Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { IUserToken } from 'src/shared/auth';
import { ILogger } from 'src/shared/logger';
import { IMessageQueue } from '../../domain/entities';
import {
  CreateMessageQueueProps,
  ProcessMessageQueueProps,
  UpdateMessageQueueProps,
  WorkerMessageQueueResult,
} from '../../domain/properties';
import {
  CreateMessageQueueCommand,
  ProcessMessageQueueCommand,
  QueueMessageQueueCommand,
} from '../commands';

// generate-api-service

@Injectable()
export class MessageQueueService {
  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly commandBus: CommandBus,
  ) {}

  /**
   * Request a message to be sent
   * This method sends a CreateMessageQueueCommand which triggers the workflow
   */
  async createMessageQueue(
    user: IUserToken,
    request: CreateMessageQueueProps,
  ): Promise<IMessageQueue> {
    const entity = await this.commandBus.execute<
      CreateMessageQueueCommand,
      IMessageQueue
    >(new CreateMessageQueueCommand(user, request));
    return entity;
  }

  async queueMessageQueue(
    user: IUserToken,
    dto: UpdateMessageQueueProps,
  ): Promise<IMessageQueue> {
    const entity = await this.commandBus.execute<
      QueueMessageQueueCommand,
      IMessageQueue
    >(new QueueMessageQueueCommand(user, dto));
    return entity;
  }

  async processMessageQueue(
    user: IUserToken,
    dto: ProcessMessageQueueProps,
  ): Promise<WorkerMessageQueueResult> {
    const entity = await this.commandBus.execute<
      ProcessMessageQueueCommand,
      WorkerMessageQueueResult
    >(new ProcessMessageQueueCommand(user, dto));
    return entity;
  }

  /**
   * Validate the Slack message request
   */
  private validateRequest(request: CreateMessageQueueProps): void {
    if (!request.channel) {
      throw new Error('Channel is required');
    }

    if (!request.configCode) {
      throw new Error('Config code is required');
    }

    // Validate channel format (basic validation)
    if (!request.channel.startsWith('#') && !request.channel.startsWith('@')) {
      throw new Error(
        'Channel must start with # for channels or @ for direct messages',
      );
    }

    // Validate scheduled time is in the future
    if (request.scheduledAt && request.scheduledAt <= new Date()) {
      throw new Error('Scheduled time must be in the future');
    }

    // Validate priority range
    if (request.priority !== undefined) {
      if (request.priority < 1 || request.priority > 20) {
        throw new Error('Priority must be between 1 and 20');
      }
    }
  }

  /**
   * Validate the user token for tenant extraction
   */
  private validateUser(user: IUserToken): void {
    if (!user) {
      throw new Error('User token is required');
    }

    if (!user.sub) {
      throw new Error('User ID (sub) is required in token');
    }

    // Ensure we can extract tenant information
    if (!user.tenant && !user.tenant_id) {
      throw new Error('Tenant information is required in user token');
    }
  }
}
