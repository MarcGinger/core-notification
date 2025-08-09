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
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { IUserToken } from 'src/shared/auth';
import { CreateMessageQueueCommand } from '../../application/commands';
import { IMessageQueue } from '../../domain/entities';
import { CreateMessageQueueProps } from '../../domain/properties';

// generate-api-service

@Injectable()
export class MessageQueueApplicationService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async create(
    user: IUserToken,
    dto: CreateMessageQueueProps,
  ): Promise<IMessageQueue> {
    const entity = await this.commandBus.execute<
      CreateMessageQueueCommand,
      IMessageQueue
    >(new CreateMessageQueueCommand(user, dto));
    return entity;
  }
}
