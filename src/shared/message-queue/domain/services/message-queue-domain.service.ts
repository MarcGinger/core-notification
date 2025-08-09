import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IUserToken } from '../../../auth';
import { MessageQueue } from '../aggregates';
import { MessageQueueStatusEnum } from '../entities';
import { CreateMessageQueueProps } from '../properties';
import { MessageQueueIdentifier, ScheduledAt } from '../value-objects';

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
export class MessageQueueDomainService {
  /**
   * TODO TRACKING - Simplified Domain Service Approach
   *
   * MessageQueue is a simple entity with basic properties (code, name, description, active)
   * and no cross-aggregate dependencies. Unlike Product or Rail domain services which
   * manage complex relationships and external dependencies, MessageQueue domain service
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
   * Creates a new MessageQueue aggregate with complex entity resolution and coordination.
   * This method handles the orchestration of fetching related entities and ensuring
   * all dependencies are properly resolved before creating the aggregate.
   */
  async createMessageQueue(
    user: IUserToken,
    createData: CreateMessageQueueProps,
  ): Promise<MessageQueue> {
    // Generate unique identifier for the new message
    const messageCode = randomUUID();

    // Create the aggregate using the factory method which emits creation events
    const message = MessageQueue.create(user, {
      id: MessageQueueIdentifier.fromString(messageCode),
      payload: createData.payload,
      status: MessageQueueStatusEnum.PENDING,
      scheduledAt: ScheduledAt.create(createData.scheduledAt),
      sentAt: new Date(),
      retryCount: 0,
    });

    return Promise.resolve(message);
  }
}
