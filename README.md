# 🧩 Microservice Starter Project

**Automate your microservice scaffolding!**

This is a **NestJS-based microservice starter template** designed for building scalable, maintainable, and secure distributed systems. It provides a **production-ready foundation** that follows modern best practices in microservice architecture, with a strong focus on **parameter-driven code generation** for rapid, repeatable service creation.

> **Create a "vibe" code-ready platform:**
>
> This template doesn't just scaffold endpoints—it sets up a rich, extensible foundation for building value objects, domain services, aggregates, and DDD patterns. The generated code is structured to help you focus on core business logic and domain modeling, making it easy to implement expressive, type-safe, and maintainable microservices.

---

## ⚡ Why Code Generation?

- **Accelerate onboarding:** Instantly scaffold new microservices with consistent architecture and patterns.
- **Reduce boilerplate:** Focus on business logic, not repetitive setup.
- **Enforce standards:** Ensure all services follow DDD, CQRS, and event-driven best practices.
- **Easy customization:** Update your domain model and regenerate code as requirements evolve.

---

## ✅ Features

- **Modular Architecture** – Organized using NestJS feature modules
- **CQRS Pattern** – Built-in support for Command Query Responsibility Segregation
- **Event-Driven Design** – Easily integrate with message brokers and event stores
- **Config Management** – Environment-based configuration using `@nestjs/config`
- **Health Checks** – Supports readiness and liveness probes via `@nestjs/terminus`
- **Structured Logging** – JSON-based logging with Pino or Winston
- **DTO Validation** – Uses `class-validator` and `class-transformer`
- **OpenAPI Support** – Auto-generates API documentation with `@nestjs/swagger`
- **Testing Setup** – Includes unit and e2e testing configurations using Jest

---

## 🛠 Optional Integrations

- **Message Brokers** – Redis, Kafka, or RabbitMQ for pub/sub and event bus patterns
- **Event Sourcing** – Integrate with EventStoreDB for domain event storage
- **Databases** – PostgreSQL, MongoDB, or SQLite (TypeORM or Prisma supported)
- **AuthN/AuthZ** – Keycloak for authentication, Open Policy Agent (OPA) for authorization

---

## 🚀 Ideal For

- Backend services in **microservice** or **modular monolith** architectures
- Teams practicing **Domain-Driven Design (DDD)**, **CQRS**, and **event sourcing**
- Fast-tracking secure, observable, and extensible NestJS services

---

## 🏗 Architecture Overview

This project implements a **domain-driven architecture** where each domain is self-contained and handles its own event processing and queue routing. This approach promotes:

### 🎯 Domain Autonomy

- **Self-contained domains:** Each domain (Transaction, Slack, Email, Notification) manages its own event handlers
- **Independent evolution:** Domains can be modified without affecting shared infrastructure
- **Clear boundaries:** No cross-domain coupling in business logic

### 🔄 Event-Driven Flow

```
EventStore Event → Domain Handler → Business Logic + Queue Routing
     ↓                  ↓                    ↓
Transaction Event → TransactionEventHandler → Process + Route to Notification Queue
Slack Event → SlackEventHandler → Process + Route to Slack Queue
Email Event → EmailEventHandler → Process + Route to Email Queue
```

### 🛡 Type Safety

- **Domain-specific job types:** Each domain defines its own `JobPayloadMap` (e.g., `TransactionJobPayloadMap`)
- **Strong typing:** No generic `any` types for job payloads
- **Compile-time validation:** Catch routing errors at build time

### ✅ Migration Status

- **✅ Transaction Domain:** Fully migrated to domain-driven approach
- **🚧 Other Domains:** Legacy central infrastructure marked as deprecated
- **📋 Migration Guide:** See `docs/CENTRAL_INFRASTRUCTURE_DEPRECATION.md` for detailed migration instructions

> **Architectural Philosophy:** Each domain owns its data, events, and routing logic, eliminating central bottlenecks and promoting team autonomy.

---

> Designed to scale with your team and evolve with your architecture.

## Project Generation Guide

This project uses a parameter-driven approach to generate domain-specific code and configurations. The main configuration file for generation is located at `tools/domain/parameters.json`.

### How Generation Works

1. **Configuration via `parameters.json`**

   - The `parameters.json` file defines the service name, version, and the structure of domain tables (such as `channel`).
   - Each table entry specifies its type (e.g., `eventstream`), supported operations (create, update, delete, batch, get), event stream configuration, and columns.

2. **Code Generation Scripts**

   - The `tools/domain` directory contains scripts such as `build.js`, `extract.js`, and `import.js`.
   - These scripts read the `parameters.json` file and generate the necessary domain models, repositories, handlers, and other boilerplate code based on the configuration.

3. **Generated Artifacts**

   - Generated files are placed in the appropriate directories under `src/domain`, `src/commands`, `src/controllers`, etc.
   - The structure and content of these files are determined by the definitions in `parameters.json`.

4. **Customization**
   - You can customize the generated code by editing the scripts in `tools/domain` or by modifying the configuration in `parameters.json`.
   - After updating the configuration, re-run the generation scripts to update the codebase.

### How to Use

1. **Edit `parameters.json`**

   - Define your service, tables, and their properties.

2. **Run Generation Scripts**

   - Use Node.js to run the scripts in `tools/domain`. For example:
     ```sh
     node tools/domain/build.js
     ```
   - This will generate or update the code according to your configuration.

3. **Review and Extend**
   - Review the generated code. You can further extend or override generated files as needed.

### Example `parameters.json`

```json
{
  "service": {
    "name": "starter-service",
    "version": "v1"
  },
  "tables": {
    "channel": {
      "type": "eventstream",
      "cancel": {
        "create": false,
        "update": false,
        "delete": false,
        "batch": false,
        "get": false
      },
      "complete": [],
      "eventstream": {
        "stream": "channel.v1",
        "create-type": "create",
        "update-type": "update"
      },
      "cols": {
        "code": {},
        "name": {},
        "enabled": {},
        "description": {}
      }
    }
  }
}
```

### Table Type Handling in Code Generation

When defining a table in `parameters.json`, the `type` property determines the code generation strategy:

- If `type` is set to `"sql"`, the generator will create a TypeORM-based implementation for SQL/ORM storage and logic.
- If `type` is set to `"eventstream"`, the generator will create an event stream-based implementation. The eventstream repository uses a factory pattern, allowing you to configure it for any pub/sub store (e.g., Kafka, Redis, EventStoreDB) by swapping the event stream provider.
- **If neither `eventstream` nor `sql` is specified**, the generator will create a default repository that throws an error for all operations. This acts as a safeguard to ensure you explicitly define the storage type for each table.

**Example:**

```json
"tables": {
  "channel": {
    "type": "eventstream",
    ...
  },
  "user": {
    "type": "sql",
    ...
  },
  "log": {
    // No type specified, will generate a default throw implementation
    ...
  }
}
```

**Default Throw Implementation:**

- For tables without a `type`, the generated repository methods (create, update, delete, etc.) will throw a `Method not implemented` error by default.
- This ensures you do not accidentally use an unconfigured table in your application logic.

**Recommendation:**

- Always specify the `type` for each table in your `parameters.json` to avoid unexpected runtime errors and to ensure the correct repository is generated.
- For event streams, you can configure the backing pub/sub technology (Kafka, Redis, EventStoreDB, etc.) by providing the appropriate event stream provider in your application setup.

## Git Hooks: Husky & Commitlint

This project uses [Husky](https://typicode.github.io/husky) and [Commitlint](https://commitlint.js.org/) to enforce code quality and commit message standards automatically.

- **Husky** enables Git hooks, running scripts at key points in the Git workflow (e.g., before commits).
- **Commitlint** checks that commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) standard (e.g., `feat: add new feature`).

**How it works:**

- After `npm install`, Husky hooks are set up automatically.
- On every commit, Husky runs Commitlint via the `commit-msg` hook.
- If your commit message does not follow the conventional format, the commit will be rejected with an explanation.

**Why use this?**

- Ensures a consistent, readable commit history.
- Helps with automation, changelogs, and collaboration.

**Configuration:**

- See `commitlint.config.js` for rules.
- Husky hooks are in the `.husky/` directory.

**Example valid commit message:**

```
feat: add user authentication module
```

**Example invalid commit message:**

```
add new feature
```

For more details, see the [Commitlint documentation](https://commitlint.js.org/) and [Husky documentation](https://typicode.github.io/husky).

## CI/CD: GitHub Actions Release & Docker Publish

This project uses GitHub Actions to automate releases and Docker image publishing. The workflow is defined in `.github/workflows/release.yml` and consists of two main jobs:

- **Release:**

  - Runs on manual trigger (`workflow_dispatch`) or can be enabled for branch pushes.
  - Uses [semantic-release](https://github.com/semantic-release/semantic-release) to determine if a new release should be published based on commit messages.
  - If a new release is detected, builds the project and publishes a release to GitHub using a secure token.

- **Docker Publish:**
  - Runs only if a new release is published.
  - Builds a Docker image using the latest code and tags it according to the release version.
  - Pushes the image to GitHub Container Registry (`ghcr.io`).
  - Signs the published Docker image using [cosign](https://github.com/sigstore/cosign) for supply chain security.

**Key Features:**

- Node.js dependencies are cached for faster builds.
- Only valid, conventional commits trigger a release (enforced by Commitlint).
- Docker images are signed for enhanced security.

**How to Use:**

1. Push commits with valid [Conventional Commits](https://www.conventionalcommits.org/) messages.
2. Trigger the workflow manually from the GitHub Actions tab, or enable the `push` trigger for automatic releases.
3. On a new release, a Docker image will be built and published to `ghcr.io`.

See `.github/workflows/release.yml` for details and customization options.

---

## 🏁 Next Steps

- Start by editing `tools/domain/parameters.json` to define your service and domain tables.
- Run the code generation scripts in `tools/domain` to scaffold your microservice.
- Review, extend, and customize the generated code as needed.
- Commit with conventional messages to enable automated CI/CD and releases.

> **Ready to build your next microservice? Edit your parameters and generate!**
