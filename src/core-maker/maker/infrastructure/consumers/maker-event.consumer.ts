import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { IntegrationBus } from 'src/shared/integration/integration-bus.port';

@Injectable()
export class MakerEventConsumer implements OnModuleInit {
  constructor(
    @Inject('IntegrationBus') private readonly integrationBus: IntegrationBus,
  ) {}

  onModuleInit() {
    this.integrationBus.subscribe('maker.created.v1', async (event) => {
      // Log the received event
      console.log('[MakerEventConsumer] Received event:', event);
    });
  }
}
