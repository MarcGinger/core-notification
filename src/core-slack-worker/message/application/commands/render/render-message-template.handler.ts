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
import { MessageExceptionMessage } from '../../../domain/exceptions';
import { RenderMessageTemplateUseCase } from '../../usecases';
import { RenderMessageTemplateCommand } from './render-message-template.command';

@CommandHandler(RenderMessageTemplateCommand)
export class RenderMessageTemplateHandler
  implements ICommandHandler<RenderMessageTemplateCommand, string>
{
  constructor(
    private readonly renderMessageTemplateUseCase: RenderMessageTemplateUseCase,
  ) {}

  async execute(command: RenderMessageTemplateCommand): Promise<string> {
    const { props } = command;
    
    try {
      return await this.renderMessageTemplateUseCase.execute(props);
    } catch (error) {
      handleCommandError(error, null, MessageExceptionMessage.createError);
      throw error;
    }
  }
}
