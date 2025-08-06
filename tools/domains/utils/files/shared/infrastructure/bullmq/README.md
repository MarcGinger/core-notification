# BullMQ Multiple Queues Configuration

This module provides a complete BullMQ setup with multiple queues for different types of background job processing in your NestJS application.

## 📋 Available Queues

| Queue Name        | Purpose                   | Priority   | Retry Attempts | Backoff Strategy |
| ----------------- | ------------------------- | ---------- | -------------- | ---------------- |
| `email`           | Email sending operations  | Normal (5) | 5              | Exponential (2s) |
| `notification`    | Push notifications        | Normal (5) | 3              | Fixed (1.5s)     |
| `data-processing` | Heavy data operations     | Low (1)    | 2              | Exponential (5s) |
| `slack-message`   | Real-time Slack messaging | High (10)  | 4              | Exponential (1s) |

## 🚀 Quick Start

### 1. Environment Variables

Make sure you have the following Redis configuration in your environment:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### 2. Import the Module

The `BullMQModule` is already imported in your `app.module.ts`. All queues are automatically registered.

### 3. Using Queues in Your Services

```typescript
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, QUEUE_PRIORITIES } from './shared/infrastructure';

@Injectable()
export class MyService {
  constructor(
    @InjectQueue(QUEUE_NAMES.EMAIL) private emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SLACK_MESSAGE) private slackQueue: Queue,
  ) {}

  async sendEmail(emailData: any) {
    return this.emailQueue.add('send-email', emailData, {
      priority: QUEUE_PRIORITIES.NORMAL,
    });
  }

  async sendSlackMessage(messageData: any) {
    return this.slackQueue.add('send-slack-message', messageData, {
      priority: QUEUE_PRIORITIES.HIGH,
    });
  }
}
```

### 4. Using the QueueService

Alternatively, use the pre-built `QueueService` for common operations:

```typescript
import { Injectable } from '@nestjs/common';
import { QueueService } from './shared/infrastructure';

@Injectable()
export class MyService {
  constructor(private queueService: QueueService) {}

  async sendWelcomeEmail(userEmail: string) {
    return this.queueService.addEmailJob({
      to: userEmail,
      subject: 'Welcome!',
      body: 'Welcome to our platform!',
    });
  }

  async notifySlackChannel(message: string) {
    return this.queueService.addSlackMessageJob({
      channel: '#general',
      text: message,
    });
  }
}
```

## 🔧 Advanced Usage

### Scheduling Delayed Jobs

```typescript
// Schedule an email to be sent in 1 hour
await queueService.scheduleDelayedEmail(
  {
    to: 'user@example.com',
    subject: 'Reminder',
    body: "Don't forget about your appointment!",
  },
  60 * 60 * 1000, // 1 hour in milliseconds
);
```

### Bulk Operations

```typescript
await queueService.addBulkJobs({
  emails: [
    { to: 'user1@example.com', subject: 'Hi', body: 'Hello!' },
    { to: 'user2@example.com', subject: 'Hi', body: 'Hello!' },
  ],
  slackMessages: [{ channel: '#general', text: 'System maintenance complete' }],
});
```

### Queue Monitoring

```typescript
// Get statistics for all queues
const stats = await queueService.getQueueStats();
console.log(stats);

// Pause all queues during maintenance
await queueService.pauseAllQueues();

// Resume all queues
await queueService.resumeAllQueues();
```

## 📊 Queue Configurations

### Email Queue

- **Purpose**: Email sending operations
- **Retry Logic**: 5 attempts with exponential backoff
- **Cleanup**: Keeps 100 completed jobs, 50 failed jobs

### Notification Queue

- **Purpose**: Push notifications and in-app notifications
- **Retry Logic**: 3 attempts with fixed delay
- **Cleanup**: Keeps 200 completed jobs, 100 failed jobs

### Data Processing Queue

- **Purpose**: Heavy computational tasks and data processing
- **Retry Logic**: 2 attempts with longer exponential backoff
- **Cleanup**: Keeps 50 completed jobs, 25 failed jobs
- **Priority**: Low (processes after other queues)

### Slack Message Queue

- **Purpose**: Real-time Slack integrations
- **Retry Logic**: 4 attempts with fast exponential backoff
- **Cleanup**: Keeps 150 completed jobs, 75 failed jobs
- **Priority**: High (processes before other queues)

## 🔑 Constants

Import and use the provided constants for consistency:

```typescript
import { QUEUE_NAMES, QUEUE_PRIORITIES } from './shared/infrastructure';

// Queue names
QUEUE_NAMES.EMAIL;
QUEUE_NAMES.NOTIFICATION;
QUEUE_NAMES.DATA_PROCESSING;
QUEUE_NAMES.SLACK_MESSAGE;

// Priority levels
QUEUE_PRIORITIES.LOW; // 1
QUEUE_PRIORITIES.NORMAL; // 5
QUEUE_PRIORITIES.HIGH; // 10
QUEUE_PRIORITIES.CRITICAL; // 20
```

## 🏗️ Architecture

```
BullMQModule
├── BullMQConfigService (Redis configuration)
├── QueueService (High-level queue operations)
├── Queue Constants (Names and priorities)
└── Multiple Queue Registrations
    ├── email
    ├── notification
    ├── data-processing
    └── slack-message
```

## 📝 Adding New Queues

To add a new queue:

1. Add the queue name to `QUEUE_NAMES` in `queue.constants.ts`
2. Add a configuration method in `BullMQConfigService`
3. Register the queue in `BullMQModule`
4. Add methods to `QueueService` if needed

Example:

```typescript
// 1. In queue.constants.ts
export const QUEUE_NAMES = {
  // ... existing queues
  SMS: 'sms',
} as const;

// 2. In bullmq-config.service.ts
getSmsQueueConfig() {
  return {
    name: QUEUE_NAMES.SMS,
    defaultJobOptions: {
      attempts: 3,
      priority: QUEUE_PRIORITIES.HIGH,
    },
  };
}

// 3. In bullmq.module.ts
BullModule.registerQueueAsync(
  // ... existing queues
  {
    name: QUEUE_NAMES.SMS,
    useFactory: (configService: BullMQConfigService) =>
      configService.getSmsQueueConfig(),
    inject: [BullMQConfigService],
  },
),
```

## 🔗 Related Documentation

- [BullMQ Official Documentation](https://docs.bullmq.io/)
- [NestJS BullMQ Integration](https://docs.nestjs.com/techniques/queues)
- [Redis Configuration](https://redis.io/docs/manual/config/)
