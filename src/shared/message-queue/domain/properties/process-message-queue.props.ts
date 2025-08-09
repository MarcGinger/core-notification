export interface ProcessMessageQueueProps {
  id: string;
  isRetry?: boolean;
  retryAttempt?: number;
  priority?: 'normal' | 'urgent' | 'critical';
}
