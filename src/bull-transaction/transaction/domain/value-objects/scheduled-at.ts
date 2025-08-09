import {
  TransactionDomainException,
  TransactionExceptionMessage,
} from '../exceptions';

export class ScheduledAt {
  private readonly value: Date | undefined;

  private constructor(value?: Date) {
    if (value && isNaN(value.getTime())) {
      throw new TransactionDomainException(
        TransactionExceptionMessage.invalidScheduledAtDate,
      );
    }

    this.value = value;
  }

  public static create(value?: string | Date): ScheduledAt {
    if (!value) return new ScheduledAt(undefined);

    const parsed = typeof value === 'string' ? new Date(value) : value;
    return new ScheduledAt(parsed);
  }

  public getValue(): Date | undefined {
    return this.value;
  }

  public getDelayInMs(): number {
    if (!this.value) return 0;
    return Math.max(0, this.value.getTime() - Date.now());
  }

  public isFuture(): boolean {
    return !!this.value && this.value.getTime() > Date.now();
  }
}
