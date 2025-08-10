# Dynamic Message Queue Strategy Implementation

## Summary

We have successfully refactored the message queue system to remove all hardcoded domain-specific strategies from the shared infrastructure. The system now uses a dynamic strategy injection pattern that allows each domain module to provide its own routing strategies via dependency injection.

## What Was Accomplished

### 1. **Removed Hardcoded Domain Strategies**

- Eliminated `SlackMessageStrategy`, `EmailMessageStrategy`, `NotificationStrategy`, and `TransactionNotificationStrategy` from the shared message-queue module
- These strategies were hardcoded in the shared infrastructure, violating separation of concerns

### 2. **Implemented Dynamic Strategy Injection**

- Created `IMessageRoutingStrategy` interface for domain-specific routing logic
- Added `DefaultDataProcessingStrategy` as a fallback for unmatched events
- Updated `MessageQueueEventHandler` to use injected strategies via `CUSTOM_MESSAGE_ROUTING_STRATEGIES` token

### 3. **Created Modular Job Data Types**

- Moved job data interfaces to `src/shared/message-queue/infrastructure/job-data/index.ts`
- Defined `BaseJobData` interface with common properties
- Created specific interfaces: `SlackJobData`, `EmailJobData`, `NotificationJobData`, `DataProcessingJobData`, `TransactionNotificationJobData`

### 4. **Updated Module Architecture**

- `GenericMessageQueueModule` now only provides the `DefaultDataProcessingStrategy` and core infrastructure
- Removed all domain-specific providers from the shared module
- Domain modules are responsible for providing their own strategies

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Shared Infrastructure                     │
├─────────────────────────────────────────────────────────────┤
│ • GenericMessageQueueModule                                 │
│ • MessageQueueEventHandler (strategy resolution)            │
│ • DefaultDataProcessingStrategy (fallback)                  │
│ • IMessageRoutingStrategy interface                         │
│ • Job data type definitions                                 │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Domain Modules                           │
├─────────────────────────────────────────────────────────────┤
│ core-slack-worker:                                          │
│ • SlackMessageRoutingStrategy                               │
│                                                             │
│ core-template-manager:                                      │
│ • EmailMessageRoutingStrategy                               │
│ • NotificationStrategy                                      │
│                                                             │
│ bull-transaction:                                           │
│ • TransactionNotificationStrategy                           │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Example

### 1. **Creating a Domain-Specific Strategy**

```typescript
// Example: SlackMessageRoutingStrategy
@Injectable()
export class SlackMessageRoutingStrategy
  implements
    IMessageRoutingStrategy<
      UpdateMessageQueueProps,
      StandardJobOptions,
      SlackJobData
    >
{
  canHandle(
    eventData: UpdateMessageQueueProps,
    meta: EventStoreMetaProps,
  ): boolean {
    const payload = eventData.payload as any;
    return Boolean(
      meta.stream?.includes('slack') ||
        payload?.channel?.startsWith('#') ||
        payload?.messageType === 'slack',
    );
  }

  getQueueName(): string {
    return QUEUE_NAMES.SLACK_MESSAGE;
  }

  getJobType(): string {
    return 'send-slack-message';
  }

  getJobOptions(eventData: UpdateMessageQueueProps): StandardJobOptions {
    return {
      ...JOB_OPTIONS_TEMPLATES.IMMEDIATE,
      priority: eventData.priority || QUEUE_PRIORITIES.NORMAL,
      delay: eventData.scheduledAt
        ? new Date(eventData.scheduledAt).getTime() - Date.now()
        : 0,
    };
  }

  transformData(
    eventData: UpdateMessageQueueProps,
    user: IUserToken,
  ): SlackJobData {
    return {
      messageId: eventData.id,
      tenant: user.tenant || 'unknown',
      channel: (eventData.payload?.channel as string) || '#general',
      templateCode: (eventData.payload?.templateCode as string) || 'default',
      payload: eventData.payload || {},
      renderedMessage:
        (eventData.payload?.renderedMessage as string) || 'Default message',
      scheduledAt: eventData.scheduledAt?.toISOString(),
      correlationId: eventData.correlationId || 'unknown',
      priority: eventData.priority || 1,
      userId: user.sub,
    };
  }
}
```

### 2. **Registering Strategy in Domain Module**

```typescript
// Example: CoreSlackWorkerModule
@Module({
  imports: [
    // ... other imports
    GenericMessageQueueModule, // Import the generic module
  ],
  providers: [
    // ... other providers
    SlackMessageRoutingStrategy,

    // Provide the strategy to the message queue system
    {
      provide: 'CUSTOM_MESSAGE_ROUTING_STRATEGIES',
      useFactory: (slackStrategy: SlackMessageRoutingStrategy) => [
        slackStrategy,
      ],
      inject: [SlackMessageRoutingStrategy],
    },
  ],
  exports: [SlackMessageRoutingStrategy],
})
export class CoreSlackWorkerModule {}
```

### 3. **Job Data Type Definition**

```typescript
// Job data interfaces are centrally defined in:
// src/shared/message-queue/infrastructure/job-data/index.ts

export interface SlackJobData extends BaseJobData {
  messageId: string;
  channel: string;
  templateCode: string;
  payload: Record<string, any>;
  renderedMessage: string;
  scheduledAt?: string;
  priority: number;
}
```

## Key Benefits

### ✅ **True Separation of Concerns**

- Shared infrastructure is completely domain-agnostic
- Each domain owns its routing logic
- No hardcoded domain knowledge in shared modules

### ✅ **Dynamic and Extensible**

- New domains can add strategies without modifying shared code
- Multiple strategies per domain are supported
- Easy to add, remove, or modify strategies

### ✅ **Type Safety**

- Generic `IMessageRoutingStrategy` interface ensures type safety
- Each strategy defines its own job data types
- Compile-time validation of strategy implementations

### ✅ **Testability**

- Strategies can be unit tested independently
- Easy to mock specific strategies for testing
- Clear interfaces for dependency injection

## Next Steps

To complete the implementation:

1. **Create remaining domain strategies:**

   - `EmailMessageRoutingStrategy` in core-template-manager
   - `NotificationStrategy` in appropriate module
   - Update `TransactionNotificationStrategy` in bull-transaction

2. **Update domain modules:**

   - Add strategy providers using `CUSTOM_MESSAGE_ROUTING_STRATEGIES` token
   - Import `GenericMessageQueueModule` in each domain

3. **Testing:**
   - Unit test each strategy implementation
   - Integration test the dynamic injection system
   - Verify fallback to `DefaultDataProcessingStrategy`

## Files Modified

- ✅ `src/shared/message-queue/infrastructure/event-handlers/message-queue-event.handler.ts` - Removed hardcoded strategies, added dynamic injection
- ✅ `src/shared/message-queue/infrastructure/job-data/index.ts` - Created centralized job data types
- ✅ `src/shared/message-queue/generic-message-queue.module.ts` - Removed domain strategy providers
- ✅ `src/shared/message-queue/index.ts` - Updated exports
- ✅ `src/core-slack-worker/message/infrastructure/routing/slack-message-routing.strategy.ts` - Example strategy implementation

The system is now truly modular and follows domain-driven design principles! 🎉
