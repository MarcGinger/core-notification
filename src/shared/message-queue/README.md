# Generic Message Queue System

A truly generic BullMQ message queue system that can handle any message type (notifications, transactions, Slack messages, emails, etc.) with automatic routing based on message content and metadata.

## 🎯 Overview

This system implements a **Strategy Pattern** for routing messages to appropriate queues based on:

- **Stream name patterns** (e.g., 'slack-_', 'email-_', 'notification-\*')
- **Message payload content** (e.g., channel starting with '#', email addresses)
- **Explicit message types** (e.g., `messageType: 'slack'`)

## 🏗️ Architecture

```
┌─────────────────────┐
│    EventStore       │
│    (Events)         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ MessageQueueEvent   │
│ SubscriptionManager │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ MessageQueueEvent   │
│     Handler         │
│  (Generic Router)   │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │  Strategies │
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │   BullMQ    │
    │   Queues    │
    └─────────────┘
```

## 🚀 Features

- ✅ **Generic Routing** - Automatically routes any message type
- ✅ **Strategy Pattern** - Easy to extend with new message types
- ✅ **Priority-based Processing** - Different priorities for different message types
- ✅ **Scheduled Messages** - Support for delayed message delivery
- ✅ **Tenant Isolation** - Multi-tenant support with proper user context
- ✅ **Error Handling** - Comprehensive error handling and retry logic
- ✅ **Observability** - Detailed logging at each step
- ✅ **Type Safety** - Full TypeScript support

## 📁 File Structure

```
src/shared/message-queue/
├── domain/                           # Domain layer
│   ├── aggregates/                   # Message entities
│   ├── events/                       # Domain events
│   └── properties/                   # Value objects
├── application/                      # Application layer
│   ├── commands/                     # CQRS commands
│   ├── services/                     # Application services
│   └── usecases/                     # Use cases
├── infrastructure/                   # Infrastructure layer
│   ├── event-handlers/              # ⭐ NEW: Generic routing
│   │   ├── message-queue-event.handler.ts  # Main handler
│   │   └── message-queue-event.manager.ts  # Subscription manager
│   ├── repositories/                # Data persistence
│   └── services/                    # Infrastructure services
├── generic-message-queue.module.ts  # ⭐ NEW: Module configuration
├── USAGE_EXAMPLES.md                # ⭐ NEW: Usage examples
└── README.md                        # ⭐ NEW: This file
```

## 🎯 Routing Strategies

### 1. SlackMessageStrategy

- **Triggers**: Stream contains 'slack', channel starts with '#' or '@', messageType = 'slack'
- **Queue**: `SLACK_MESSAGE`
- **Priority**: Normal
- **Options**: Immediate processing, 3 attempts

### 2. EmailMessageStrategy

- **Triggers**: Stream contains 'email', payload has 'email' or 'to' field, messageType = 'email'
- **Queue**: `EMAIL`
- **Priority**: Normal
- **Options**: Scheduled processing, 5 attempts

### 3. NotificationStrategy

- **Triggers**: Stream contains 'notification', messageType = 'notification', has notificationType
- **Queue**: `NOTIFICATION`
- **Priority**: High
- **Options**: Immediate processing

### 4. DataProcessingStrategy (Fallback)

- **Triggers**: Always matches if others don't
- **Queue**: `DATA_PROCESSING`
- **Priority**: Low
- **Options**: Scheduled processing

## 🔧 Usage

### 1. Import the Module

```typescript
import { GenericMessageQueueModule } from 'src/shared/message-queue';

@Module({
  imports: [
    GenericMessageQueueModule,
    // ... other modules
  ],
})
export class YourModule {}
```

### 2. Publish Events to EventStore

```typescript
// Slack message event
const slackEvent = {
  id: 'msg-123',
  payload: {
    channel: '#general',
    renderedMessage: 'Hello team!',
  },
  correlationId: 'corr-456',
};

// The system automatically routes to SLACK_MESSAGE queue
```

### 3. Add Custom Strategy

```typescript
@Injectable()
export class SMSMessageStrategy implements IMessageRoutingStrategy {
  canHandle(
    eventData: UpdateMessageQueueProps,
    meta: EventStoreMetaProps,
  ): boolean {
    return (
      eventData.payload?.phoneNumber || eventData.payload?.messageType === 'sms'
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
```

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
```

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
