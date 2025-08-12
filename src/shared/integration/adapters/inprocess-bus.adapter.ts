import { Subject } from 'rxjs';
import { IntegrationBus, PublishOptions } from '../integration-bus.port';
import { IntegrationEvent } from '../integration-event';

export class InProcessBus implements IntegrationBus {
  private readonly subject = new Subject<IntegrationEvent>();

  async publish(event: IntegrationEvent, _opts?: PublishOptions) {
    this.subject.next(event);
  }

  subscribe(type: string, handler: (evt: IntegrationEvent) => Promise<void>) {
    this.subject.subscribe((e) => {
      if (e.type === type) void handler(e);
    });
  }
}
