import { IUserToken } from 'src/shared/auth';
import { CreateMakerProps } from '../../../domain';
// generate-commands
export class PublishBankPaymentRequestedEventCommand {
  constructor(
    public user: IUserToken,
    public readonly props: CreateMakerProps,
  ) {}
}
