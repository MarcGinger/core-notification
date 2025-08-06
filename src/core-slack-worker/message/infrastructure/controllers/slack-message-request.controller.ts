/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IUserToken } from 'src/shared/auth';
import {
  SlackMessageRequestDto,
  SlackMessageRequestResponse,
} from '../../application/dtos/slack-message-request.dto';
import { SlackMessageRequestService } from '../../application/services/slack-message-request.service';

/**
 * Controller for handling Slack message requests from external services
 */
@ApiTags('Slack Messages')
@ApiBearerAuth()
@Controller({
  path: 'slack/messages',
  version: '1',
})
export class SlackMessageRequestController {
  constructor(
    private readonly slackMessageRequestService: SlackMessageRequestService,
  ) {}

  /**
   * Request a single Slack message to be sent
   */
  @Post('request')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Request a Slack message to be sent',
    description:
      'Submits a request to send a Slack message. The message will be queued and processed asynchronously.',
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Message request accepted and queued for processing',
    type: SlackMessageRequestResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request data',
  })
  async requestMessage(@Body() request: SlackMessageRequestDto) {
    // TODO: Extract user from JWT token using proper decorator
    // For now using a mock user - replace with @KeycloakUser() user: IUserToken
    const mockUser: IUserToken = {
      sub: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      tenant: 'core', // This should come from the actual JWT
    };

    const correlationId =
      await this.slackMessageRequestService.requestSlackMessage(
        mockUser,
        request,
      );

    return {
      correlationId,
      status: 'accepted',
      message: 'Slack message request queued for processing',
    };
  }

  /**
   * Request multiple Slack messages to be sent
   */
  @Post('request/bulk')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Request multiple Slack messages to be sent',
    description:
      'Submits multiple requests to send Slack messages. All messages will be queued and processed asynchronously.',
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Message requests accepted and queued for processing',
    schema: {
      type: 'object',
      properties: {
        correlationIds: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Array of unique identifiers for tracking the message requests',
        },
        totalRequests: {
          type: 'number',
          description: 'Total number of message requests processed',
        },
        status: {
          type: 'string',
          example: 'accepted',
        },
        message: {
          type: 'string',
          example: 'Slack message requests queued for processing',
        },
      },
    },
  })
  async requestBulkMessages(@Body() requests: SlackMessageRequestDto[]) {
    // TODO: Extract user from JWT token using proper decorator
    const mockUser: IUserToken = {
      sub: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      tenant: 'core',
    };

    const correlationIds =
      await this.slackMessageRequestService.requestBulkSlackMessages(
        mockUser,
        requests,
      );

    return {
      correlationIds,
      totalRequests: requests.length,
      status: 'accepted',
      message: 'Slack message requests queued for processing',
    };
  }

  /**
   * Schedule a Slack message for future delivery
   */
  @Post('schedule')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Schedule a Slack message for future delivery',
    description:
      'Schedules a Slack message to be sent at a specific future time.',
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Message scheduled successfully',
  })
  async scheduleMessage(
    @Body()
    body: SlackMessageRequestDto & { scheduledAt: string },
  ) {
    // TODO: Extract user from JWT token using proper decorator
    const mockUser: IUserToken = {
      sub: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      tenant: 'core',
    };

    const { scheduledAt, ...request } = body;
    const scheduledDate = new Date(scheduledAt);
    console.log(mockUser, request, scheduledDate);
    const correlationId =
      await this.slackMessageRequestService.scheduleSlackMessage(
        mockUser,
        request,
        scheduledDate,
      );

    return {
      correlationId,
      scheduledAt: scheduledDate.toISOString(),
      status: 'scheduled',
      message: 'Slack message scheduled for future delivery',
    };
  }

  /**
   * Request an urgent Slack message with high priority
   */
  @Post('urgent')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Request an urgent Slack message with high priority',
    description:
      'Submits a high-priority request to send a Slack message immediately.',
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Urgent message request accepted and prioritized',
  })
  async requestUrgentMessage(
    @Body() request: Omit<SlackMessageRequestDto, 'priority'>,
  ) {
    // TODO: Extract user from JWT token using proper decorator
    const mockUser: IUserToken = {
      sub: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      tenant: 'core',
    };

    const correlationId =
      await this.slackMessageRequestService.requestUrgentSlackMessage(
        mockUser,
        request,
      );

    return {
      correlationId,
      priority: 'critical',
      status: 'accepted',
      message: 'Urgent Slack message request prioritized for processing',
    };
  }
}
