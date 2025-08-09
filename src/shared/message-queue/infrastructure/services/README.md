# Slack Message Queue Service

This document describes the dedicated Slack message queue service that has been moved from the global shared folder into the `core-slack-worker` message module.

## 🎯 Overview

The `SlackMessageQueueService` provides dedicated queue management for Slack message processing within the message module, following proper domain boundaries and separation of concerns.

## 📁 Location

```
src/core-slack-worker/message/infrastructure/services/slack-message-queue.service.ts
```

## 🚀 Features

### Core Queue Operations

- **Standard Message Jobs**: Add regular Slack messages with configurable priority
- **Urgent Message Jobs**: High-priority messages for immediate processing
- **Scheduled Messages**: Schedule messages for future delivery
- **Bulk Operations**: Process multiple messages efficiently in batches
- **Retry Management**: Handle failed messages with exponential backoff

### Queue Management

- **Statistics**: Get comprehensive queue statistics and health status
- **Job Monitoring**: View waiting, delayed, and failed jobs
- **Queue Control**: Pause, resume, and drain queue operations
- **Cleanup**: Remove old completed and failed jobs

## 💻 Usage Examples

### Basic Usage

```typescript
import { SlackMessageQueueService } from './infrastructure/services';

@Injectable()
export class MyService {
  constructor(private readonly slackQueueService: SlackMessageQueueService) {}

  async sendMessage(messageData: SlackMessageJobData) {
    // Add a standard message
    const job = await this.slackQueueService.addSlackMessageJob(messageData);
    return job.id;
  }

  async sendUrgentMessage(messageData: SlackMessageJobData) {
    // Add an urgent high-priority message
    const job =
      await this.slackQueueService.addUrgentSlackMessageJob(messageData);
    return job.id;
  }

  async scheduleMessage(messageData: SlackMessageJobData, when: Date) {
    // Schedule a message for future delivery
    const job = await this.slackQueueService.scheduleSlackMessage(
      messageData,
      when,
    );
    return job.id;
  }
}
```

### Advanced Options

```typescript
// Add message with custom options
await this.slackQueueService.addSlackMessageJob(messageData, {
  priority: SLACK_MESSAGE_PRIORITIES.HIGH,
  delay: 5000, // 5 second delay
  attempts: 6, // More retry attempts
});

// Send multiple messages in bulk
await this.slackQueueService.addBulkSlackMessageJobs(messages, {
  priority: SLACK_MESSAGE_PRIORITIES.NORMAL,
  batchSize: 50, // Process 50 at a time
});

// Retry a failed message
await this.slackQueueService.retryFailedMessage(messageData, retryAttempt);
```

### Queue Monitoring

```typescript
// Get queue statistics
const stats = await this.slackQueueService.getQueueStats();
console.log('Queue stats:', stats);

// Check queue health
const health = await this.slackQueueService.getQueueHealth();
if (!health.healthy) {
  console.warn('Queue is unhealthy:', health);
}

// Get failed jobs for analysis
const failedJobs = await this.slackQueueService.getFailedJobs(0, 10);
console.log('Failed jobs:', failedJobs);
```

### Queue Management

```typescript
// Pause queue processing
await this.slackQueueService.pauseQueue();

// Resume queue processing
await this.slackQueueService.resumeQueue();

// Clean old jobs (older than 24 hours)
const cleaned = await this.slackQueueService.cleanQueue();
console.log(`Cleaned ${cleaned.totalCleaned} jobs`);
```

## 🔧 Configuration

### Priority Levels

```typescript
export const SLACK_MESSAGE_PRIORITIES = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 10,
  URGENT: 15,
  CRITICAL: 20,
} as const;
```

### Default Job Options

- **Standard Jobs**: 4 retry attempts, normal priority, exponential backoff
- **Urgent Jobs**: 6 retry attempts, urgent priority, faster retry intervals
- **Scheduled Jobs**: 3 retry attempts, normal priority, longer retention
- **Bulk Jobs**: Configurable batch sizes to avoid overwhelming the system

## 🎛️ Admin Controller

For administrative operations, use the `SlackQueueAdminController`:

### Endpoints

- `GET /admin/slack-queue/stats` - Get queue statistics and health
- `GET /admin/slack-queue/failed-jobs` - View failed jobs
- `POST /admin/slack-queue/clean` - Clean old completed/failed jobs
- `POST /admin/slack-queue/pause` - Pause queue processing
- `POST /admin/slack-queue/resume` - Resume queue processing
- `POST /admin/slack-queue/add-job` - Directly add job (testing)
- `POST /admin/slack-queue/add-urgent-job` - Add urgent job

## 🔄 Integration with Event-Driven Architecture

The queue service works seamlessly with the existing event-driven architecture:

1. **SlackMessageRequestService** - Publishes events via EventBus
2. **SlackMessageRequestedHandler** - Handles events and queues jobs
3. **SlackMessageQueueService** - Manages queue operations
4. **SlackMessageProcessor** - Processes jobs and sends to Slack API

## 📊 Monitoring & Health Checks

```typescript
// Health check example
const health = await slackQueueService.getQueueHealth();

interface QueueHealth {
  healthy: boolean; // Overall health status
  isPaused: boolean; // Whether queue is paused
  hasWorkers: boolean; // Whether workers are active
  pendingJobs: number; // Total waiting + delayed jobs
  failedJobs: number; // Number of failed jobs
  stats: QueueStats; // Detailed statistics
}
```

## 🚫 Migration from Global Service

The Slack-specific functionality has been **removed** from `src/shared/infrastructure/bullmq/queue.service.ts` and moved to this dedicated service. This provides:

- **Better separation of concerns**
- **Domain-specific functionality**
- **Easier testing and maintenance**
- **Proper module boundaries**

## 📝 Module Integration

The service is properly integrated into the `MessageModule`:

```typescript
@Module({
  providers: [
    // ... other providers
    SlackMessageQueueService,
  ],
  exports: [
    // ... other exports
    SlackMessageQueueService,
  ],
})
export class MessageModule {}
```

## 🎯 Next Steps

1. **Add to other modules** that need Slack queue operations
2. **Create custom dashboards** using the statistics endpoints
3. **Set up monitoring alerts** based on queue health metrics
4. **Implement custom retry strategies** for specific use cases

---

This dedicated queue service provides a robust, scalable foundation for Slack message processing within the domain boundaries of your application architecture.
