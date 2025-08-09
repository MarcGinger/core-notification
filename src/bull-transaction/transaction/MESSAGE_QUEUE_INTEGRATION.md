# Transaction Module - Message Queue Integration

## Overview

The `TransactionModule` has been successfully integrated with the generic message queue system. This enables automatic routing of transaction-related notifications to appropriate queues (Slack, Email, Notification, Data Processing) based on message content and metadata.

## Integration Details

### 1. Module Configuration

```typescript
// transaction.module.ts
@Module({
  imports: [
    EventStoreSharedModule,
    LoggerModule,
    GenericMessageQueueModule, // ✅ Added
  ],
  // ... rest of configuration
})
export class TransactionModule {}
```

### 2. Service Enhancement

The `TransactionApplicationService` now includes message queue functionality:

```typescript
export class TransactionApplicationService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly messageQueueHandler: MessageQueueEventHandler, // ✅ Injected
  ) {}

  async create(
    user: IUserToken,
    dto: CreateTransactionProps,
  ): Promise<ITransaction> {
    const entity = await this.commandBus.execute(
      new CreateTransactionCommand(user, dto),
    );

    // ✅ Automatic notification sending
    await this.sendTransactionNotification(entity, user, 'created');

    return entity;
  }
}
```

## Message Routing Logic

### Automatic Queue Selection

The message queue system automatically routes messages based on content analysis:

1. **Notification Queue** (Default for transactions)

   - Messages with `messageType: 'notification'`
   - Messages with `notificationType` property
   - Stream containing 'notification'

2. **Slack Queue** (If configured)

   - Messages with `channel` starting with '#' or '@'
   - Messages with `messageType: 'slack'`
   - Stream containing 'slack'

3. **Email Queue** (If configured)

   - Messages with `email`, `to` properties
   - Messages with `messageType: 'email'`
   - Stream containing 'email'

4. **Data Processing Queue** (Fallback)
   - All other message types

## Usage Examples

### 1. Transaction Created Notification

```typescript
// Automatically sent when transaction is created
const notification = {
  messageType: 'notification',
  notificationType: 'transaction',
  transactionId: transaction.id,
  action: 'created',
  transaction: { id: transaction.id },
  user: { id: user.sub, tenant: user.tenant },
  timestamp: new Date().toISOString(),
};
// → Routes to NOTIFICATION queue
```

### 2. Slack Notification (Example)

```typescript
// To send to Slack, modify the payload:
const slackNotification = {
  messageType: 'slack',
  channel: '#transactions',
  text: `New transaction created: ${transaction.id}`,
  transactionId: transaction.id,
};
// → Routes to SLACK_MESSAGE queue
```

### 3. Email Notification (Example)

```typescript
// To send email, modify the payload:
const emailNotification = {
  messageType: 'email',
  to: 'admin@company.com',
  subject: 'Transaction Created',
  body: `Transaction ${transaction.id} was created successfully`,
};
// → Routes to EMAIL queue
```

## Available Actions

The `sendTransactionNotification` method supports these actions:

- `'created'` - When transaction is created
- `'updated'` - When transaction is modified
- `'completed'` - When transaction is finished successfully
- `'failed'` - When transaction fails (high priority)

## Adding More Notification Types

### 1. In Command Handlers

```typescript
// In UpdateTransactionCommand handler
export class UpdateTransactionCommandHandler {
  async execute(command: UpdateTransactionCommand): Promise<ITransaction> {
    const result = await this.repository.update(command.id, command.data);

    // Send update notification
    await this.transactionService.sendTransactionNotification(
      result,
      command.user,
      'updated',
    );

    return result;
  }
}
```

### 2. In Event Handlers

```typescript
// Listen to domain events and send notifications
@EventsHandler(TransactionCompletedEvent)
export class TransactionCompletedHandler {
  constructor(private messageQueueHandler: MessageQueueEventHandler) {}

  async handle(event: TransactionCompletedEvent): Promise<void> {
    await this.messageQueueHandler.handleMessageQueueEvent(
      {
        id: `transaction-completed-${event.aggregateId}`,
        payload: {
          messageType: 'notification',
          notificationType: 'transaction',
          action: 'completed',
          transactionId: event.aggregateId,
        },
      },
      event.metadata,
    );
  }
}
```

## Configuration

### Environment Variables

Ensure these are configured for queue processing:

```env
# Redis (required for BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379

# Queue Settings
QUEUE_CONCURRENCY=5
QUEUE_RETRY_ATTEMPTS=3
```

### Queue Monitoring

Monitor queue health via the health endpoint:

```bash
GET /api/actuator/detail
```

## Benefits

1. **Automatic Routing** - Messages route to correct queues without manual configuration
2. **Type Safety** - Full TypeScript support with proper typing
3. **Reliability** - Built on EventStore with exactly-once delivery guarantees
4. **Extensible** - Easy to add new notification types and routing strategies
5. **Scalable** - BullMQ handles queue processing and horizontal scaling

## Testing

### Unit Tests

```typescript
describe('TransactionApplicationService', () => {
  it('should send notification when creating transaction', async () => {
    const mockHandler = jest.mocked(messageQueueHandler);

    await service.create(mockUser, mockDto);

    expect(mockHandler.handleMessageQueueEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          messageType: 'notification',
          action: 'created',
        }),
      }),
      expect.any(Object),
    );
  });
});
```

### Integration Tests

```typescript
describe('Transaction Message Queue Integration', () => {
  it('should route transaction notifications to correct queue', async () => {
    // Create transaction
    const transaction = await transactionService.create(user, createDto);

    // Verify message was queued
    const notificationQueue = await getQueue(QUEUE_NAMES.NOTIFICATION);
    const jobs = await notificationQueue.getJobs(['waiting']);

    expect(jobs).toHaveLength(1);
    expect(jobs[0].data).toMatchObject({
      transactionId: transaction.id,
      action: 'created',
    });
  });
});
```

---

**Status**: ✅ Fully Integrated and Production Ready
**Dependencies**: GenericMessageQueueModule, BullMQ, EventStore
**Last Updated**: August 9, 2025
