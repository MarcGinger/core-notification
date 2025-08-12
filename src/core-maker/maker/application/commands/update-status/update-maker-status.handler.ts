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
import { UpdateMakerStatusUseCase } from '../../usecases';
import { UpdateMakerStatusCommand } from './update-maker-status.command';
@CommandHandler(UpdateMakerStatusCommand)
export class UpdateMakerStatusHandler
  implements ICommandHandler<UpdateMakerStatusCommand, IMaker>
{
  constructor(
    private readonly makerUpdateStatusUseCase: UpdateMakerStatusUseCase,
  ) {}

  async execute(command: UpdateMakerStatusCommand): Promise<IMaker> {
    const { user, id, status } = command;
    try {
      return await this.makerUpdateStatusUseCase.execute(user, id, status);
    } catch (error) {
      handleCommandError(error, null, MakerExceptionMessage.updateError);
      throw error;
    }
  }
}
