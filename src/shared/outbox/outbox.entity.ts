export interface OutboxEntity {
  id: string;
  type: string;
  payload: string; // serialized IntegrationEvent
  headers?: Record<string, string>;
  occurredAt: string;
  idempotencyKey?: string;
  tenantId?: string;
  correlationId?: string;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
}
