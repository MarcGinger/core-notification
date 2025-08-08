import { randomUUID } from 'crypto';
import { IUserToken } from 'src/shared/auth';
import { Message } from '../aggregates';
import { MessageStatusEnum } from '../entities';
import { MessageDomainException, MessageExceptionMessage } from '../exceptions';
import { CreateMessageProps } from '../properties';
import { MessageIdentifier, ScheduledAt } from '../value-objects';

export class CreateMessageFactory {
  /**
   * Creates a Message aggregate from the provided props and rendered message.
   * @param props - The user-supplied CreateMessageProps
   * @param renderedMessage - The rendered message from the template
   * @param correlationId - Optional correlationId (will be generated if missing)
   * @returns A fully initialized Message aggregate
   */
  static fromProps(
    user: IUserToken,
    props: CreateMessageProps,
    correlationId?: string,
  ): Message {
    const scheduledAt = ScheduledAt.create(props.scheduledAt);

    // ✅ Validate "future" constraint before passing to aggregate
    if (scheduledAt.getValue() && !scheduledAt.isFuture()) {
      throw new MessageDomainException(
        MessageExceptionMessage.scheduledAtMustBeInFuture,
      );
    }

    // Generate unique identifier for the new message
    const messageCode = randomUUID();

    // Create the aggregate using the factory method which emits creation events
    const message = Message.create(user, {
      id: MessageIdentifier.fromString(messageCode),
      configCode: props.configCode,
      channel: props.channel,
      templateCode: props.templateCode,
      payload: props.payload,
      status: MessageStatusEnum.PENDING,
      scheduledAt,
      sentAt: new Date(),
      retryCount: 0,
      correlationId: correlationId ?? randomUUID(),
    });

    if (message.scheduledAt && !message.scheduledAt.isFuture()) {
      throw new MessageDomainException(
        MessageExceptionMessage.scheduledAtMustBeInFuture,
      );
    }

    return message;
  }
}
