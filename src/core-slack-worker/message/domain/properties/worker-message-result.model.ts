export interface WorkerMessageResult {
  success: boolean;
  slackTimestamp?: string;
  slackChannel?: string;
  error?: string;
  isRetryable?: boolean;
  userFriendlyMessage?: string;
}
