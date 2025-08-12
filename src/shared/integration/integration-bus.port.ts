// Port for publishing/subscribing integration events
export interface PublishOptions {
  key?: string;      // partition/routing key
  delayMs?: number;  // optional delay
}

export interface IntegrationBus {
  publish<T>(event: IntegrationEvent<T>, opts?: PublishOptions): Promise<void>;
  subscribe(type: string, handler: (evt: IntegrationEvent) => Promise<void>): void;
}
