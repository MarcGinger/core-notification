import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { IntegrationBus } from 'src/shared/integration/integration-bus.port';
import { PublishBankPaymentRequestedEventUseCase } from '../../application/usecases';

@Injectable()
export class MakerEventConsumer implements OnModuleInit {
  constructor(
    @Inject('IntegrationBus') private readonly integrationBus: IntegrationBus,
    private readonly publishBankPaymentRequestedEventUseCase: PublishBankPaymentRequestedEventUseCase,
  ) {}

  onModuleInit() {
    console.log(
      '[MakerEventConsumer] Initializing and subscribing to bank.payment.requested.v1',
    );
    this.integrationBus.subscribe(
      'bank.payment.requested.v1',
      async (event) => {
        try {
          console.log('[MakerEventConsumer] Received event:', event);

          // Extract makerId and payload from the event safely
          let makerId = 'unknown';
          let payload: Record<string, any> = {};
          if (
            event &&
            typeof event === 'object' &&
            event.payload &&
            typeof event.payload === 'object'
          ) {
            payload = event.payload;
            if (typeof payload.makerId === 'string') {
              makerId = payload.makerId;
            }
          }

          // Call a use case/command with the event data
          // Uncomment and update arguments if needed:
          // await this.publishMakerEventUseCase.execute(user, makerId, payload);
          // console.log('[MakerEventConsumer] Use case executed for makerId:', makerId);

          // Emit a job/event to the message queue (placeholder)
          // await this.messageQueueService.queueTransaction(event);

          // Write to EventStoreDB (placeholder)
          // await this.eventStoreService.appendEvent(event);
        } catch (error) {
          console.error('[MakerEventConsumer] Error in event handler:', error);
        }
      },
    );
    console.log(
      '[MakerEventConsumer] Subscription registered for bank.payment.requested.v1',
    );
  }
}
