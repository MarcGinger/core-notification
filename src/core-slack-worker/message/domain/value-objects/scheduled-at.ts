import { MessageDomainException, MessageExceptionMessage } from '../exceptions';

export class ScheduledAt {
  private readonly value: Date | undefined;

  private constructor(value?: Date) {
    if (value) {
      // Check if the date is valid
      if (isNaN(value.getTime())) {
        throw new MessageDomainException(
          MessageExceptionMessage.invalidScheduledAtDate,
        );
      }

      if (value.getTime() <= Date.now()) {
        throw new MessageDomainException(
          MessageExceptionMessage.scheduledAtMustBeInFuture,
        );
      }
    }

    this.value = value;
  }

  /**
   * Factory method that accepts string, Date, or undefined
   */
  public static create(value?: string | Date): ScheduledAt {
    if (value === undefined) {
      return new ScheduledAt(undefined);
    }

    let parsed: Date;
    if (typeof value === 'string') {
      parsed = new Date(value);
    } else {
      parsed = value;
    }

    return new ScheduledAt(parsed);
  }

  public getValue(): Date | undefined {
    return this.value;
  }

  public isScheduled(): boolean {
    return !!this.value;
  }

  public getDelayInMs(): number {
    if (!this.value) return 0;
    return Math.max(0, this.value.getTime() - Date.now());
  }
}
