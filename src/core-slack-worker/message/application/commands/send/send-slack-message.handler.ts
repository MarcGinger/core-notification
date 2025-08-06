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
import { IMessage } from '../../../domain/entities';
import { MessageExceptionMessage } from '../../../domain/exceptions';
import { CreateMessageUseCase, QueueSlackMessageUseCase } from '../../usecases';
import { RenderMessageTemplateUseCase } from '../../usecases/render-message-template.usecase';
import { SendSlackMessageCommand } from './send-slack-message.command';

@CommandHandler(SendSlackMessageCommand)
export class SendSlackMessageHandler
  implements ICommandHandler<SendSlackMessageCommand, IMessage>
{
  constructor(
    private readonly messageCreateUseCase: CreateMessageUseCase,
    private readonly queueSlackMessageUseCase: QueueSlackMessageUseCase,
    private readonly renderMessageTemplateUseCase: RenderMessageTemplateUseCase,
  ) {}

  async execute(command: SendSlackMessageCommand): Promise<IMessage> {
    const { user, props } = command;
    try {
      // Step 1: Create the message entity
      const message = await this.messageCreateUseCase.execute(user, props);

      // Step 2: Render the message template if needed
      let renderedMessage = props.renderedMessage;
      if (!renderedMessage && props.templateCode) {
        const tenant = user.tenant || user.tenant_id || 'default';
        renderedMessage = await this.renderMessageTemplateUseCase.execute({
          templateCode: props.templateCode,
          payload: props.payload || {},
          channel: props.channel,
          tenant,
          configCode: props.configCode,
        });
      }

      // Step 3: Queue the message for Slack delivery
      const tenant = user.tenant || user.tenant_id || 'default';
      await this.queueSlackMessageUseCase.execute({
        tenant,
        configCode: props.configCode,
        channel: props.channel,
        templateCode: props.templateCode,
        payload: props.payload,
        renderedMessage: renderedMessage || 'Default message',
        scheduledAt: props.scheduledAt,
        correlationId: props.correlationId || message.id,
        priority: 10, // Default priority
      });

      return message;
    } catch (error) {
      handleCommandError(error, null, MessageExceptionMessage.createError);
      throw error;
    }
  }
}
