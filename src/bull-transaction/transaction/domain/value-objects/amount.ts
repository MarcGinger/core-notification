import {
  TransactionDomainException,
  TransactionExceptionMessage,
} from '../exceptions';

export class Amount {
  private readonly value: number | undefined;

  private constructor(value?: number) {
    if (value !== undefined && value < 0) {
      throw new TransactionDomainException(
        TransactionExceptionMessage.invalidAmount,
      );
    }

    this.value = value;
  }

  public static create(value?: string | number): Amount {
    if (!value) return new Amount(undefined);

    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    return new Amount(parsed);
  }

  public getValue(): number | undefined {
    return this.value;
  }
}
