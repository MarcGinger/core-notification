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

/**
 * Message create request DTO
 */
export class MessageCreateRequest implements CreateMessageProps {
  @ApiMessageConfigCode({ required: true })
  readonly configCode: string;

  @ApiMessageChannel({ required: true })
  readonly channel: string;

  @ApiMessageTemplateCode()
  readonly templateCode?: string;

  @ApiMessagePayload()
  readonly payload?: Record<string, any>;

  @ApiMessageRenderedMessage()
  readonly renderedMessage?: string;

  @ApiMessageStatus({ required: true })
  readonly status: MessageStatusEnum;

  @ApiMessageScheduledAt()
  readonly scheduledAt?: Date;

  @ApiMessageSentAt()
  readonly sentAt?: Date;

  @ApiMessageFailureReason()
  readonly failureReason?: string;

  @ApiMessageCorrelationId()
  readonly correlationId?: string;

  @ApiMessageRetryCount({ required: true })
  readonly retryCount: number;

  @ApiMessageCreatedAt({ required: true })
  readonly createdAt: Date;

  @ApiMessageUpdatedAt({ required: true })
  readonly updatedAt: Date;
}
