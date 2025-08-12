# COPILOT_INSTRUCTIONS.md — Centralized Logging Strategy

> **Scope**: NestJS + Pino, CLS (async context), BullMQ, EventStoreDB (ESDB), Grafana Loki / Elasticsearch (ELK)
>
> **Goal**: One **consistent JSON log shape**, **traceable end‑to‑end**, configurable **sink** (console/stdout, Loki, Elasticsearch) without touching business code.

---

## TL;DR (What Copilot should generate by default)

- A **LoggerModule** that wires **nestjs-pino** with a **config-driven sink** (env: `LOG_SINK`).
- A **CLS module** and an early **TraceMiddleware** to create/propagate a `traceId` from `traceparent | x-request-id` or generate one.
- A **logger factory** that enriches every log with `traceId`, `correlationId`, `tenantId`, `userId` from CLS.
- A **central `Log` helper** (typed functions) used across app code; business code never selects the sink.
- Integration snippets for **BullMQ** (propagate `traceId` through jobs) and **EventStoreDB** (attach `traceId` in metadata, set CLS in consumers).
- **Severity hygiene** + **low-cardinality** fields for observability.

---

## 1) Design Principles

1. **One JSON shape everywhere**: predictable keys → easy queries & dashboards.
2. **Separation of concerns**: sink chosen by configuration at boot, not in handlers.
3. **End‑to‑end correlation**: always include `traceId`; optionally a business `correlationId`.
4. **Low cardinality first**: use stable keys (`service`, `component`, `method`) for filters; keep payloads small.
5. **Idiomatically Pino**: log `err: Error` objects, not hand-rolled stacks.
6. **Benign startup states ≠ WARN**: expected empty streams are `info` with `expected: true`.

---

## 2) Canonical JSON Log Shape

All logs should follow this base shape (fields may be omitted if empty):

```json
{
  "time": "2025-08-12T12:58:37.555Z",
  "level": "info", // trace|debug|info|warn|error|fatal
  "msg": "Human-readable summary",
  "app": "<APP_NAME>",
  "environment": "local|dev|staging|prod",
  "version": "0.0.1",

  "service": "core-template-manager", // stable, low-cardinality
  "component": "TemplateProjectionManager",
  "method": "startProjection",

  "traceId": "…", // technical correlation (W3C-capable)
  "correlationId": "…", // optional business correlation
  "tenantId": "…", // optional multi-tenant context
  "userId": "…", // optional end-user context

  "expected": true, // mark benign conditions
  "timingMs": 42, // optional timings

  "esdb": {
    // domain-specific sections
    "category": "coreTemplateManager.template.v1",
    "stream": "$ce-coreTemplateManager.template.v1",
    "subscription": "template-catchup",
    "eventId": "…"
  },
  "bull": {
    "queue": "notifications",
    "jobId": "…",
    "attempt": 1
  },

  "retry": { "attempt": 0, "backoffMs": 0 },
  "err": { "type": "NotFoundError", "message": "…", "stack": "…" }
}
```

### Required Keys

- `time`, `level`, `msg`, `app`, `environment`, `version`.
- `service`, `component`, `method`.
- `traceId` **always** present.

### Severity Mapping

- `debug` → high-volume internals (disabled by default in prod).
- `info` → normal milestones, including benign “empty start” conditions with `expected: true`.
- `warn` → degraded but continuing (retries, partial failures).
- `error` → failed operation; include `err: Error` and safe context.
- `fatal` → unrecoverable; process likely exits.

---

## 3) Configuration & Environment

**Sinks** are selected at boot via env vars; app code never switches sinks.

```
LOG_SINK=stdout|console|loki|elasticsearch
LOG_LEVEL=info
APP_NAME=gsnest-template
APP_VERSION=0.0.1
NODE_ENV=local|development|staging|production

# Loki (if LOG_SINK=loki)
LOKI_URL=http://loki:3100
LOKI_BASIC_AUTH=username:password  # optional

# Elasticsearch (if LOG_SINK=elasticsearch)
ES_NODE=http://elasticsearch:9200
ES_INDEX=app-logs

# Local pretty printing (optional)
PRETTY_LOGS=true
```

**Recommendations**

- **Prod**: `LOG_SINK=stdout` and ship via Promtail/Filebeat (best resilience).
- **Staging**: stdout + Promtail → Loki.
- **Local**: `console` + `PRETTY_LOGS=true` using `pino-pretty`.

---

## 4) NestJS + Pino Setup (HTTP path)

**What Copilot should scaffold**: a `LoggingModule` (using `nestjs-pino`) with a transport builder.

```ts
// logging.module.ts (simplified factory)
import { LoggerModule } from 'nestjs-pino';
import pino from 'pino';

function buildTransport() {
  const sink = process.env.LOG_SINK ?? 'stdout';
  const pretty = process.env.PRETTY_LOGS === 'true';

  if (sink === 'console' && pretty) {
    return { target: 'pino-pretty', options: { translateTime: 'UTC:isoTime' } };
  }
  if (sink === 'loki') {
    return {
      target: 'pino-loki',
      options: {
        host: process.env.LOKI_URL,
        basicAuth: process.env.LOKI_BASIC_AUTH,
        batching: true,
        interval: 2000,
        labels: {
          app: process.env.APP_NAME ?? 'app',
          env: process.env.NODE_ENV ?? 'local',
        },
      },
    };
  }
  if (sink === 'elasticsearch') {
    return {
      target: 'pino-elasticsearch',
      options: {
        node: process.env.ES_NODE,
        index: process.env.ES_INDEX ?? 'app-logs',
        esVersion: 8,
      },
    };
  }
  return undefined; // stdout (ship with Promtail/Filebeat)
}

export const LoggingModule = LoggerModule.forRoot({
  pinoHttp: {
    level: process.env.LOG_LEVEL ?? 'info',
    transport: buildTransport(),

    // Use/request a request id compatible with traceId
    genReqId: (req) =>
      (req.headers['x-request-id'] as string) || crypto.randomUUID(),

    // Surface request id as traceId in logs
    customAttributeKeys: { reqId: 'traceId' },

    // Standard app metadata on every log
    customProps: (req) => ({
      app: process.env.APP_NAME ?? 'app',
      environment: process.env.NODE_ENV ?? 'local',
      version: process.env.APP_VERSION ?? '0.0.1',
    }),

    // Keep request/response serializers lean
    serializers: {
      req(req) {
        return {
          method: req.method,
          url: req.url,
          headers: { 'user-agent': req.headers['user-agent'] },
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
      err(err) {
        return { type: err?.name, message: err?.message, stack: err?.stack };
      },
    },
  },
});
```

---

## 5) CLS (Async Context) & Trace Propagation

**Why**: Include `traceId/correlationId/tenantId/userId` automatically in non-HTTP logs (workers, schedulers, ESDB consumers).

1. **Install** `@nestjs/cls` and mount middleware early.
2. **TraceMiddleware**: parse W3C `traceparent` or `x-request-id`/`x-trace-id`; generate if missing; set response headers and CLS values.

```ts
// trace.middleware.ts (essential parts)
@Injectable()
export class TraceMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}
  use(req: any, res: any, next: Function) {
    const headerId =
      (req.headers['traceparent'] as string) ||
      (req.headers['x-request-id'] as string) ||
      crypto.randomUUID();
    const traceId = extractOrNormalizeTraceId(headerId); // implement W3C parsing if desired
    this.cls.set('traceId', traceId);
    res.setHeader('x-request-id', traceId);
    next();
  }
}
```

3. **App Logger** for non-HTTP paths uses CLS mixin:

```ts
// logger.factory.ts
export function buildAppLogger(cls: ClsService) {
  return pino({
    level: process.env.LOG_LEVEL ?? 'info',
    base: {
      app: process.env.APP_NAME ?? 'app',
      environment: process.env.NODE_ENV ?? 'local',
      version: process.env.APP_VERSION ?? '0.0.1',
    },
    mixin() {
      return {
        traceId: cls.get('traceId'),
        correlationId: cls.get('correlationId'),
        tenantId: cls.get('tenantId'),
        userId: cls.get('userId'),
      };
    },
  });
}
```

---

## 6) Centralized, Typed Log Helpers (use everywhere)

Create a single utility that encodes shape & conventions.

```ts
// structured-logger.ts
import type { Logger } from 'pino';

export type BaseCtx = {
  service: string;
  component: string;
  method: string;
  expected?: boolean;
  timingMs?: number;
};

export type EsdbCtx = BaseCtx & {
  esdb?: {
    category?: string;
    stream?: string;
    subscription?: string;
    eventId?: string;
  };
};

export type BullCtx = BaseCtx & {
  bull?: { queue: string; jobId?: string; attempt?: number };
};

export const Log = {
  info(logger: Logger, msg: string, ctx: Record<string, any>) {
    logger.info({ ...ctx, msg });
  },
  warn(logger: Logger, msg: string, ctx: Record<string, any>) {
    logger.warn({ ...ctx, msg });
  },
  error(logger: Logger, err: unknown, msg: string, ctx: Record<string, any>) {
    logger.error({ ...ctx, err }, msg);
  },
  esdbProjectionStarted(logger: Logger, ctx: EsdbCtx) {
    logger.info({ ...ctx, msg: 'Projection setup completed' });
  },
  esdbCatchupNotFound(logger: Logger, ctx: EsdbCtx) {
    logger.info({
      ...ctx,
      expected: true,
      msg: 'Category stream not found yet; waiting for first event',
    });
  },
  bullQueued(logger: Logger, ctx: BullCtx) {
    logger.info({ ...ctx, msg: 'Job queued' });
  },
  bullFailed(logger: Logger, err: unknown, ctx: BullCtx) {
    logger.error({ ...ctx, err, msg: 'Job failed' });
  },
};
```

Use `Log.*` in all services/handlers instead of calling `logger.info` directly.

---

## 6.5) Advanced Logging Utilities

### Correlation ID Generation Strategy

Provide consistent patterns for generating business correlation IDs:

```ts
// correlation.utils.ts
export const CorrelationUtils = {
  // For domain operations - ties to specific aggregate lifecycle
  domainCorrelation: (aggregateId: string, eventType: string) =>
    `dom-${aggregateId}-${eventType}-${Date.now()}`,

  // For integration flows - tracks external system interactions
  integrationCorrelation: (integrationType: string, sourceId: string) =>
    `int-${integrationType}-${sourceId}-${Date.now()}`,

  // For business processes - spans multiple aggregates/services
  processCorrelation: (processType: string, initiator: string) =>
    `proc-${processType}-${initiator}-${Date.now()}`,

  // For user-initiated workflows - ties to user actions
  userWorkflowCorrelation: (userId: string, workflowType: string) =>
    `user-${userId}-${workflowType}-${Date.now()}`,

  // For scheduled/batch operations
  batchCorrelation: (batchType: string, batchId: string) =>
    `batch-${batchType}-${batchId}-${Date.now()}`,
};

// Usage examples:
// Payment processing: CorrelationUtils.domainCorrelation('pay_123', 'PaymentCompleted')
// Kafka publishing: CorrelationUtils.integrationCorrelation('kafka-payments', 'pay_123')
// Multi-step checkout: CorrelationUtils.processCorrelation('checkout', 'user_456')
```

### Performance Metrics Integration

Enhanced timing and performance tracking:

```ts
// timing.utils.ts
export const TimingUtils = {
  startTiming: (operation: string) => {
    const start = process.hrtime.bigint();
    return {
      end: () => Number(process.hrtime.bigint() - start) / 1_000_000, // ms
      operation,
      startTime: new Date().toISOString(),
    };
  },

  logTiming: (
    logger: Logger,
    timing: { end: () => number; operation: string },
    ctx: BaseCtx,
  ) => {
    const duration = timing.end();
    const performanceCategory = TimingUtils.categorizePerformance(duration);

    Log.info(logger, `${timing.operation} completed`, {
      ...ctx,
      timingMs: duration,
      performance: performanceCategory,
      timing: {
        operation: timing.operation,
        durationMs: duration,
        category: performanceCategory,
      },
    });
  },

  categorizePerformance: (durationMs: number): string => {
    if (durationMs < 100) return 'fast';
    if (durationMs < 500) return 'normal';
    if (durationMs < 2000) return 'slow';
    if (durationMs < 10000) return 'very_slow';
    return 'critical';
  },

  // For tracking async operation phases
  phaseTimer: (operation: string) => {
    const phases: Array<{ phase: string; duration: number }> = [];
    let lastMark = process.hrtime.bigint();

    return {
      mark: (phase: string) => {
        const now = process.hrtime.bigint();
        const duration = Number(now - lastMark) / 1_000_000;
        phases.push({ phase, duration });
        lastMark = now;
      },
      complete: () => ({
        operation,
        totalMs: phases.reduce((sum, p) => sum + p.duration, 0),
        phases,
      }),
    };
  },
};

// Usage example:
const timer = TimingUtils.startTiming('payment.process');
// ... do work
TimingUtils.logTiming(logger, timer, ctx);

// Phase timing example:
const phaseTimer = TimingUtils.phaseTimer('order.checkout');
phaseTimer.mark('validation');
// ... validation work
phaseTimer.mark('payment');
// ... payment work
phaseTimer.mark('inventory');
// ... inventory work
const result = phaseTimer.complete();
Log.info(logger, 'Checkout phases completed', { ...ctx, timing: result });
```

### Error Context Enrichment

Structured error handling with categorization:

```ts
// error.utils.ts
export const ErrorUtils = {
  enrichError: (error: unknown, context: Record<string, any> = {}) => {
    if (error instanceof Error) {
      return {
        type: error.constructor.name,
        message: error.message,
        stack: error.stack,
        category: ErrorUtils.categorizeError(error),
        context: ErrorUtils.sanitizeContext(context),
        fingerprint: ErrorUtils.generateFingerprint(error),
      };
    }
    return {
      type: 'UnknownError',
      message: String(error),
      category: 'unknown',
      context: ErrorUtils.sanitizeContext(context),
    };
  },

  categorizeError: (error: Error): string => {
    const msg = error.message.toLowerCase();
    const name = error.constructor.name.toLowerCase();

    // Network/connectivity issues
    if (msg.includes('timeout') || msg.includes('etimedout')) return 'timeout';
    if (msg.includes('connection') || msg.includes('econnrefused'))
      return 'connectivity';
    if (msg.includes('network') || msg.includes('socket')) return 'network';

    // Authentication/authorization
    if (msg.includes('unauthorized') || msg.includes('401'))
      return 'authentication';
    if (msg.includes('forbidden') || msg.includes('403'))
      return 'authorization';

    // Rate limiting
    if (msg.includes('rate limit') || msg.includes('429')) return 'rate_limit';
    if (msg.includes('quota') || msg.includes('throttle')) return 'quota';

    // Data/validation issues
    if (msg.includes('not found') || msg.includes('404')) return 'not_found';
    if (msg.includes('validation') || name.includes('validation'))
      return 'validation';
    if (msg.includes('conflict') || msg.includes('409')) return 'conflict';

    // Infrastructure issues
    if (msg.includes('service unavailable') || msg.includes('503'))
      return 'service_unavailable';
    if (msg.includes('bad gateway') || msg.includes('502'))
      return 'bad_gateway';

    // Business logic
    if (name.includes('domain') || name.includes('business'))
      return 'business_rule';

    return 'application';
  },

  generateFingerprint: (error: Error): string => {
    // Create a stable fingerprint for error grouping
    const key = `${error.constructor.name}:${error.message?.substring(0, 100)}`;
    return Buffer.from(key).toString('base64').substring(0, 16);
  },

  sanitizeContext: (context: Record<string, any>): Record<string, any> => {
    // Remove sensitive data from error context
    const sanitized = { ...context };
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
    ];

    for (const key of Object.keys(sanitized)) {
      if (
        sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))
      ) {
        sanitized[key] = '[REDACTED]';
      }
    }
    return sanitized;
  },

  // Helper for retryable error classification
  isRetryable: (error: Error): boolean => {
    const category = ErrorUtils.categorizeError(error);
    const retryableCategories = [
      'timeout',
      'connectivity',
      'network',
      'rate_limit',
      'quota',
      'service_unavailable',
      'bad_gateway',
    ];
    return retryableCategories.includes(category);
  },
};

// Enhanced error logging
export const LogError = {
  withContext: (
    logger: Logger,
    error: unknown,
    msg: string,
    ctx: BaseCtx,
    additionalContext?: Record<string, any>,
  ) => {
    const enrichedError = ErrorUtils.enrichError(error, additionalContext);
    logger.error(
      {
        ...ctx,
        err: enrichedError,
        retryable:
          error instanceof Error ? ErrorUtils.isRetryable(error) : false,
      },
      msg,
    );
  },

  businessRule: (
    logger: Logger,
    rule: string,
    violation: string,
    ctx: BaseCtx,
  ) => {
    logger.warn(
      {
        ...ctx,
        businessRule: {
          rule,
          violation,
          category: 'business_validation',
        },
      },
      `Business rule violation: ${rule}`,
    );
  },
};
```

### Sensitive Data Redaction

Enhanced security patterns for PII/sensitive data:

```ts
// redaction.utils.ts
const SENSITIVE_PATTERNS = [
  // Field names
  /password/i,
  /token/i,
  /secret/i,
  /key/i,
  /authorization/i,
  /cookie/i,
  /session/i,
  /ssn/i,
  /social/i,
  /credit/i,
  /card/i,
  /cvv/i,
  /pin/i,
  /account/i,
  /routing/i,
  /swift/i,

  // PII patterns
  /email/i,
  /phone/i,
  /address/i,
  /dob/i,
  /birth/i,
  /passport/i,
  /license/i,
  /national.*id/i,
];

const SENSITIVE_VALUE_PATTERNS = [
  // Credit card numbers (basic pattern)
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
  // SSN pattern
  /\b\d{3}-?\d{2}-?\d{4}\b/,
  // Email pattern
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  // Phone pattern (basic)
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
];

export const RedactionUtils = {
  redactSensitive: (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      // Check if primitive value matches sensitive patterns
      if (typeof obj === 'string') {
        return RedactionUtils.redactSensitiveString(obj);
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => RedactionUtils.redactSensitive(item));
    }

    const redacted = { ...obj };
    for (const [key, value] of Object.entries(redacted)) {
      if (RedactionUtils.isSensitiveField(key)) {
        redacted[key] = RedactionUtils.redactValue(value);
      } else if (typeof value === 'object') {
        redacted[key] = RedactionUtils.redactSensitive(value);
      } else if (typeof value === 'string') {
        redacted[key] = RedactionUtils.redactSensitiveString(value);
      }
    }
    return redacted;
  },

  isSensitiveField: (fieldName: string): boolean => {
    return SENSITIVE_PATTERNS.some((pattern) => pattern.test(fieldName));
  },

  redactValue: (value: any): string => {
    if (typeof value === 'string' && value.length > 0) {
      // Show first 2 and last 2 characters for debugging
      if (value.length <= 4) return '[REDACTED]';
      return `${value.substring(0, 2)}${'*'.repeat(Math.max(0, value.length - 4))}${value.substring(value.length - 2)}`;
    }
    return '[REDACTED]';
  },

  redactSensitiveString: (str: string): string => {
    let result = str;
    for (const pattern of SENSITIVE_VALUE_PATTERNS) {
      result = result.replace(pattern, '[REDACTED]');
    }
    return result;
  },

  // For specific use cases
  redactCreditCard: (cardNumber: string): string => {
    if (!cardNumber || cardNumber.length < 4) return '[REDACTED]';
    return `****-****-****-${cardNumber.slice(-4)}`;
  },

  redactEmail: (email: string): string => {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '[REDACTED]';
    const redactedLocal =
      local.length > 2
        ? `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}`
        : '**';
    return `${redactedLocal}@${domain}`;
  },

  // Safe logging wrapper
  safeLog: (obj: any): any => {
    try {
      return RedactionUtils.redactSensitive(obj);
    } catch (error) {
      return {
        error: 'Failed to redact sensitive data',
        original: '[REDACTED]',
      };
    }
  },
};
```

### Log Sampling for High-Volume Operations

Intelligent sampling to reduce log volume:

```ts
// sampling.utils.ts
export const SamplingUtils = {
  shouldLog: (operation: string, sampleRate: number = 0.1): boolean => {
    // Deterministic sampling based on operation hash
    const hash = SamplingUtils.hashString(operation);
    return hash % 100 < sampleRate * 100;
  },

  hashString: (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  },

  // Adaptive sampling based on error rates
  adaptiveSample: (operation: string, errorRate: number): number => {
    // Higher error rates = higher sampling
    if (errorRate > 0.1) return 1.0; // 100% sampling for high error rates
    if (errorRate > 0.05) return 0.5; // 50% sampling for medium error rates
    if (errorRate > 0.01) return 0.1; // 10% sampling for low error rates
    return 0.01; // 1% sampling for very low error rates
  },

  // Time-based sampling windows
  windowedSample: (
    operation: string,
    windowMs: number = 60000,
    maxLogsPerWindow: number = 100,
  ) => {
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const key = `${operation}-${window}`;

    // In production, this would use Redis or memory cache
    // For demo purposes, using a simple in-memory approach
    if (!SamplingUtils._windowCache) {
      SamplingUtils._windowCache = new Map();
    }

    const count = SamplingUtils._windowCache.get(key) || 0;
    if (count >= maxLogsPerWindow) {
      return false;
    }

    SamplingUtils._windowCache.set(key, count + 1);

    // Clean up old windows
    if (Math.random() < 0.01) {
      // 1% chance to clean up
      SamplingUtils.cleanupOldWindows(windowMs);
    }

    return true;
  },

  _windowCache: undefined as Map<string, number> | undefined,

  cleanupOldWindows: (windowMs: number) => {
    if (!SamplingUtils._windowCache) return;

    const now = Date.now();
    const currentWindow = Math.floor(now / windowMs);

    for (const [key] of SamplingUtils._windowCache) {
      const keyWindow = parseInt(key.split('-').pop() || '0');
      if (currentWindow - keyWindow > 2) {
        // Keep last 2 windows
        SamplingUtils._windowCache.delete(key);
      }
    }
  },

  // Sampling with burst protection
  burstProtectedSample: (
    operation: string,
    baseRate: number = 0.1,
    burstThreshold: number = 10,
  ) => {
    const recentKey = `recent-${operation}`;
    const now = Date.now();

    // Track recent log times (in production, use Redis)
    if (!SamplingUtils._burstCache) {
      SamplingUtils._burstCache = new Map();
    }

    const recentLogs = SamplingUtils._burstCache.get(recentKey) || [];
    const recentCount = recentLogs.filter(
      (time: number) => now - time < 10000,
    ).length; // Last 10 seconds

    if (recentCount >= burstThreshold) {
      // In burst mode, dramatically reduce sampling
      return SamplingUtils.shouldLog(operation, baseRate * 0.1);
    }

    // Normal sampling
    if (SamplingUtils.shouldLog(operation, baseRate)) {
      recentLogs.push(now);
      // Keep only recent entries
      const filtered = recentLogs.filter((time: number) => now - time < 10000);
      SamplingUtils._burstCache.set(recentKey, filtered);
      return true;
    }

    return false;
  },

  _burstCache: undefined as Map<string, number[]> | undefined,
};

// Enhanced sampling logging helpers
export const SampledLog = {
  info: (logger: Logger, operation: string, ctx: BaseCtx, sampleRate = 0.1) => {
    if (SamplingUtils.shouldLog(operation, sampleRate)) {
      Log.info(logger, operation, { ...ctx, sampled: true, sampleRate });
    }
  },

  debug: (
    logger: Logger,
    operation: string,
    ctx: BaseCtx,
    sampleRate = 0.01,
  ) => {
    if (SamplingUtils.shouldLog(operation, sampleRate)) {
      logger.debug({ ...ctx, sampled: true, sampleRate }, operation);
    }
  },

  highVolume: (logger: Logger, operation: string, ctx: BaseCtx) => {
    // Use windowed sampling for high-volume operations
    if (SamplingUtils.windowedSample(operation, 60000, 50)) {
      // 50 logs per minute max
      Log.info(logger, operation, { ...ctx, sampled: 'windowed' });
    }
  },

  burstProtected: (
    logger: Logger,
    operation: string,
    ctx: BaseCtx,
    baseRate = 0.1,
  ) => {
    if (SamplingUtils.burstProtectedSample(operation, baseRate)) {
      Log.info(logger, operation, { ...ctx, sampled: 'burst_protected' });
    }
  },
};

// Usage examples:
// High-frequency database queries
SampledLog.highVolume(logger, 'Database query executed', ctx);

// Debug logging with 1% sampling
SampledLog.debug(logger, 'Cache hit', ctx, 0.01);

// Burst-protected API calls
SampledLog.burstProtected(logger, 'External API call', ctx, 0.2);
```

---

## 7) BullMQ Integration (trace-safe)

**Producer**: include trace in job payload.

```ts
queue.add('send', data, {
  jobId: domainId,
  removeOnComplete: true,
  removeOnFail: false,
  // Put trace metadata under a stable key
  meta: {
    traceId: cls.get('traceId'),
    correlationId: cls.get('correlationId'),
  },
});
```

**Worker**: set CLS on job start, so all logs include same `traceId`.

```ts
worker.on('active', (job) => {
  cls.set('traceId', job.opts?.meta?.traceId || job.id);
  cls.set('correlationId', job.opts?.meta?.correlationId);
});
```

**Logging**: use `Log.bullQueued` / `Log.bullFailed` with `bull: { queue, jobId, attempt }`.

---

## 8) EventStoreDB Integration

**Append**: always include metadata for correlation & audit.

```ts
appendToStream(
  streamId,
  jsonEvent({
    type: eventType,
    data,
    metadata: {
      traceId: cls.get('traceId'),
      correlationId: cls.get('correlationId'),
      user: { id: cls.get('userId'), tenantId: cls.get('tenantId') },
      source: process.env.APP_NAME,
    },
  }),
);
```

**Consume**: set CLS from event metadata before handling; log with `esdb` section.

```ts
const meta = resolvedEvent?.event?.metadata as any;
cls.set('traceId', meta?.traceId);
cls.set('correlationId', meta?.correlationId);
cls.set('tenantId', meta?.user?.tenantId);
cls.set('userId', meta?.user?.id);

Log.esdbProjectionStarted(logger, {
  service: 'core-template-manager',
  component: 'TemplateProjectionManager',
  method: 'startProjection',
  esdb: {
    category: 'coreTemplateManager.template.v1',
    stream: '$ce-coreTemplateManager.template.v1',
  },
});
```

**\$ce vs filtered `$all`**

- Prefer **filtered `$all`** (regex/prefix) + your own checkpoints ⇒ no dependency on system projections, avoids `$ce-* not found` noise.
- If using `$ce-*`, mark first-boot “not found” as `info` with `expected: true`.

---

## 9) Observability Tips (Loki & ELK)

**Loki (Grafana)**

- Keep `traceId` in log **body**, not as a label (avoid high cardinality).
- Add a **Derived Field** for `traceId` in Grafana → click to query `{ traceId="…" }`.
- Useful LogQL examples:

  - Find all errors for a trace: `{app="gsnest-template"} |= "\"traceId\":\"<ID>\"" |~ "level":"error"`
  - ESDB issues: `{component="TemplateProjectionManager"} |= "esdb" |= "not found"`

**Elasticsearch**

- Index templates: map `time` as `date`, `level` as `keyword`, `service/component/method` as `keyword`.
- Create a **keyword** subfield for `traceId` to enable exact-match filters.

---

## 10) Error & Retry Conventions

- Always attach the real error object as `err`.
- Include `retry.attempt` and `retry.backoffMs` when applicable.
- For partial failures (degraded mode) use `warn` with clear `msg`.
- For expected empty states add `expected: true`.

---

## 11) Security & PII

- **Never** log secrets (tokens, connection strings, passwords, cards).
- Redact headers like `authorization`, `cookie`.
- Limit payload sizes; truncate long fields.
- For GDPR/POPIA, prefer hashed identifiers if full PII is unnecessary.

---

## 12) Performance

- Favor `stdout` shipping over in-process network transports in prod.
- Batch transports (e.g., `pino-loki`) if used.
- Avoid logging large objects; store references/ids instead.

---

## 13) Local Developer Experience

- Pretty logs via `pino-pretty` when `PRETTY_LOGS=true`.
- Keep shapes identical—pretty only affects rendering.

---

## 14) Testing & CI

- **Unit**: a small logger wrapper test asserting presence of `traceId`, `service`, `component`, `method`.
- **E2E**: one HTTP test verifies `x-request-id` echo + log line contains same id.
- **Smoke**: BullMQ worker test ensures `traceId` flows from producer to processor logs.

---

## 15) Migration Plan

1. Introduce `LoggingModule`, CLS, and `Log` helper.
2. Replace direct `logger.info/error` with `Log.*` in hot paths.
3. Add `traceId` propagation in BullMQ & ESDB.
4. Switch dashboards/alerts to new fields.
5. Decommission legacy log keys after a cutover window.

---

## 16) Copy‑Paste Snippets Index

- [x] `logging.module.ts` (Pino transports per sink)
- [x] `trace.middleware.ts` (set CLS + response headers)
- [x] `logger.factory.ts` (CLS mixin for non-HTTP)
- [x] `structured-logger.ts` (central log helpers)
- [x] BullMQ producer/worker propagation
- [x] ESDB append/consume metadata pattern

---

## 17) Checklist (for PRs)

- [ ] All logs include `service`, `component`, `method`, `traceId`.
- [ ] No secrets or PII leak; redaction in place.
- [ ] `LOG_SINK` handled; prod ⇒ stdout shipping.
- [ ] `expected: true` used for benign conditions.
- [ ] Errors use `err` with type/message/stack.
- [ ] Loki/ELK dashboards updated to new fields.
- [ ] Unit/E2E smoke tests passing.

---

**Done.** This strategy yields query‑friendly, low‑cardinality, end‑to‑end traceable logs across HTTP, BullMQ, and ESDB with zero sink knowledge in business code.
