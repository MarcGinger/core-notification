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
import { IMessage } from '../../domain/entities';
import {
  CreateMessageProps,
  ProcessMessageProps,
  UpdateMessageProps,
  WorkerMessageResult,
} from '../../domain/properties';
import {
  CreateMessageCommand,
  ProcessMessageCommand,
  QueueMessageCommand,
} from '../commands';

// generate-api-service

@Injectable()
export class MessageService {
  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly commandBus: CommandBus,
  ) {}

  /**
   * Request a message to be sent
   * This method sends a CreateMessageCommand which triggers the workflow
   */
  async createMessage(
    user: IUserToken,
    request: CreateMessageProps,
  ): Promise<IMessage> {
    const entity = await this.commandBus.execute<
      CreateMessageCommand,
      IMessage
    >(new CreateMessageCommand(user, request));
    return entity;
  }

  async queueMessage(
    user: IUserToken,
    dto: UpdateMessageProps,
  ): Promise<IMessage> {
    const entity = await this.commandBus.execute<QueueMessageCommand, IMessage>(
      new QueueMessageCommand(user, dto),
    );
    return entity;
  }

  async processMessage(
    user: IUserToken,
    dto: ProcessMessageProps,
  ): Promise<WorkerMessageResult> {
    const entity = await this.commandBus.execute<
      ProcessMessageCommand,
      WorkerMessageResult
    >(new ProcessMessageCommand(user, dto));
    return entity;
  }

  /**
   * Validate the Slack message request
   */
  private validateRequest(request: CreateMessageProps): void {
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
