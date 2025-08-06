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
import { CreateMessageProps } from '../../domain/properties';
import { IMessage } from '../../domain/entities';
import { CreateMessageCommand } from '../../application/commands';

// generate-api-service

@Injectable()
export class MessageApplicationService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async create(user: IUserToken, dto: CreateMessageProps): Promise<IMessage> {
    const entity = await this.commandBus.execute<
      CreateMessageCommand,
      IMessage
    >(new CreateMessageCommand(user, dto));
    return entity;
  }
}
