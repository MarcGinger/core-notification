export interface WorkerMessageQueueResult {
  success: boolean;
  error?: string;
  isRetryable?: boolean;
  userFriendlyMessage?: string;
}
