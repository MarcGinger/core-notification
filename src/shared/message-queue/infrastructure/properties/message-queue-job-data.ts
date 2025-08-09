export const MESSAGE_QUEUE_PRIORITIES = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 10,
  URGENT: 15,
  CRITICAL: 20,
} as const;

export interface MessageQueueJobData {
  id: string; // Unique identifier for the message on eventstore
  messageId: string;
  tenant: string;
  correlationId: string;
  configCode: string;
  isRetry?: boolean;
  retryAttempt?: number;
  priority?: 'normal' | 'urgent' | 'critical';
}
