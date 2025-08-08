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
import { MessageFailureCommand, QueueMessageCommand } from '../commands';
import {
  UpdateMessageProps,
  WorkerMessageProps,
} from '../../domain/properties';

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

  async messageFailed(
    user: IUserToken,
    dto: WorkerMessageProps,
  ): Promise<IMessage> {
    const entity = await this.commandBus.execute<
      MessageFailureCommand,
      IMessage
    >(new MessageFailureCommand(user, dto));
    return entity;
  }
}
