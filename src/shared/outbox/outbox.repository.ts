import { PublishOptions } from '../integration/integration-bus.port';
import { IntegrationEvent } from '../integration/integration-event';
import { OutboxEntity } from './outbox.entity';

export class OutboxRepository {
  async add(event: IntegrationEvent, opts?: PublishOptions): Promise<void> {
    // Insert outbox row in same transaction as domain event
  }

  async markSent(id: string): Promise<void> {
    // Mark outbox row as sent
  }

  async getPending(): Promise<OutboxEntity[]> {
    // Get all pending outbox rows
    return [];
  }
}
