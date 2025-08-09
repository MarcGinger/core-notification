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
import {
  CreateTransactionCommand,
  SendTransactionNotificationCommand,
} from '../../application/commands';
import { ITransaction } from '../../domain/entities';
import { CreateTransactionProps } from '../../domain/properties';

// generate-api-service

@Injectable()
export class TransactionApplicationService {
  constructor(private readonly commandBus: CommandBus) {}

  async create(
    user: IUserToken,
    dto: CreateTransactionProps,
  ): Promise<ITransaction> {
    const entity = await this.commandBus.execute<
      CreateTransactionCommand,
      ITransaction
    >(new CreateTransactionCommand(user, dto));

    // Send notification via command bus (proper CQRS pattern)
    await this.commandBus.execute(
      new SendTransactionNotificationCommand(entity, user, 'created'),
    );

    return entity;
  }
}
