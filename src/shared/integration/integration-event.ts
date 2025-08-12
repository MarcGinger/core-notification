import { IUserToken } from '../auth';

/**
 * Canonical envelope for integration events (public cross-module contracts)
 * See COPILOT_INSTRUCTIONS.md for required fields and usage.
 */
export interface IntegrationEventActor extends IUserToken {
  type: 'user' | 'service';
}

export interface IntegrationEvent<T = unknown> {
  /** Event type, e.g. "notification.requested.v1" */
  type: string;
  /** Schema version, e.g. 1 */
  version: number;
  /** Unique event ID (UUID) */
  eventId: string;
  /** Correlates events across systems (traceability) */
  correlationId?: string;
  /** Tenant identifier for multi-tenancy */
  tenant?: string;
  /** Idempotency key for deduplication (producer-provided) */
  idempotencyKey?: string;
  /** ISO8601 timestamp when event occurred */
  occurredAt: string;
  /** Event-specific payload (typed per event contract) */
  payload: T;
  /** Optional headers for transport metadata */
  headers?: Record<string, string>;
  /** Optional context for actor/user/service metadata */
  context?: {
    actor: IntegrationEventActor;
  };
}
