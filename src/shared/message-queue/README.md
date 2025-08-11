# Clean Architecture Message Queue System

A domain-driven BullMQ message queue infrastructure following clean architecture principles. Each domain owns its queue operations directly without shared routing strategies.

## 🎯 Overview

This system provides infrastructure for domain-driven queue operations where:

- **Domains own their queues** - Each domain registers and manages its own queues
- **No shared routing** - Domains handle their own message routing logic
- **Clean boundaries** - Infrastructure is separated from domain logic
- **Type safety** - Full TypeScript support with generic job envelopes

## 🏗️ Architecture

```
┌─────────────────────┐
│    Domain Layer     │
│  (Business Logic)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Domain Queue       │
│     Service         │
│ (Domain-specific)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   BullMQ Queue      │
│  Infrastructure     │
│    (Generic)        │
└─────────────────────┘
```

## 🚀 Features

- ✅ **Domain Ownership** - Each domain manages its own queues
- ✅ **Clean Architecture** - Proper separation of concerns
- ✅ **Type Safety** - Generic job envelopes with proper typing
- ✅ **Infrastructure Sharing** - Common BullMQ infrastructure
- ✅ **Event Store Integration** - EventStore support for event sourcing
- ✅ **Logging** - Integrated logging infrastructure
- ✅ **Error Handling** - Comprehensive error handling and retry logic

## 📁 File Structure

```
src/shared/message-queue/
├── domain/
│   └── properties/                   # Value objects
├── infrastructure/
│   └── job-data/                    # Job data types
├── types.ts                         # Generic queue types
├── generic-message-queue.module.ts  # Infrastructure module
└── index.ts                         # Exports
```

## 🔧 Usage

### 1. Import the Infrastructure Module

```typescript
import { GenericMessageQueueModule } from 'src/shared/message-queue';

@Module({
  imports: [
    GenericMessageQueueModule, // Provides BullMQ, EventStore, and Logger
    // ... other modules
  ],
})
export class YourDomainModule {}
```

### 2. Create Domain-Specific Queue Service

```typescript
import { Injectable } from '@nestjs/common';
import { JobEnvelope, QueueMeta } from 'src/shared/message-queue';

@Injectable()
export class TransactionQueueService {
  constructor(
    private readonly bullMQService: BullMQService,
    private readonly logger: Logger,
  ) {}

  async enqueueTransactionJob<T>(
    jobType: string,
    payload: T,
    meta: QueueMeta,
    options?: JobOptions,
  ): Promise<void> {
    const envelope: JobEnvelope = {
      type: jobType,
      payload,
      meta,
      options,
    };

    await this.bullMQService.addJob('transactions', envelope);
    this.logger.log(`Enqueued ${jobType} job`, 'TransactionQueueService');
  }
}
```

### 3. Register Domain Queue Handlers

```typescript
@Injectable()
export class TransactionJobProcessor {
  @Process('transactions')
  async processTransactionJob(job: Job<JobEnvelope>): Promise<void> {
    const { type, payload, meta } = job.data;

    switch (type) {
      case 'transaction.settle':
        await this.handleSettlement(payload, meta);
        break;
      case 'transaction.refund':
        await this.handleRefund(payload, meta);
        break;
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  }
}
```

## 📊 Job Envelope Structure

```typescript
interface JobEnvelope<T = JobType, P = JobPayload> {
  type: T; // Job type identifier
  payload: P; // Job-specific data
  meta: QueueMeta; // Metadata (correlation, tenant, user)
  options?: JobOptions; // BullMQ options
}

interface QueueMeta {
  correlationId: string;
  tenant?: string;
  userId?: string;
  serviceContext?: string;
}
```

## 🎯 Best Practices

1. **Domain Ownership**: Each domain should manage its own queues and handlers
2. **Type Safety**: Use proper TypeScript types for job payloads
3. **Error Handling**: Implement proper error handling in job processors
4. **Logging**: Use the provided logger for observability
5. **Correlation**: Always include correlation IDs for tracing
6. **Testing**: Write unit tests for queue services and processors

## 🔄 Migration from Legacy

This system replaces the legacy strategy pattern approach:

- ❌ **Old**: Shared routing strategies with complex configuration
- ✅ **New**: Domain-owned queues with direct management
- ❌ **Old**: Central message routing through strategy pattern
- ✅ **New**: Domain-specific queue services and processors
- ❌ **Old**: Complex configuration files and route mappings
- ✅ **New**: Simple, direct queue operations within domains

## 📚 Related Documentation

- [Production Message Queue Roadmap](../../../docs/ENHANCED_TEMPLATE_VERSIONING.md)
- [Clean Architecture Guidelines](../../../docs/architecture.doc.ts)
- [BullMQ Infrastructure](../../infrastructure/bullmq/README.md)
  );
  }

  getQueueName(): string {
  return QUEUE_NAMES.SMS_MESSAGE;
  }

  getJobType(): string {
  return 'send-sms';
  }

  getJobOptions(eventData: UpdateMessageQueueProps) {
  return {
  ...JOB_OPTIONS_TEMPLATES.IMMEDIATE,
  priority: QUEUE_PRIORITIES.HIGH,
  };
  }

  transformData(eventData: UpdateMessageQueueProps, user: IUserToken) {
  return {
  phoneNumber: eventData.payload?.phoneNumber,
  message: eventData.payload?.renderedMessage,
  tenant: user.tenant,
  };
  }
  }

````

## 🎮 Testing

```typescript
describe('SlackMessageStrategy', () => {
  it('should handle slack messages', () => {
    const strategy = new SlackMessageStrategy();
    const eventData = {
      payload: { channel: '#general' },
    };
    const meta = { stream: 'slack-tenant1-msg-123' };

    expect(strategy.canHandle(eventData, meta)).toBe(true);
    expect(strategy.getQueueName()).toBe(QUEUE_NAMES.SLACK_MESSAGE);
  });
});
````

## 📈 Monitoring

The system provides comprehensive logging:

```typescript
// Route decision logging
this.logger.log(
  {
    messageId: eventData.id,
    queueName,
    jobType,
    jobId: job.id,
    priority: jobOptions.priority,
  },
  'Successfully routed message to queue',
);

// Error logging
this.logger.error(
  {
    messageId: meta.aggregateId,
    error: error.message,
  },
  'Failed to process MessageQueue event',
);
```

## 🔄 Integration with Existing Systems

This generic system integrates seamlessly with:

- ✅ **EventStore** - For event sourcing and exactly-once delivery
- ✅ **BullMQ** - For reliable job processing and retries
- ✅ **NestJS** - For dependency injection and modularity
- ✅ **Existing Processors** - Your current message processors continue to work
- ✅ **Domain Services** - Maintains clean domain boundaries

## 🚀 Next Steps

1. **Add More Strategies** - SMS, Push notifications, Webhooks
2. **Add Metrics** - Queue performance monitoring
3. **Add Configuration** - Runtime configuration for routing rules
4. **Add Health Checks** - Queue health monitoring
5. **Add Dead Letter Queues** - Handle permanently failed messages

## 🎉 Benefits

- **Reduced Complexity** - One handler for all message types
- **Improved Maintainability** - Clear separation of routing logic
- **Enhanced Testability** - Each strategy can be unit tested independently
- **Better Scalability** - Different queues can be scaled independently
- **Future-Proof** - Easy to add new message types without touching existing code

This system transforms your message queue architecture from hardcoded, type-specific handlers to a flexible, extensible routing system that can handle any message type with minimal configuration!
