# Transaction Worker Pattern - Complete Example

This document demonstrates how to implement a complete BullMQ worker pattern for the Transaction module, following the same architecture as the MessageQueueApiAdapter.

## Architecture Overview

```
┌─────────────────┐    ┌────────────────────┐    ┌─────────────────────┐
│    Controller   │───▶│ Job Dispatcher     │───▶│    BullMQ Queue     │
│   (API Layer)   │    │   (Enqueue Jobs)   │    │ (DATA_PROCESSING)   │
└─────────────────┘    └────────────────────┘    └─────────────────────┘
                                                             │
                                                             ▼
┌─────────────────┐    ┌────────────────────┐    ┌─────────────────────┐
│ External APIs   │◀───│ API Adapter        │◀───│ Transaction Worker  │
│   (3rd Party)   │    │ (Infrastructure)   │    │    (Processor)      │
└─────────────────┘    └────────────────────┘    └─────────────────────┘
                                                             │
                                                             ▼
                       ┌────────────────────┐    ┌─────────────────────┐
                       │ Application Service│◀───│  Business Logic     │
                       │   (Use Cases)      │    │    (Domain)         │
                       └────────────────────┘    └─────────────────────┘
```

## Key Components

### 1. **TransactionJobDispatcher** (Job Enqueuing)

- Enqueues transaction processing jobs to BullMQ
- Handles job priorities, retries, and batching
- Similar to how messages are enqueued for processing

### 2. **TransactionProcessor** (BullMQ Worker)

- Processes jobs from the DATA_PROCESSING queue
- Delegates to TransactionApplicationService
- Handles retries and error management
- Similar to MessageProcessor but for transactions

### 3. **TransactionApiAdapter** (External Integration)

- Handles communication with external transaction APIs
- Simulates processing fees, exchange rates, etc.
- Similar to SlackApiAdapter pattern

### 4. **TransactionApplicationService** (Business Logic)

- Orchestrates transaction processing workflow
- Validates requests and handles business rules
- Coordinates between adapters and domain logic

## Usage Examples

### Example 1: Dispatch a Single Transaction Job

```typescript
// In a controller or service
@Injectable()
export class SomeController {
  constructor(
    private readonly transactionDispatcher: TransactionJobDispatcher,
  ) {}

  async processTransaction(transactionData: any) {
    const jobData: TransactionJobData = {
      transactionId: transactionData.id,
      operationType: 'withdrawal',
      amount: 100.5,
      currency: 'USD',
      fromAccount: 'account-123',
      description: 'ATM Withdrawal',
      tenant: 'tenant-xyz',
      priority: 'high',
    };

    // This enqueues the job - worker will process it asynchronously
    await this.transactionDispatcher.dispatchTransactionProcessing(jobData);

    return { message: 'Transaction processing initiated' };
  }
}
```

### Example 2: Batch Processing

```typescript
// Process multiple transactions
const batchJobs: TransactionJobData[] = [
  {
    transactionId: 'txn-001',
    operationType: 'deposit',
    amount: 500.0,
    currency: 'USD',
    toAccount: 'account-456',
    tenant: 'tenant-xyz',
    priority: 'normal',
  },
  {
    transactionId: 'txn-002',
    operationType: 'transfer',
    amount: 250.0,
    currency: 'EUR',
    fromAccount: 'account-123',
    toAccount: 'account-789',
    tenant: 'tenant-xyz',
    priority: 'high',
  },
];

await this.transactionDispatcher.dispatchBatchTransactionProcessing(batchJobs);
```

## Workflow Process

1. **Job Enqueuing**: TransactionJobDispatcher adds jobs to BullMQ queue
2. **Worker Processing**: TransactionProcessor picks up jobs from queue
3. **Business Logic**: Delegates to TransactionApplicationService
4. **External Integration**: Uses TransactionApiAdapter for external APIs
5. **Result Handling**: Success/failure managed with proper retry logic

## Error Handling & Retries

- **Retryable Errors**: Network issues, timeouts, rate limits
- **Non-Retryable Errors**: Invalid data, insufficient funds, etc.
- **Exponential Backoff**: 2s, 4s, 8s delays between retries
- **Job Limits**: Keep last 10 successful, 50 failed jobs for analysis

## Comparison with MessageQueue Pattern

| Aspect       | MessageQueue Pattern        | Transaction Pattern           |
| ------------ | --------------------------- | ----------------------------- |
| **Queue**    | notification, slack-message | data-processing               |
| **Worker**   | MessageProcessor            | TransactionProcessor          |
| **Adapter**  | SlackApiAdapter             | TransactionApiAdapter         |
| **Service**  | MessageApplicationService   | TransactionApplicationService |
| **Job Data** | MessageJobData              | TransactionJobData            |
| **Purpose**  | Send notifications          | Process transactions          |

## Module Registration

The Transaction module automatically registers all components:

```typescript
@Module({
  providers: [
    // Core services
    TransactionApplicationService,

    // Infrastructure adapters
    TransactionApiAdapter,

    // BullMQ workers
    TransactionProcessor,

    // Job dispatchers
    TransactionJobDispatcher,

    // Other components...
  ],
})
export class TransactionModule {}
```

## Key Benefits

1. **Asynchronous Processing**: Long-running transaction operations don't block APIs
2. **Reliability**: Built-in retry mechanisms and error handling
3. **Scalability**: Workers can be scaled independently
4. **Monitoring**: BullMQ provides job status and metrics
5. **Consistency**: Follows established patterns in the codebase

This pattern provides the same robust, scalable architecture for transaction processing as the existing message queue system.
