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
import { UpdateMakerUseCase } from '../../usecases';
import { UpdateMakerCommand } from './update-maker.command';
@CommandHandler(UpdateMakerCommand)
export class UpdateMakerHandler
  implements ICommandHandler<UpdateMakerCommand, IMaker>
{
  constructor(private readonly makerUpdateUseCase: UpdateMakerUseCase) {}

  async execute(command: UpdateMakerCommand): Promise<IMaker> {
    const { user, id, props } = command;
    try {
      return await this.makerUpdateUseCase.execute(user, id, props);
    } catch (error) {
      handleCommandError(error, null, MakerExceptionMessage.updateError);
      throw error;
    }
  }
}
