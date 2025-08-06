/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import {
  IsString,
  IsOptional,
  IsObject,
  IsDateString,
  IsNumber,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO for requesting a Slack message
 */
export class SlackMessageRequestDto {
  @ApiProperty({
    description:
      'Slack channel or user to send the message to. Use #channel-name for channels or @U1234567890 for direct messages (user ID required)',
    example: '#general',
    examples: {
      channel: {
        summary: 'Public Channel',
        value: '#general',
      },
      directMessage: {
        summary: 'Direct Message',
        value: '@U1234567890',
      },
      privateChannel: {
        summary: 'Private Channel',
        value: '#private-team-channel',
      },
    },
    pattern: '^[#@].+',
  })
  @IsString()
  @Matches(/^[#@].+/, {
    message:
      'Channel must start with # for channels or @ for direct messages (use user ID like @U1234567890)',
  })
  readonly channel: string;

  @ApiProperty({
    description: 'Configuration code for Slack settings',
    example: 'default-slack',
  })
  @IsString()
  readonly configCode: string;

  @ApiPropertyOptional({
    description: 'Template code for message formatting',
    example: 'welcome-message',
  })
  @IsOptional()
  @IsString()
  readonly templateCode?: string;

  @ApiPropertyOptional({
    description: 'Dynamic payload for message template variables',
    example: {
      userName: 'John Doe',
      userEmail: 'john@acme-corp.com',
      welcomeMessage: 'Welcome to the team!',
    },
  })
  @IsOptional()
  @IsObject()
  readonly payload?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Schedule the message for future delivery',
    example: '2025-08-03T10:00:00Z',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  readonly scheduledAt?: Date;

  @ApiPropertyOptional({
    description: 'Message priority (1-20, higher number = higher priority)',
    example: 5,
    minimum: 1,
    maximum: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  readonly priority?: number;

  @ApiPropertyOptional({
    description: 'Correlation ID for tracking the request',
    example: 'req-123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  readonly correlationId?: string;
}

/**
 * DTO for bulk Slack message requests
 */
export class SlackMessageBulkRequestDto {
  @ApiProperty({
    description: 'Array of Slack message requests',
    type: [SlackMessageRequestDto],
  })
  readonly requests: SlackMessageRequestDto[];
}

/**
 * DTO for scheduling a Slack message
 */
export class SlackMessageScheduleRequestDto {
  @ApiProperty({
    description: 'Slack message request details',
    type: SlackMessageRequestDto,
  })
  readonly request: Omit<SlackMessageRequestDto, 'scheduledAt'>;

  @ApiProperty({
    description: 'When to send the message',
    example: '2025-08-03T10:00:00Z',
    type: String,
    format: 'date-time',
  })
  @IsDateString()
  readonly scheduledAt: string;
}

/**
 * Response DTO for Slack message requests
 */
export class SlackMessageRequestResponse {
  @ApiProperty({
    description: 'Correlation ID for tracking the request',
    example: 'req-123e4567-e89b-12d3-a456-426614174000',
  })
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

/**
 * Response DTO for bulk Slack message requests
 */
export class SlackMessageBulkRequestResponse {
  @ApiProperty({
    description: 'Array of correlation IDs for tracking the requests',
    example: [
      'req-123e4567-e89b-12d3-a456-426614174000',
      'req-234f5678-f90c-23d4-b567-537725285111',
    ],
  })
  readonly correlationIds: string[];

  @ApiProperty({
    description: 'Total number of requests processed',
    example: 2,
  })
  readonly totalRequests: number;

  @ApiProperty({
    description: 'Request status',
    example: 'accepted',
  })
  readonly status: string;

  @ApiProperty({
    description: 'Response message',
    example: 'Slack message requests queued for processing',
  })
  readonly message: string;
}

/**
 * Response DTO for scheduled Slack messages
 */
export class SlackMessageScheduleResponse {
  @ApiProperty({
    description: 'Correlation ID for tracking the request',
    example: 'req-123e4567-e89b-12d3-a456-426614174000',
  })
  readonly correlationId: string;

  @ApiProperty({
    description: 'Scheduled delivery time',
    example: '2025-08-03T10:00:00Z',
  })
  readonly scheduledAt: string;

  @ApiProperty({
    description: 'Request status',
    example: 'scheduled',
  })
  readonly status: string;

  @ApiProperty({
    description: 'Response message',
    example: 'Slack message scheduled for future delivery',
  })
  readonly message: string;
}
