# COPILOT Framework Summary: Enterprise DDD + CQRS + Event Sourcing Architecture

> **Purpose:** This document provides GitHub Copilot with complete context to generate production-grade code following the established architectural patterns in this codebase.

---

## Architecture Foundation

### Core Principles

- **Domain-Driven Design (DDD)** with bounded contexts and aggregates
- **CQRS + Event Sourcing** using EventStoreDB for write-side persistence
- **Hexagonal Architecture** with ports/adapters for infrastructure isolation
- **Never-throw domain policy** using `Result<T,E>` patterns
- **Fail-closed security** with app-level authorization via OPA
- **Multi-tenant SaaS** architecture with tenant isolation

### Technology Stack

- **Framework:** NestJS v11 with TypeScript
- **Event Store:** EventStoreDB for aggregates and projections
- **Message Queues:** BullMQ v5 with ioredis connections
- **Cache/Session:** Redis with ioredis client
- **Authorization:** Open Policy Agent (OPA) with Rego policies
- **Authentication:** Keycloak integration
- **Logging:** Pino structured logging with W3C trace context
- **Error Handling:** RFC 9457 Problem Details with structured exceptions

---

## Code Generation Patterns

### 1. UseCase Template (Primary Business Logic)

```typescript
@Injectable()
export class Create{{Entity}}UseCase {
  constructor(
    private readonly repo: {{Entity}}RepositoryPort,
    private readonly outbox: OutboxPort,
    private readonly authz: AuthorizationPolicyPort,
    private readonly decisioning: DecisioningPolicyPort, // Optional
    private readonly clock: ClockPort,
    @Inject('ILogger') private readonly logger: ILogger,
    @Inject('ExceptionFactory') private readonly ex: ExceptionFactory,
  ) {}

  async execute({ user, data, meta }: Create{{Entity}}Input): Promise<{{Entity}}Result> {
    // 1) Authorization (fail-closed)
    const decision = await this.authz.authorize({
      action: '{{entity}}.create',
      subject: { id: user.userId, roles: user.roles, tenantId: meta.tenantId },
      resource: { type: '{{entity}}', attrs: { ...data, tenantId: meta.tenantId } },
      context: { correlationId: meta.correlationId, tenantId: meta.tenantId, occurredAt: meta.timestamp.toISOString(), source: meta.source },
    });
    if (!decision.allow) throw this.ex.throw(decision.code ?? 'forbidden');

    // 2) Optional business rules (decisioning)
    // const { feeMinor } = await this.decisioning.evaluateFees({ amountMinor: data.amountMinor, channel: data.channel });

    // 3) Domain logic (pure)
    const agg = {{Entity}}.create(data, user);

    // 4) Persist with metadata
    await this.repo.save(agg, {
      correlationId: meta.correlationId,
      tenantId: meta.tenantId,
      user,
      idempotencyKey: meta.idempotencyKey,
      source: meta.source,
      occurredAt: this.clock.now(),
    });

    // 5) Outbox for integrations
    await this.outbox.enqueue('{{entity}}.created.v1', { id: agg.id.value }, {
      correlationId: meta.correlationId,
      tenantId: meta.tenantId,
      user,
      source: meta.source,
      occurredAt: this.clock.now(),
    });

    this.logger.info('{{entity}}.created', { ...meta, {{entity}}Id: agg.id.value });
    return { id: agg.id.value, version: agg.version };
  }
}
```

### 2. Command Handler Template (Thin Delegation)

```typescript
@CommandHandler(Create{{Entity}}Command)
export class Create{{Entity}}Handler implements ICommandHandler<Create{{Entity}}Command, {{Entity}}Result> {
  constructor(
    private readonly useCase: Create{{Entity}}UseCase,
    @Inject('ILogger') private readonly logger: ILogger,
  ) {}

  async execute(cmd: Create{{Entity}}Command): Promise<{{Entity}}Result> {
    this.logger.info('cmd.received', {
      type: 'Create{{Entity}}Command',
      correlationId: cmd.correlationId,
      tenantId: cmd.tenantId,
      source: '{{Context}}Module'
    });

    return this.useCase.execute({
      user: cmd.user,
      data: cmd.payload,
      meta: {
        correlationId: cmd.correlationId,
        tenantId: cmd.tenantId,
        idempotencyKey: cmd.idempotencyKey,
        source: '{{Context}}Module',
        timestamp: new Date(),
      },
    });
  }
}
```

### 3. Domain Aggregate Template

```typescript
export class {{Entity}} extends AggregateRoot {
  private constructor(
    public readonly id: {{Entity}}Id,
    private _status: {{Entity}}Status,
    private _createdAt: Date,
    private _version: number = 0,
  ) {
    super();
  }

  static create(data: Create{{Entity}}Data, user: IUserToken): {{Entity}} {
    // Domain validation
    if (!data.name?.trim()) {
      throw new ValidationError('Name is required');
    }

    const id = {{Entity}}Id.generate();
    const entity = new {{Entity}}(id, {{Entity}}Status.Active, new Date());

    entity.apply(new {{Entity}}CreatedEvent({
      id: id.value,
      ...data,
      createdBy: user.userId,
      createdAt: entity._createdAt,
    }));

    return entity;
  }

  // Event handlers
  private on{{Entity}}Created(event: {{Entity}}CreatedEvent): void {
    // Update state based on event
  }

  // Business methods with Result<T,E> pattern
  updateStatus(newStatus: {{Entity}}Status, user: IUserToken): Result<void, ValidationError> {
    if (this._status === newStatus) {
      return Err(new ValidationError('Status unchanged'));
    }

    this.apply(new {{Entity}}StatusUpdatedEvent({
      id: this.id.value,
      oldStatus: this._status,
      newStatus,
      updatedBy: user.userId,
      updatedAt: new Date(),
    }));

    return Ok(undefined);
  }
}
```

### 4. Repository Port & Adapter

```typescript
// Port
export abstract class {{Entity}}RepositoryPort {
  abstract save(aggregate: {{Entity}}, metadata: EventMetadata): Promise<void>;
  abstract getById(id: {{Entity}}Id, tenantId: string): Promise<{{Entity}} | null>;
  abstract getByIdOrThrow(id: {{Entity}}Id, tenantId: string): Promise<{{Entity}}>;
}

// ESDB Adapter
@Injectable()
export class Esdb{{Entity}}Repository extends {{Entity}}RepositoryPort {
  constructor(
    @Inject('EventStoreClient') private readonly client: EventStoreDBClient,
    @Inject('ILogger') private readonly logger: ILogger,
  ) {
    super();
  }

  async save(aggregate: {{Entity}}, metadata: EventMetadata): Promise<void> {
    const events = aggregate.getUncommittedEvents().map(event =>
      jsonEvent({
        type: event.constructor.name,
        data: event,
        metadata: {
          ...metadata,
          eventId: randomUUID(),
          eventType: event.constructor.name,
          streamName: `{{entity}}-${aggregate.id.value}`,
        },
      })
    );

    const streamName = `{{entity}}-${aggregate.id.value}`;
    await this.client.appendToStream(streamName, events, {
      expectedRevision: aggregate.version === 0 ? EXPECTED_VERSION_NO_STREAM : aggregate.version - 1,
    });

    aggregate.markEventsAsCommitted();
  }

  async getById(id: {{Entity}}Id, tenantId: string): Promise<{{Entity}} | null> {
    try {
      const streamName = `{{entity}}-${id.value}`;
      const events = this.client.readStream(streamName);

      const eventData: any[] = [];
      for await (const event of events) {
        eventData.push(event.event?.data);
      }

      if (eventData.length === 0) return null;
      return {{Entity}}.fromHistory(eventData);
    } catch (error) {
      if (error instanceof StreamNotFoundError) return null;
      throw error;
    }
  }
}
```

### 5. BullMQ Integration Patterns

```typescript
// Outbox Adapter
@Injectable()
export class BullmqOutboxAdapter implements OutboxPort {
  constructor(
    @Inject('BullMQ_Integration_Queue') private readonly queue: Queue,
    @Inject('ILogger') private readonly logger: ILogger,
  ) {}

  async enqueue(eventType: string, payload: any, metadata: EventMetadata): Promise<void> {
    await this.queue.add(
      eventType,
      {
        eventType,
        payload,
        metadata: {
          ...metadata,
          enqueuedAt: new Date().toISOString(),
          jobId: randomUUID(),
        },
      },
      {
        jobId: metadata.idempotencyKey || randomUUID(),
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      }
    );

    this.logger.info('outbox.enqueued', {
      eventType,
      correlationId: metadata.correlationId,
      tenantId: metadata.tenantId,
    });
  }
}

// Worker Template
@Processor('integration-events')
export class {{Entity}}EventWorker {
  constructor(
    private readonly commandBus: CommandBus,
    @Inject('ILogger') private readonly logger: ILogger,
  ) {}

  @Process('{{entity}}.created.v1')
  async handle{{Entity}}Created(job: Job<{{Entity}}CreatedEventData>): Promise<void> {
    const { payload, metadata } = job.data;

    this.logger.info('job.started', {
      jobId: job.id,
      eventType: '{{entity}}.created.v1',
      correlationId: metadata.correlationId,
      tenantId: metadata.tenantId,
    });

    try {
      // Re-authorize for async processing
      await this.commandBus.execute(new ProcessIntegrationCommand(
        metadata.user,
        payload,
        metadata.correlationId,
        metadata.tenantId,
        `${job.id}`,
      ));

      this.logger.info('job.completed', {
        jobId: job.id,
        correlationId: metadata.correlationId,
      });
    } catch (error) {
      this.logger.error('job.failed', {
        jobId: job.id,
        correlationId: metadata.correlationId,
        error: error.message,
      });
      throw error;
    }
  }
}
```

### 6. Module Wiring Pattern

```typescript
@Module({
  imports: [CqrsModule],
  providers: [
    // UseCases
    Create{{Entity}}UseCase,
    Update{{Entity}}UseCase,
    Delete{{Entity}}UseCase,

    // Handlers
    Create{{Entity}}Handler,
    Update{{Entity}}Handler,
    Delete{{Entity}}Handler,

    // Ports → Adapters
    { provide: {{Entity}}RepositoryPort, useClass: Esdb{{Entity}}Repository },
    { provide: OutboxPort, useClass: BullmqOutboxAdapter },
    { provide: AuthorizationPolicyPort, useFactory: () => new OpaAuthorizationPolicyAdapter(new OpaClient(process.env.OPA_URL ?? 'http://localhost:8181'), 'authz.allow') },
    { provide: DecisioningPolicyPort, useFactory: () => new OpaDecisioningPolicyAdapter(new OpaClient(process.env.OPA_URL ?? 'http://localhost:8181'), 'decisioning.fees') },
    { provide: ClockPort, useClass: SystemClock },

    // Cross-cutting
    { provide: 'ExceptionFactory', useClass: DomainExceptionFactory },
    { provide: 'ILogger', useClass: PinoLoggerAdapter },
  ],
  controllers: [{{Entity}}Controller],
})
export class {{Context}}Module {}
```

---

## Key Patterns & Standards

### Naming Conventions

- **Streams:** `{entity}-{aggregateId}` (e.g., `payment-uuid`)
- **Events:** `{Entity}{Action}Event` (e.g., `PaymentCreatedEvent`)
- **Commands:** `{Action}{Entity}Command` (e.g., `CreatePaymentCommand`)
- **Redis Keys:** `{service}:{context}:{entity}:{id}:{field}` with tenant prefix
- **BullMQ Queues:** `{context}-{purpose}` (e.g., `payment-integration`)

### Metadata Standards

```typescript
interface EventMetadata {
  correlationId: string;
  tenantId: string;
  user: IUserToken;
  idempotencyKey?: string;
  source: string;
  occurredAt: Date;
}

interface StandardMeta {
  correlationId: string;
  tenantId: string;
  idempotencyKey?: string;
  source: string;
  timestamp: Date;
}
```

### Error Handling Patterns

```typescript
// Domain exceptions (never throw raw errors)
export class DomainExceptionFactory {
  constructor(private readonly map: Record<string, IException>) {}

  throw(key: string, extra?: any): never {
    const e = this.map[key] ?? this.map['internal_error'];
    throw new this.constructException(e, extra);
  }
}

// Result pattern for domain methods
export type Result<T, E extends Error> = Ok<T> | Err<E>;
```

### Logging Standards

```typescript
// Structured logging with correlation
this.logger.info('operation.completed', {
  correlationId: meta.correlationId,
  tenantId: meta.tenantId,
  userId: user.userId,
  entityId: entity.id.value,
  duration: Date.now() - startTime,
});

// Error enrichment
this.logger.error('operation.failed', {
  correlationId: meta.correlationId,
  error: error.message,
  stack: error.stack,
  context: 'CreatePaymentUseCase',
});
```

### Authorization Patterns

```typescript
// OPA authorization call
const decision = await this.authz.authorize({
  action: '{entity}.{operation}',
  subject: { id: user.userId, roles: user.roles, tenantId: meta.tenantId },
  resource: { type: '{entity}', attrs: { ...data, tenantId: meta.tenantId } },
  context: {
    correlationId: meta.correlationId,
    tenantId: meta.tenantId,
    occurredAt: meta.timestamp.toISOString(),
    source: meta.source,
  },
});
if (!decision.allow) throw this.ex.throw(decision.code ?? 'forbidden');
```

### Testing Patterns

```typescript
// UseCase testing template
describe('Create{{Entity}}UseCase', () => {
  let useCase: Create{{Entity}}UseCase;
  let mockRepo: jest.Mocked<{{Entity}}RepositoryPort>;
  let mockAuthz: jest.Mocked<AuthorizationPolicyPort>;
  let mockOutbox: jest.Mocked<OutboxPort>;

  beforeEach(() => {
    mockRepo = createMock<{{Entity}}RepositoryPort>();
    mockAuthz = createMock<AuthorizationPolicyPort>();
    mockOutbox = createMock<OutboxPort>();

    useCase = new Create{{Entity}}UseCase(mockRepo, mockOutbox, mockAuthz, /* ... */);
  });

  it('should create entity when authorized', async () => {
    // Arrange
    mockAuthz.authorize.mockResolvedValue({ allow: true, policyRev: '1.0' });

    // Act
    const result = await useCase.execute(validInput);

    // Assert
    expect(mockRepo.save).toHaveBeenCalled();
    expect(mockOutbox.enqueue).toHaveBeenCalledWith('entity.created.v1', expect.any(Object), expect.any(Object));
  });

  it('should throw forbidden when denied', async () => {
    // Arrange
    mockAuthz.authorize.mockResolvedValue({ allow: false, code: 'insufficient_permissions' });

    // Act & Assert
    await expect(useCase.execute(validInput)).rejects.toThrow();
  });
});
```

---

## Development Guidelines

### Code Generation Checklist

When generating new entities/features:

1. **UseCase** with authorization, domain logic, persistence, outbox
2. **Command/Handler** with thin delegation
3. **Domain Aggregate** with Result<T,E> methods
4. **Repository Port & ESDB Adapter**
5. **Module wiring** with all ports/adapters
6. **BullMQ workers** for async processing
7. **OPA policies** for authorization
8. **Tests** for all layers
9. **Exception mapping** in factory
10. **Logging** with correlation context

### Architecture Rules

- **Never import infrastructure in domain/application layers**
- **Always use ports for external dependencies**
- **Authorization required in every UseCase**
- **Metadata attached to all events and outbox messages**
- **Result<T,E> for all domain methods that can fail**
- **Structured exceptions via ExceptionFactory**
- **Correlation IDs in all log messages**
- **Tenant isolation at every layer**

### Performance Considerations

- **EventStoreDB streams** optimized for write-heavy workloads
- **Redis caching** for read projections
- **BullMQ job priorities** and retry strategies
- **OPA timeouts** kept under 300ms
- **Batch processing** for bulk operations
- **Connection pooling** for all external services

---

## Quick Reference

### Common Imports

```typescript
// Domain
import { AggregateRoot, Result, Ok, Err } from '@shared/domain';

// Application
import { ICommandHandler, CommandHandler } from '@nestjs/cqrs';
import { Injectable, Inject } from '@nestjs/common';

// Infrastructure
import { EventStoreDBClient } from '@eventstore/db-client';
import { Queue, Job, Processor, Process } from '@nestjs/bullmq';

// Logging & Observability
import { ILogger } from '@shared/observability';
import { correlationId, tenantId } from '@shared/context';

// Authorization
import {
  AuthorizationPolicyPort,
  DecisioningPolicyPort,
} from '@shared/authorization';
```

### Environment Variables

```bash
# EventStoreDB
EVENTSTORE_CONNECTION_STRING=esdb://localhost:2113?tls=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# OPA
OPA_URL=http://localhost:8181

# Keycloak
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=core-notification
KEYCLOAK_CLIENT_ID=api

# Observability
LOG_LEVEL=info
TRACE_SAMPLE_RATE=0.1
```

---

This summary provides GitHub Copilot with the complete architectural context and patterns needed to generate sophisticated, production-ready code that aligns with your established enterprise standards.
