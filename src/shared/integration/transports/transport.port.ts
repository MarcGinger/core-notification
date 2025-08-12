import { PublishOptions } from '../integration-bus.port';
import { IntegrationEvent } from '../integration-event';

export interface Transport {
  send(event: IntegrationEvent, opts?: PublishOptions): Promise<void>;
}
