import { OutboxRepository } from '../../outbox/outbox.repository';
import { IntegrationBus, PublishOptions } from '../integration-bus.port';
import { IntegrationEvent } from '../integration-event';

export class OutboxBus implements IntegrationBus {
  constructor(private readonly repo: OutboxRepository) {}

  async publish(event: IntegrationEvent, opts?: PublishOptions): Promise<void> {
    // Save event to outbox table (must be in same DB transaction as domain change)
    await this.repo.add(event, opts);
  }

  subscribe(): void {
    /* Not used here. Subscriptions handled by transport/consumers. */
  }
}
