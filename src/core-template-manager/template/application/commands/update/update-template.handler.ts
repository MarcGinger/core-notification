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
import { ITemplate } from '../../../domain/entities';
import { TemplateExceptionMessage } from '../../../domain/exceptions';
import { UpdateTemplateUseCase } from '../../usecases';
import { UpdateTemplateCommand } from './update-template.command';
@CommandHandler(UpdateTemplateCommand)
export class UpdateTemplateHandler
  implements ICommandHandler<UpdateTemplateCommand, ITemplate>
{
  constructor(private readonly templateUpdateUseCase: UpdateTemplateUseCase) {}

  async execute(command: UpdateTemplateCommand): Promise<ITemplate> {
    const { user, code, props } = command;
    try {
      return await this.templateUpdateUseCase.execute(user, code, props);
    } catch (error) {
      handleCommandError(error, null, TemplateExceptionMessage.updateError);
      throw error;
    }
  }
}
