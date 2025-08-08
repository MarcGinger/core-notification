import { v4 as uuidv4 } from 'uuid';
import { Message } from '../aggregates';
import { IMessage, MessageStatusEnum } from '../entities';
import { UpdateMessageProps } from '../properties';

export class MessageFactory {
  /**
   * Creates a Message aggregate from the provided props and rendered message.
   * @param props - The user-supplied UpdateMessageProps
   * @param renderedMessage - The rendered message from the template
   * @param correlationId - Optional correlationId (will be generated if missing)
   * @returns A fully initialized Message aggregate
   */
  static fromProps(props: UpdateMessageProps, correlationId?: string): Message {
    const messageEntity: IMessage = {
      ...props,
      correlationId: correlationId ?? uuidv4(),
      status: MessageStatusEnum.PENDING,
      retryCount: 0,
      priority: props.priority ?? 1,
    };

    return new Message(Message.fromEntity(messageEntity));
  }
}
