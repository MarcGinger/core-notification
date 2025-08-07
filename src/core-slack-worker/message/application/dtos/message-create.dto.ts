/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { CreateMessageProps } from '../../domain/properties';
import { MessageStatusEnum } from '../../domain/entities';
import {
  ApiMessageChannel,
  ApiMessageConfigCode,
  ApiMessageCorrelationId,
  ApiMessageCreatedAt,
  ApiMessageFailureReason,
  ApiMessagePayload,
  ApiMessageRenderedMessage,
  ApiMessageRetryCount,
  ApiMessageScheduledAt,
  ApiMessageSentAt,
  ApiMessageStatus,
  ApiMessageTemplateCode,
  ApiMessageUpdatedAt,
} from './decorators';
import { ApiMessagePriority } from './decorators/priority.decorator';

/**
 * Message create request DTO
 */
export class MessageCreateRequest implements CreateMessageProps {
  @ApiMessageChannel({ required: true })
  readonly channel: string;

  @ApiMessageConfigCode({ required: true })
  readonly configCode: string;

  @ApiMessageTemplateCode()
  readonly templateCode?: string;

  @ApiMessagePayload()
  readonly payload?: Record<string, any>;

  @ApiMessageScheduledAt()
  readonly scheduledAt?: Date;

  @ApiMessagePriority()
  readonly priority?: number;

  @ApiMessageCorrelationId()
  readonly correlationId?: string;
}
