/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { Injectable } from '@nestjs/common';

/**
 * Domain service for Slack delivery business rules and error classification
 * Contains the core business logic for determining how to handle Slack API errors
 * and retry strategies based on domain knowledge.
 */
@Injectable()
export class SlackDeliveryDomainService {
  /**
   * Classifies a Slack API error as either permanent (don't retry) or retryable
   * This encapsulates the business rules around which Slack errors should be retried
   */
  classifySlackError(slackError: string): 'permanent' | 'retryable' {
    // Business rules for permanent errors - these should never be retried
    const permanentErrors = [
      'channel_not_found', // Channel doesn't exist or bot doesn't have access
      'not_in_channel', // Bot not added to channel
      'cannot_dm_bot', // Cannot send DM to bot users
      'user_not_found', // User ID is invalid
      'account_inactive', // Slack account is deactivated
      'token_revoked', // OAuth token has been revoked
      'invalid_auth', // Authentication credentials are invalid
      'msg_too_long', // Message exceeds Slack's length limits
    ];

    if (permanentErrors.includes(slackError)) {
      return 'permanent';
    }

    // Business rules for retryable errors
    const retryableErrors = [
      'ratelimited', // Rate limiting - can retry with backoff
      'internal_error', // Slack internal error - temporary
      'service_unavailable', // Slack service temporarily down
    ];

    if (retryableErrors.includes(slackError)) {
      return 'retryable';
    }

    // Default: unknown errors are retryable (fail-safe approach)
    // This allows for investigation while not permanently failing messages
    return 'retryable';
  }

  /**
   * Determines if a message should be retried based on business rules
   * Takes into account current attempt count and message priority
   */
  shouldRetryMessage(
    currentAttempt: number,
    maxAttempts: number,
    priority: 'normal' | 'urgent' | 'critical',
  ): boolean {
    // Business rule: urgent and critical messages get more retry attempts
    const effectiveMaxAttempts =
      priority === 'urgent' || priority === 'critical'
        ? Math.max(maxAttempts, 6)
        : maxAttempts;

    return currentAttempt < effectiveMaxAttempts;
  }

  /**
   * Calculates retry delay based on business rules
   * Implements exponential backoff with different strategies per priority
   */
  calculateRetryDelay(
    attempt: number,
    priority: 'normal' | 'urgent' | 'critical' = 'normal',
  ): number {
    // Business rule: urgent messages have faster retry
    const baseDelay =
      priority === 'urgent' || priority === 'critical' ? 1000 : 2000;

    // Exponential backoff: delay = baseDelay * (2 ^ attempt)
    return Math.min(baseDelay * Math.pow(2, attempt), 30000); // Cap at 30 seconds
  }

  /**
   * Generates user-friendly error messages for permanent failures
   * This encapsulates the business knowledge of what each error means
   */
  generateUserFriendlyErrorMessage(
    slackError: string,
    channel: string,
  ): string {
    const errorMessages: Record<string, string> = {
      channel_not_found: `Channel "${channel}" not found. For DMs, use user ID format like @U1234567890`,
      not_in_channel: `Bot is not added to channel "${channel}". Please add the bot to the channel or use user ID for DMs`,
      cannot_dm_bot: `Cannot send direct message to bot user "${channel}"`,
      user_not_found: `User "${channel}" not found. Please check the user ID format`,
      account_inactive: `Slack account is inactive and cannot receive messages`,
      token_revoked: `Slack authentication token has been revoked. Please reconfigure the integration`,
      invalid_auth: `Slack authentication failed. Please check the bot token configuration`,
      msg_too_long: `Message is too long for Slack. Please shorten the message content`,
    };

    return errorMessages[slackError] || `Slack delivery failed: ${slackError}`;
  }

  /**
   * Validates if a channel format is correct according to business rules
   */
  validateChannelFormat(channel: string): {
    isValid: boolean;
    reason?: string;
  } {
    if (!channel || channel.trim().length === 0) {
      return { isValid: false, reason: 'Channel cannot be empty' };
    }

    // Business rule: channels must start with # or @ (for users)
    if (!channel.startsWith('#') && !channel.startsWith('@')) {
      return {
        isValid: false,
        reason:
          'Channel must start with # for channels or @ for direct messages',
      };
    }

    // Business rule: user IDs should be in format @U1234567890
    if (channel.startsWith('@') && !/^@U[A-Z0-9]{8,}$/.test(channel)) {
      return {
        isValid: false,
        reason:
          'User ID format should be @U followed by alphanumeric characters (e.g., @U1234567890)',
      };
    }

    return { isValid: true };
  }
}
