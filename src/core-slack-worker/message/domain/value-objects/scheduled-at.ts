import { MessageDomainException, MessageExceptionMessage } from '../exceptions';

export class ScheduledAt {
  private readonly value: Date | undefined;

  private constructor(value?: Date) {
    if (value) {
      // Check if the value is a valid date
      if (!(value instanceof Date) || isNaN(value.getTime())) {
        throw new MessageDomainException(
          MessageExceptionMessage.invalidScheduledAtDate,
        );
      }

      // Check if the date is in the future
      if (value.getTime() <= Date.now()) {
        throw new MessageDomainException(
          MessageExceptionMessage.scheduledAtMustBeInFuture,
        );
      }
    }

    this.value = value;
  }

  /**
   * Factory method to create a ScheduledAt value object
   * @param value optional date
   * @returns ScheduledAt instance
   */
  public static create(value?: Date): ScheduledAt {
    return new ScheduledAt(value);
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
