import { v4 as uuidv4 } from 'uuid';
import { MessageQueue } from '../aggregates';
import { IMessageQueue, MessageQueueStatusEnum } from '../entities';
import { UpdateMessageQueueProps } from '../properties';

export class UpdateMessageQueueFactory {
  /**
   * Creates a MessageQueue aggregate from the provided props and rendered message.
   * @param props - The user-supplied UpdateMessageQueueProps
   * @param renderedMessageQueue - The rendered message from the template
   * @param correlationId - Optional correlationId (will be generated if missing)
   * @returns A fully initialized MessageQueue aggregate
   */
  static fromProps(
    props: UpdateMessageQueueProps,
    correlationId?: string,
  ): MessageQueue {
    const messageEntity: IMessageQueue = {
      ...props,
      correlationId: correlationId ?? uuidv4(),
      status: MessageQueueStatusEnum.PENDING,
      retryCount: 0,
      priority: props.priority ?? 1,
    };

    return new MessageQueue(MessageQueue.fromEntity(messageEntity));
  }
}
