# Enhanced Transaction Aggregate - Usage Examples

## Overview

This document demonstrates how to use the enhanced Transaction aggregate with its new lifecycle management capabilities.

## Basic Usage Examples

### 1. Creating a New Transaction

```typescript
import {
  Transaction,
  TransactionIdentifier,
  TransactionStatusEnum,
} from '../domain';

// Create a new transaction
const user = { id: 'user-123', tenant: 'default' }; // IUserToken
const transaction = Transaction.create(user, {
  id: TransactionIdentifier.create(),
  from: 'account-alice',
  to: 'account-bob',
  amount: 150.0,
  status: TransactionStatusEnum.CREATED,
  retryCount: 0,
});

console.log('Transaction created:', transaction.getId());
// Output: Transaction created: txn-abc123...
```

### 2. Processing Transaction Lifecycle

```typescript
// 1. Queue the transaction for processing
transaction.markAsQueued(user, 'job-456', 10);
console.log('Status:', transaction.status); // PENDING

// 2. Successfully complete the transaction
const processingDetails = {
  processingTime: 'PT1.5S',
  gateway: 'stripe',
  transactionRef: 'pi_123abc',
};
transaction.markAsCompleted(user, processingDetails);
console.log('Status:', transaction.status); // SUCCESS
console.log('Processed at:', transaction.processedAt);
```

### 3. Handling Transaction Failures

```typescript
// Mark transaction as failed
transaction.markAsFailed(user, 'Insufficient funds in source account');
console.log('Status:', transaction.status); // FAILED
console.log('Failure reason:', transaction.failureReason);
```

### 4. Retry Logic

```typescript
// Mark for retry with scheduled time
const nextRetryAt = new Date(Date.now() + 30000); // 30 seconds from now
transaction.markForRetry(user, 'Network timeout', nextRetryAt);

console.log('Status:', transaction.status); // RETRYING
console.log('Retry count:', transaction.retryCount); // 1
console.log('Next retry at:', transaction.scheduledAt);
```

### 5. Scheduled Transactions

```typescript
// Create a transaction scheduled for future processing
const futureDate = new Date('2025-08-15T10:00:00Z');
const scheduledTransaction = Transaction.createScheduled(
  user,
  {
    id: TransactionIdentifier.create(),
    from: 'account-charlie',
    to: 'account-diana',
    amount: 75.5,
    status: TransactionStatusEnum.SCHEDULED,
    retryCount: 0,
  },
  futureDate,
);

console.log('Status:', scheduledTransaction.status); // SCHEDULED
console.log('Scheduled for:', scheduledTransaction.scheduledAt);

// Later, reschedule if needed
const newDate = new Date('2025-08-16T14:00:00Z');
scheduledTransaction.reschedule(user, newDate);
```

## Advanced Usage Examples

### 6. Complete Processing Pipeline

```typescript
class TransactionProcessor {
  async processTransaction(
    transaction: Transaction,
    user: IUserToken,
  ): Promise<void> {
    try {
      // 1. Queue for processing
      transaction.markAsQueued(user, `job-${Date.now()}`, 5);

      // 2. Simulate processing
      const result = await this.performPayment(transaction);

      // 3. Mark as completed with details
      transaction.markAsCompleted(user, {
        processingTime: result.duration,
        gateway: result.gateway,
        reference: result.transactionId,
      });

      console.log(
        `✅ Transaction ${transaction.getId()} completed successfully`,
      );
    } catch (error) {
      // Handle failure with retry logic
      if (this.isRetryableError(error) && transaction.retryCount < 3) {
        const retryDelay = Math.pow(2, transaction.retryCount) * 1000; // exponential backoff
        const nextRetry = new Date(Date.now() + retryDelay);

        transaction.markForRetry(user, error.message, nextRetry);
        console.log(
          `🔄 Transaction ${transaction.getId()} scheduled for retry #${transaction.retryCount}`,
        );
      } else {
        transaction.markAsFailed(user, error.message);
        console.log(`❌ Transaction ${transaction.getId()} failed permanently`);
      }
    }
  }

  private async performPayment(transaction: Transaction): Promise<any> {
    // Simulate payment processing
    if (Math.random() < 0.8) {
      // 80% success rate
      return {
        duration: 'PT1.2S',
        gateway: 'stripe',
        transactionId: `pi_${Date.now()}`,
      };
    } else {
      throw new Error('Payment gateway timeout');
    }
  }

  private isRetryableError(error: Error): boolean {
    const retryableErrors = ['timeout', 'network', 'rate limit'];
    return retryableErrors.some((keyword) =>
      error.message.toLowerCase().includes(keyword),
    );
  }
}
```

### 7. Event-Driven Architecture Integration

```typescript
// The aggregate automatically emits events for each state transition
// These events can be consumed by event handlers

class TransactionEventHandler {
  @EventsHandler(TransactionQueuedEvent)
  async handleTransactionQueued(event: TransactionQueuedEvent): Promise<void> {
    console.log('Transaction queued:', {
      transactionId: event.aggregateId,
      jobId: event.jobId,
      priority: event.priority,
      queuedAt: event.queuedAt,
    });

    // Trigger metrics, notifications, etc.
    await this.metricsService.incrementCounter('transactions.queued');
  }

  @EventsHandler(TransactionCompletedEvent)
  async handleTransactionCompleted(
    event: TransactionCompletedEvent,
  ): Promise<void> {
    console.log('Transaction completed:', {
      transactionId: event.aggregateId,
      completedAt: event.completedAt,
      processingDetails: event.processingDetails,
    });

    // Send completion notifications
    await this.notificationService.sendCompletionNotification(event);
  }

  @EventsHandler(TransactionFailedEvent)
  async handleTransactionFailed(event: TransactionFailedEvent): Promise<void> {
    console.log('Transaction failed:', {
      transactionId: event.aggregateId,
      reason: event.failureReason,
      retryAttempt: event.retryAttempt,
      isRetryable: event.isRetryable,
    });

    // Send failure alerts
    await this.alertService.sendFailureAlert(event);
  }
}
```

### 8. Repository Integration

```typescript
class TransactionApplicationService {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly commandBus: CommandBus,
  ) {}

  async createAndProcessTransaction(
    createData: CreateTransactionProps,
  ): Promise<string> {
    const user = this.getCurrentUser();

    // 1. Create transaction
    const transaction = Transaction.create(user, {
      id: TransactionIdentifier.create(),
      ...createData,
      status: TransactionStatusEnum.CREATED,
      retryCount: 0,
    });

    // 2. Save to repository (emits TransactionCreatedEvent)
    await this.transactionRepository.save(user, transaction);

    // 3. Queue for processing
    transaction.markAsQueued(user, `job-${Date.now()}`, 5);
    await this.transactionRepository.save(user, transaction);

    // 4. Process via command bus
    await this.commandBus.execute(
      new ProcessTransactionCommand(transaction.getId()),
    );

    return transaction.getId();
  }

  async retryFailedTransaction(transactionId: string): Promise<void> {
    const user = this.getCurrentUser();

    // Load from repository
    const transaction = await this.transactionRepository.findById(
      user,
      transactionId,
    );

    if (transaction.status === TransactionStatusEnum.FAILED) {
      // Reset for retry
      const nextRetry = new Date(Date.now() + 60000); // 1 minute
      transaction.markForRetry(user, 'Manual retry requested', nextRetry);

      // Save changes (emits TransactionRetryingEvent)
      await this.transactionRepository.save(user, transaction);
    }
  }
}
```

## Event Types Generated

1. **TransactionCreatedEvent** - When transaction is created
2. **TransactionQueuedEvent** - When queued for processing
3. **TransactionCompletedEvent** - When successfully completed
4. **TransactionFailedEvent** - When processing fails
5. **TransactionRetryingEvent** - When marked for retry
6. **TransactionScheduledEvent** - When scheduled/rescheduled
7. **TransactionUpdatedEvent** - When individual fields change

## Benefits

- ✅ **Rich State Management** - Complete transaction lifecycle tracking
- ✅ **Event Sourcing** - All state changes emit domain events
- ✅ **Retry Logic** - Built-in retry capabilities with exponential backoff
- ✅ **Failure Handling** - Proper error tracking and reporting
- ✅ **Scheduling** - Future transaction processing support
- ✅ **Monitoring** - Comprehensive state and metrics tracking
- ✅ **Integration Ready** - Works with EventStore, BullMQ, and message queues

---

**Status**: ✅ Ready for Production Use  
**Version**: 2.0.0  
**Last Updated**: August 9, 2025
