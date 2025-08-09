import { IMessage } from '../entities';

// Abstract class for Notification Channels
abstract class NotificationChannel {
  abstract validateTemplateCode(templateCode?: string): boolean;
  abstract validatePayload(payload?: Record<string, any>): boolean;
  abstract renderMessageContent(
    templateContent: string,
    payload: Record<string, any>,
  ): string;
  abstract generateDefaultMessage(message: IMessage): string;
  abstract validateRenderedMessage(renderedMessage: string): boolean;
}
