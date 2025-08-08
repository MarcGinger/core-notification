/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { IUserToken } from 'src/shared/auth';
import { IMessage } from '../../domain/entities';
import {
  ProcessMessageProps,
  UpdateMessageProps,
  WorkerMessageResult,
} from '../../domain/properties';
import { ProcessMessageCommand, QueueMessageCommand } from '../commands';

// generate-api-service

@Injectable()
export class MessageService {
  constructor(private readonly commandBus: CommandBus) {}

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
}
