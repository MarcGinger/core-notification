/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { handleCommandError } from 'src/shared/application/commands';
import { IMaker } from '../../../domain/entities';
import { MakerExceptionMessage } from '../../../domain/exceptions';
import { CreateMakerUseCase } from '../../usecases';
import { CreateMakerCommand } from './create-maker.command';
@CommandHandler(CreateMakerCommand)
export class CreateMakerHandler
  implements ICommandHandler<CreateMakerCommand, IMaker>
{
  constructor(private readonly makerCreateUseCase: CreateMakerUseCase) {}

  async execute(command: CreateMakerCommand): Promise<IMaker> {
    const { user, props } = command;
    try {
      return await this.makerCreateUseCase.execute(user, props);
    } catch (error) {
      handleCommandError(error, null, MakerExceptionMessage.createError);
      throw error;
    }
  }
}
