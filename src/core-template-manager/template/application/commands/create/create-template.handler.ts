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
import { CreateTemplateUseCase } from '../../usecases';
import { CreateTemplateCommand } from './create-template.command';
@CommandHandler(CreateTemplateCommand)
export class CreateTemplateHandler
  implements ICommandHandler<CreateTemplateCommand, ITemplate>
{
  constructor(private readonly templateCreateUseCase: CreateTemplateUseCase) {}

  async execute(command: CreateTemplateCommand): Promise<ITemplate> {
    const { user, props } = command;
    try {
      return await this.templateCreateUseCase.execute(user, props);
    } catch (error) {
      handleCommandError(error, null, TemplateExceptionMessage.createError);
      throw error;
    }
  }
}
