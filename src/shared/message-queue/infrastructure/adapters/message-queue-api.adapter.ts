/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Inject, Injectable } from '@nestjs/common';
import { ILogger } from 'src/shared/logger';

/**
 * Request data for sending a Message Queue message
 */
export interface MessageQueueApiSendRequest {
  channel: string;
  text: string;
  botToken: string;
}

/**
 * Response from Message Queue API
 */
export interface MessageQueueApiSendResponse {
  success: boolean;
  timestamp?: string;
  channel?: string;
  error?: string;
}

/**
 * MessageQueue API response type for chat.postMessageQueue
 */
interface MessageQueueApiChatPostMessageQueueResponse {
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
 * Infrastructure adapter for MessageQueue Web API
 * Handles all technical concerns of communicating with MessageQueue
 * Contains no business logic - only technical integration
 */
@Injectable()
export class MessageQueueApiAdapter {
  constructor(@Inject('ILogger') private readonly logger: ILogger) {}

  /**
   * Send a message to MessageQueue Web API
   * Pure technical integration - no business logic
   */
  async sendMessage(
    request: MessageQueueApiSendRequest,
  ): Promise<MessageQueueApiSendResponse> {
    this.logger.debug(
      {
        channel: request.channel,
      },
      'Sending message to MessageQueue Web API',
    );

    if (!request.botToken || request.botToken === 'xoxb-your-bot-token') {
      return {
        success: false,
        error: 'SLACK_BOT_TOKEN is not configured properly',
      };
    }

    try {
      // Prepare the MessageQueue API request
      const slackPayload = {
        channel: request.channel,
        text: request.text,
        // Optional: Add more MessageQueue message formatting
        ...(request.channel.startsWith('#') && { link_names: true }), // Enable @mentions
      };

      // Make the actual MessageQueue Web API call
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${request.botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(slackPayload),
      });

      const result =
        (await response.json()) as MessageQueueApiChatPostMessageQueueResponse;

      this.logger.debug(
        {
          channel: request.channel,
          slackResponse: result,
        },
        'MessageQueue API response received',
      );

      // Check if the MessageQueue API call was successful
      if (!result.ok) {
        return {
          success: false,
          error: result.error || 'Unknown MessageQueue API error',
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
        'Failed to send message to MessageQueue Web API',
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
