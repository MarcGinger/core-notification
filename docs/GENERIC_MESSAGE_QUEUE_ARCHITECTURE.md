# Generic Message Queue Architecture

## Overview

This architecture separates **infrastructure concerns** (enqueuing/scheduling) from **domain concerns** (business logic and processing). The message queue module provides only generic infrastructure services, while each domain owns its commands and workers.

## Key Components

### 1. Generic Infrastructure (`src/shared/message-queue/`)

#### Types (`types.ts`)

- `JobPayloadMap`: Central registry for all job types across domains
- `JobEnvelope<T>`: Type-safe job wrapper with payload, metadata, and options
- `QueueRoute`: Maps job types to queue names and options

#### Generic Commands (`application/commands/generic/`)

- `QueueJobCommand<T>`: Enqueue a job immediately
- `ScheduleJobCommand<T>`: Schedule a job for later execution
- `RetryJobCommand`: Retry a failed job
- `MoveToDelayedCommand`: Move a job to delayed state

#### Infrastructure Services (`infrastructure/services/`)

- `GenericMessageQueueService`: Type-safe job enqueuing to any queue
- `MessageRoutingStrategyRegistry`: Routes job types to appropriate queues
- `DefaultMessageRoutingStrategy`: Default routing configuration

### 2. Domain-Specific Implementation (Transaction Example)

#### Business Commands (`bull-transaction/transaction/application/commands/business/`)

- `InitiateTransferCommand`: Business intent to transfer money
- `RefundPaymentCommand`: Business intent to refund a payment
- `ValidateTransactionCommand`: Business intent to validate a transaction

#### Command Handlers

- Validate domain rules and business logic
- Use generic `QueueJobCommand` to enqueue jobs
- Express business intent, not infrastructure concerns

#### Domain Workers (`bull-transaction/transaction/infrastructure/workers/`)

- `TransactionWorker`: Processes only transaction-related jobs
- Contains business logic for settlement, refunds, validation
- Subscribes to the 'transactions' queue

## Usage Pattern

### 1. Adding a New Job Type

Update the central job type registry:

```typescript
// shared/message-queue/types.ts
export interface JobPayloadMap {
  // ... existing types
  'user.notify': {
    userId: string;
    message: string;
    channel: string;
  };
}
```

### 2. Creating Domain Commands

```typescript
// user-domain/commands/notify-user.command.ts
export class NotifyUserCommand {
  constructor(
    public readonly userId: string,
    public readonly message: string,
    public readonly channel: string,
  ) {}
}
```

### 3. Business Command Handler

```typescript
@CommandHandler(NotifyUserCommand)
export class NotifyUserHandler implements ICommandHandler<NotifyUserCommand> {
  constructor(private readonly commandBus: CommandBus) {}

  async execute(command: NotifyUserCommand): Promise<void> {
    // Domain validation
    if (!command.userId) {
      throw new Error('User ID is required');
    }

    // Enqueue using generic infrastructure
    await this.commandBus.execute(
      new QueueJobCommand({
        type: 'user.notify',
        payload: {
          userId: command.userId,
          message: command.message,
          channel: command.channel,
        },
        meta: { correlationId: generateId() },
        options: { attempts: 3, priority: 5 },
      }),
    );
  }
}
```

### 4. Domain Worker

```typescript
@Processor('notifications')
export class NotificationWorker extends WorkerHost {
  async process(job: Job): Promise<any> {
    const { type, payload } = job.data;

    switch (type) {
      case 'user.notify':
        return await this.handleUserNotification(payload);
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  }

  private async handleUserNotification(payload: JobPayloadMap['user.notify']) {
    // Business logic for sending notifications
  }
}
```

## Benefits

1. **Separation of Concerns**: Infrastructure vs domain logic
2. **Type Safety**: Central job type registry ensures consistency
3. **Scalability**: Easy to add new domains and job types
4. **Loose Coupling**: Domains don't depend on each other
5. **Testability**: Easy to test business logic without queue infrastructure
6. **Maintainability**: Clear ownership - queues are infra, processing is domain

## Queue Architecture

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│   Domain Commands   │    │  Generic Queue Infra │    │   Domain Workers    │
│                     │    │                      │    │                     │
│ InitiateTransfer    │───▶│  QueueJobCommand     │───▶│  TransactionWorker  │
│ RefundPayment       │    │  ScheduleJobCommand  │    │  NotificationWorker │
│ NotifyUser          │    │  GenericMQService    │    │  EmailWorker        │
│ SendEmail           │    │  RoutingStrategy     │    │                     │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
       Domain                    Infrastructure                Domain
    (Business Logic)             (Generic Pipes)          (Processing Logic)
```

This pattern keeps the message queue module truly generic and reusable while allowing each domain to own its business logic and processing concerns.
