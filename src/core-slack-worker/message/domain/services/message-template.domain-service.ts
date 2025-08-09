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
import { IMessage } from '../entities';

/**
 * Domain service for message template rendering business logic.
 * Contains pure business rules for template validation and message rendering.
 *
 * This implementation showcases:
 * - Pure domain logic with no external dependencies
 * - Business rules for template validation
 * - Message rendering algorithms
 * - Payload transformation logic
 */
@Injectable()
export class MessageTemplateDomainService {
  /**
   * Validates if a template code is valid for rendering
   * @param templateCode - The template identifier
   * @returns boolean - Whether the template is valid
   */
  validateTemplateCode(templateCode?: string): boolean {
    if (!templateCode) {
      return false;
    }

    // Business rule: Template codes must be alphanumeric with dashes/underscores
    const templateCodePattern = /^[a-zA-Z0-9_-]+$/;
    return templateCodePattern.test(templateCode) && templateCode.length <= 50;
  }

  /**
   * Validates if payload is suitable for rendering
   * @param payload - The data payload
   * @returns boolean - Whether the payload is valid
   */
  validatePayload(payload?: Record<string, any>): boolean {
    if (!payload) {
      return false;
    }

    // Business rule: Payload must not be empty and should have reasonable size
    const keys = Object.keys(payload);
    return keys.length > 0 && keys.length <= 100;
  }

  /**
   * Determines if template rendering is required
   * @param templateCode - The template identifier
   * @param payload - The data payload
   * @returns boolean - Whether rendering is needed
   */
  shouldRenderTemplate(props: IMessage): boolean {
    return (
      this.validateTemplateCode(props.templateCode) &&
      this.validatePayload(props.payload)
    );
  }

  /**
   * Renders a message using template content and payload
   * This is the core business logic for message rendering
   * @param templateContent - The template content with placeholders
   * @param payload - The data to inject into the template
   * @returns string - The rendered message
   */
  renderMessageContent(
    templateContent: string,
    payload: Record<string, any>,
  ): string {
    let renderedMessage = templateContent;

    // Business rule: Replace placeholders in format {{key}}
    Object.entries(payload).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const stringValue = this.convertValueToString(value);
      renderedMessage = renderedMessage.replace(
        new RegExp(placeholder, 'g'),
        stringValue,
      );
    });

    // Business rule: Clean up any remaining unreplaced placeholders
    renderedMessage = renderedMessage.replace(
      /\{\{[^}]+\}\}/g,
      '[MISSING_VALUE]',
    );

    return renderedMessage;
  }

  /**
   * Generates a default message when no template is available
   * @param channel - The target channel
   * @param configCode - The configuration code
   * @returns string - A default message
   */
  generateDefaultMessage(message: IMessage): string {
    const configPart = message.configCode ? ` (${message.configCode})` : '';
    return `Message for ${message.channel}${configPart} => ${JSON.stringify(message.payload) || '[No Text]'} `;
  }

  /**
   * Converts payload values to safe string representations
   * @param value - The value to convert
   * @returns string - Safe string representation
   */
  private convertValueToString(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (typeof value === 'object') {
      // Business rule: Objects should be JSON stringified but truncated if too long
      const jsonString = JSON.stringify(value);
      return jsonString.length > 200
        ? jsonString.substring(0, 200) + '...'
        : jsonString;
    }

    return String(value);
  }

  /**
   * Validates the final rendered message
   * @param renderedMessage - The rendered message content
   * @returns boolean - Whether the message is valid
   */
  validateRenderedMessage(renderedMessage: string): boolean {
    // Business rules for rendered message validation

    // Rule 1: Message must not be empty
    if (!renderedMessage || renderedMessage.trim().length === 0) {
      return false;
    }

    // Rule 2: Message must not exceed Slack's message limit
    if (renderedMessage.length > 4000) {
      return false;
    }

    // Rule 3: Check for unreplaced placeholders (but allow some flexibility)
    const missingValueCount = (
      renderedMessage.match(/\[MISSING_VALUE\]/g) || []
    ).length;
    const totalPlaceholderCount = (
      renderedMessage.match(/\{\{[^}]+\}\}/g) || []
    ).length;

    // Rule 4: If more than 50% of placeholders are missing, consider invalid
    if (missingValueCount > 0 && totalPlaceholderCount === 0) {
      // Only missing values, no valid placeholders - likely bad template
      return missingValueCount <= 2; // Allow up to 2 missing values
    }

    // Rule 5: Message should not be just whitespace or special characters
    const meaningfulContent = renderedMessage.replace(/[\s[\]{}]/g, '');
    if (meaningfulContent.length < 3) {
      return false;
    }

    // Rule 6: Basic content validation - should contain some alphanumeric characters
    const hasAlphanumeric = /[a-zA-Z0-9]/.test(renderedMessage);
    if (!hasAlphanumeric) {
      return false;
    }

    return true;
  }
}
