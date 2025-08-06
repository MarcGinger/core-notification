/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Injectable, Inject } from '@nestjs/common';
import { ILogger } from 'src/shared/logger';

/**
 * Request data for sending a Slack message
 */
export interface SlackApiSendRequest {
  channel: string;
  text: string;
  botToken: string;
}

/**
 * Response from Slack API
 */
export interface SlackApiSendResponse {
  success: boolean;
  timestamp?: string;
  channel?: string;
  error?: string;
}

/**
 * Slack API response type for chat.postMessage
 */
interface SlackApiChatPostMessageResponse {
  ok: boolean;
  channel?: string;
  ts?: string;
  message?: {
    text?: string;
    user?: string;
    ts?: string;
  };
  error?: string;
}

/**
 * Infrastructure adapter for Slack Web API
 * Handles all technical concerns of communicating with Slack
 * Contains no business logic - only technical integration
 */
@Injectable()
export class SlackApiAdapter {
  constructor(@Inject('ILogger') private readonly logger: ILogger) {}

  /**
   * Send a message to Slack Web API
   * Pure technical integration - no business logic
   */
  async sendMessage(
    request: SlackApiSendRequest,
  ): Promise<SlackApiSendResponse> {
    this.logger.debug(
      {
        channel: request.channel,
      },
      'Sending message to Slack Web API',
    );

    if (!request.botToken || request.botToken === 'xoxb-your-bot-token') {
      return {
        success: false,
        error: 'SLACK_BOT_TOKEN is not configured properly',
      };
    }

    try {
      // Prepare the Slack API request
      const slackPayload = {
        channel: request.channel,
        text: request.text,
        // Optional: Add more Slack message formatting
        ...(request.channel.startsWith('#') && { link_names: true }), // Enable @mentions
      };

      // Make the actual Slack Web API call
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${request.botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(slackPayload),
      });

      const result = (await response.json()) as SlackApiChatPostMessageResponse;

      this.logger.debug(
        {
          channel: request.channel,
          slackResponse: result,
        },
        'Slack API response received',
      );

      // Check if the Slack API call was successful
      if (!result.ok) {
        return {
          success: false,
          error: result.error || 'Unknown Slack API error',
        };
      }

      // Return successful response
      return {
        success: true,
        timestamp: result.ts || `${Date.now()}.000000`,
        channel: result.channel || request.channel,
      };
    } catch (error) {
      this.logger.error(
        {
          channel: request.channel,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to send message to Slack Web API',
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
