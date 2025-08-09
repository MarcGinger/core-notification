import { randomUUID } from 'crypto';
import { IUserToken } from 'src/shared/auth';
import { MessageQueue } from '../aggregates';
import { MessageQueueStatusEnum } from '../entities';
import {
  MessageQueueDomainException,
  MessageQueueExceptionMessageQueue,
} from '../exceptions';
import { CreateMessageQueueProps } from '../properties';
import { MessageQueueIdentifier, ScheduledAt } from '../value-objects';

export class CreateMessageQueueFactory {
  /**
   * Creates a MessageQueue aggregate from the provided props and rendered message.
   * @param props - The user-supplied CreateMessageQueueProps
   * @param renderedMessageQueue - The rendered message from the template
   * @param correlationId - Optional correlationId (will be generated if missing)
   * @returns A fully initialized MessageQueue aggregate
   */
  static fromProps(
    user: IUserToken,
    props: CreateMessageQueueProps,
    correlationId?: string,
  ): MessageQueue {
    const scheduledAt = ScheduledAt.create(props.scheduledAt);

    // ✅ Validate "future" constraint before passing to aggregate
    if (scheduledAt.getValue() && !scheduledAt.isFuture()) {
      throw new MessageQueueDomainException(
        MessageQueueExceptionMessageQueue.scheduledAtMustBeInFuture,
      );
    }

    // Generate unique identifier for the new message
    const messageCode = randomUUID();

    // Create the aggregate using the factory method which emits creation events
    const message = MessageQueue.create(user, {
      id: MessageQueueIdentifier.fromString(messageCode),
      payload: props.payload,
      status: MessageQueueStatusEnum.PENDING,
      scheduledAt,
      sentAt: new Date(),
      retryCount: 0,
      correlationId: correlationId ?? randomUUID(),
    });

    if (message.scheduledAt && !message.scheduledAt.isFuture()) {
      throw new MessageQueueDomainException(
        MessageQueueExceptionMessageQueue.scheduledAtMustBeInFuture,
      );
    }

    return message;
  }
}
