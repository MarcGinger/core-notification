/**
 * DEPRECATED: GENERIC MESSAGE QUEUE EVENT HANDLER
 *
 * ⚠️  WARNING: This central handler is deprecated in favor of domain-driven architecture
 *
 * MIGRATION PATH:
 * - Each domain should handle its own events directly (like TransactionEventHandler)
 * - Domains should inject their own queues and handle routing logic
 * - Remove dependencies on this central handler from your domain modules
 *
 * This handler violates domain separation by having hardcoded knowledge of:
 * - Multiple domain-specific queues (SLACK_MESSAGE, EMAIL, NOTIFICATION, DATA_PROCESSING)
 * - Domain-specific routing logic
 * - Cross-domain concerns that should be domain-owned
 *
 * @deprecated Use domain-specific event handlers instead (e.g., TransactionEventHandler)
 */

import { IUserToken } from 'src/shared/auth';
import { EventStoreMetaProps } from 'src/shared/infrastructure/event-store';
import { UpdateMessageQueueProps } from '../../../../shared/message-queue';

/**
 * Generic strategy interface for routing messages to different queues
 */
export interface IMessageRoutingStrategy<
  TEventData = UpdateMessageQueueProps,
  TJobOptions = any,
  TTransformedData = any,
> {
  canHandle(eventData: TEventData, meta: EventStoreMetaProps): boolean;
  getQueueName(): string;
  getJobType(): string;
  getJobOptions(eventData: TEventData): TJobOptions;
  transformData(eventData: TEventData, user: IUserToken): TTransformedData;
}

/**
 * Standard job options structure
 */
export interface StandardJobOptions {
  priority: number;
  delay: number;
  attempts: number;
  removeOnComplete: number;
  removeOnFail: number;
  backoff?: {
    type: string;
    delay: number;
  };
}
