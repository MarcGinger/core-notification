# Domain-Driven Message Queue Configuration

## Overview

The enhanced `MessageQueueEventSubscriptionConfig` now supports domain-specific configuration, making the message-queue module truly generic while allowing each domain to customize routing and adapters.

## Key Features Added

### 1. Domain-Specific Route Maps

Each domain can now specify its own routing configuration:

```typescript
// Transaction domain configuration
const routeMap: Record<string, QueueRoute> = {
  'transaction.settle': {
    queueName: 'transactions',
    options: { attempts: 5, priority: 10 },
  },
  'transaction.refund': {
    queueName: 'transactions',
    options: { attempts: 3, priority: 8 },
  },
};

export const createTransactionEventSubscriptionConfig = (): MessageQueueEventSubscriptionConfig => ({
  eventSubscriptions: [...],
  domain: 'transaction',
  messageQueueAdapter: 'TransactionMessageAdapter',
  routeMap, // Domain-specific routes override defaults
});
```

### 2. Domain-Specific Adapters

Each domain can specify which adapter handles its messages:

```typescript
// In transaction config
messageQueueAdapter: 'TransactionMessageAdapter';

// In notification config
messageQueueAdapter: 'NotificationMessageAdapter';

// In user config
messageQueueAdapter: 'UserMessageAdapter';
```

### 3. Generic Infrastructure with Domain Awareness

The message queue infrastructure automatically uses domain-specific configurations:

```typescript
// MessageRoutingStrategyRegistry now checks domain config first
@Injectable()
export class DomainAwareRoutingStrategy implements IMessageRoutingStrategy {
  resolve(jobType: JobType): QueueRoute {
    // 1. Check domain-specific routes first
    const domainRoute = this.domainRouteMap[jobType];
    if (domainRoute) return domainRoute;

    // 2. Fall back to default routes
    return this.defaultStrategy.resolve(jobType);
  }
}
```

## Benefits

### 1. **True Genericity**

- Message queue module contains NO domain-specific logic
- All domain knowledge lives in domain modules
- Easy to add new domains without touching shared code

### 2. **Domain Ownership**

- Each domain owns its routing rules
- Each domain owns its message adapters
- Each domain controls its queue priorities and retry policies

### 3. **Configuration Flexibility**

```typescript
// High-priority financial transactions
'transaction.settle': {
  queueName: 'transactions',
  options: { attempts: 5, priority: 10, backoff: { type: 'exponential', delay: 1000 } }
}

// Lower-priority notifications
'notification.send': {
  queueName: 'notifications',
  options: { attempts: 3, priority: 5, backoff: { type: 'fixed', delay: 5000 } }
}
```

### 4. **Adapter Isolation**

- `TransactionMessageAdapter` only handles transaction logic
- `SlackMessageAdapter` only handles Slack logic
- `EmailMessageAdapter` only handles email logic
- No cross-domain contamination

## Usage Example

### 1. Domain Module Setup

```typescript
// transaction.module.ts
@Module({
  imports: [
    GenericMessageQueueInfraModule, // Generic infrastructure
    GenericMessageQueueModule.registerAsync({
      useFactory: createTransactionEventSubscriptionConfig,
    }),
  ],
  providers: [
    TransactionMessageAdapter, // Domain-specific adapter
    ...TransactionBusinessCommands, // Domain commands
  ],
})
export class TransactionModule {}
```

### 2. Domain Configuration

```typescript
// transaction-event-subscription.config.ts
export const createTransactionEventSubscriptionConfig = () => ({
  domain: 'transaction',
  messageQueueAdapter: 'TransactionMessageAdapter',
  routeMap: {
    'transaction.settle': { queueName: 'transactions', options: { attempts: 5 } },
    'transaction.refund': { queueName: 'transactions', options: { attempts: 3 } },
  },
  eventSubscriptions: [...], // Domain-specific event subscriptions
});
```

### 3. Business Commands (Domain-Specific)

```typescript
// initiate-transfer.handler.ts
@CommandHandler(InitiateTransferCommand)
export class InitiateTransferHandler {
  async execute(command: InitiateTransferCommand): Promise<void> {
    // Domain validation
    this.validateTransfer(command);

    // Use generic infrastructure to enqueue
    await this.commandBus.execute(
      new QueueJobCommand({
        type: 'transaction.settle',
        payload: {
          /* transaction data */
        },
        options: { priority: 10 }, // Override domain defaults if needed
      }),
    );
  }
}
```

## Architecture Flow

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│   Domain Config     │    │  Generic Infra       │    │   Domain Workers    │
│                     │    │                      │    │                     │
│ - routeMap          │───▶│ DomainAwareRouting   │───▶│ TransactionWorker   │
│ - messageAdapter    │    │ AdapterRegistry      │    │ NotificationWorker  │
│ - domain: 'tx'      │    │ GenericMQService     │    │ EmailWorker         │
│ - eventSubscriptions│    │                      │    │                     │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
       Domain                    Infrastructure                Domain
    (Configuration)             (Generic Pipes)          (Processing Logic)
```

## Migration Path

1. **Keep existing systems working** - default routes still exist
2. **Add domain configs gradually** - one domain at a time
3. **Move domain-specific logic** - from shared to domain modules
4. **Remove hardcoded routes** - once all domains have configs

This approach achieves true separation of concerns while maintaining backward compatibility and making the system infinitely extensible.
