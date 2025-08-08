/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { ApiProperty } from '@nestjs/swagger';
import { ApiMessageCorrelationId } from './decorators';

/**
 * Response DTO for Slack message requests
 */
export class SlackMessageRequestResponse {
  @ApiMessageCorrelationId()
  readonly correlationId: string;

  @ApiProperty({
    description: 'Request status',
    example: 'accepted',
  })
  readonly status: string;

  @ApiProperty({
    description: 'Response message',
    example: 'Slack message request queued for processing',
  })
  readonly message: string;
}
