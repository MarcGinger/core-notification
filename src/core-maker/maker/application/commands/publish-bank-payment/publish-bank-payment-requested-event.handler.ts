import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IMaker } from '../../../domain/entities';
import { PublishBankPaymentRequestedEventUseCase } from '../../usecases';
import { PublishBankPaymentRequestedEventCommand } from './publish-bank-payment-requested-event.command';

@CommandHandler(PublishBankPaymentRequestedEventCommand)
export class PublishBankPaymentRequestedEventHandler
  implements ICommandHandler<PublishBankPaymentRequestedEventCommand, IMaker>
{
  constructor(
    private readonly publishBankPaymentRequestedEventUseCase: PublishBankPaymentRequestedEventUseCase,
  ) {}

  async execute(
    command: PublishBankPaymentRequestedEventCommand,
  ): Promise<IMaker> {
    const { user, props } = command;
    return await this.publishBankPaymentRequestedEventUseCase.execute(
      user,
      props,
    );
  }
}
