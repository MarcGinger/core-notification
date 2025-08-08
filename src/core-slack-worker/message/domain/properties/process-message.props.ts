export interface ProcessMessageProps {
  id: string;
  isRetry?: boolean;
  retryAttempt?: number;
  priority?: 'normal' | 'urgent' | 'critical';
}
