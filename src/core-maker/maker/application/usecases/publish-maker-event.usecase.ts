import { Inject, Injectable } from '@nestjs/common';
import { IntegrationBus } from 'src/shared/integration/integration-bus.port';
import { IntegrationEvent } from 'src/shared/integration/integration-event';

@Injectable()
export class PublishMakerEventUseCase {
  constructor(
    @Inject('IntegrationBus') private readonly integrationBus: IntegrationBus,
  ) {}

  async execute(makerId: string, payload: Record<string, any>): Promise<void> {
    const event: IntegrationEvent = {
      type: 'maker.created.v1',
      version: 1,
      eventId: crypto.randomUUID(),
      correlationId: `maker-${makerId}`,
      tenantId: 'default',
      idempotencyKey: `maker:${makerId}`,
      occurredAt: new Date().toISOString(),
      payload,
      headers: { source: 'MakerModule' },
    };
    await this.integrationBus.publish(event);
  }
}
