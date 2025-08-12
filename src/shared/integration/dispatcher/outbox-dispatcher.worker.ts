import { OutboxRepository } from '../../outbox/outbox.repository';
import { Transport } from '../transports/transport.port';

export class OutboxDispatcherWorker {
  constructor(
    private readonly repo: OutboxRepository,
    private readonly transport: Transport,
  ) {}

  async dispatchPending() {
    const pending = await this.repo.getPending();
    for (const row of pending) {
      try {
        const event = JSON.parse(row.payload);
        await this.transport.send(event);
        await this.repo.markSent(row.id);
      } catch (err) {
        // handle error, retry/backoff, mark as failed if needed
      }
    }
  }
}
