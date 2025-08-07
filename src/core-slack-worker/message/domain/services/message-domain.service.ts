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
import { IUserToken } from 'src/shared/auth';
import { randomUUID } from 'crypto';
import { Message } from '../aggregates';
import { CreateMessageProps } from '../properties';
import { MessageIdentifier } from '../value-objects';
import { MessageStatusEnum } from '../entities';

/**
 * Domain service for handling complex business operations that span multiple aggregates
 * or require complex coordination. This service contains business logic that doesn't
 * naturally fit within a single aggregate.
 *
 * Key responsibilities:
 * - Complex entity creation involving multiple related entities
 * - Business operations requiring coordination across aggregates
 * - Complex validation that involves external entity dependencies
 * - Business rules that span multiple bounded contexts
 */
@Injectable()
export class MessageDomainService {
  /**
   * TODO TRACKING - Simplified Domain Service Approach
   *
   * Message is a simple entity with basic properties (code, name, description, active)
   * and no cross-aggregate dependencies. Unlike Product or Rail domain services which
   * manage complex relationships and external dependencies, Message domain service
   * focuses on orchestration without complex validation:
   *
   * 1. Entity Creation: Simple aggregate creation with basic validation
   * 2. Update Coordination: Direct delegation to aggregate methods
   * 3. Deletion Orchestration: Simple delegation to aggregate deletion
   *
   * Complex business rules are handled by the aggregate itself via validateState().
   * This follows DDD principles - domain services only when business logic spans aggregates.
   */
  /**
   * Creates a new Message aggregate with complex entity resolution and coordination.
   * This method handles the orchestration of fetching related entities and ensuring
   * all dependencies are properly resolved before creating the aggregate.
   */
  async createMessage(
    user: IUserToken,
    createData: CreateMessageProps,
  ): Promise<Message> {
    // Generate unique identifier for the new message
    const messageCode = randomUUID();

    // Create the aggregate using the factory method which emits creation events
    const message = Message.create(user, {
      id: MessageIdentifier.fromString(messageCode),
      configCode: createData.configCode,
      channel: createData.channel,
      templateCode: createData.templateCode,
      payload: createData.payload,
      status: MessageStatusEnum.PENDING,
      scheduledAt: createData.scheduledAt,
      sentAt: new Date(),
      retryCount: 0,
    });

    return Promise.resolve(message);
  }
}
