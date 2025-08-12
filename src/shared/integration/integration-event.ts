// Envelope for integration events (public contracts)
export interface IntegrationEvent<T = unknown> {
  type: string;            // e.g. "notification.requested.v1"
  version: number;         // schema version
  eventId: string;         // uuid
  correlationId?: string;
  tenantId?: string;
  idempotencyKey?: string; // for deduplication
  occurredAt: string;      // ISO timestamp
  payload: T;              // event-specific data
  headers?: Record<string, string>;
}
