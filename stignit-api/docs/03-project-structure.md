# 03 — Project Structure

## Top-level layout

```
stignit-api/
├── src/                  # Application source
│   ├── common/           # Cross-cutting: crypto, retry, phone util, guards
│   ├── config/           # Env validation + typed config factory
│   ├── database/         # Drizzle schema, db provider, migrate runner
│   ├── messaging/        # Event bus + BullMQ queue tokens/module
│   ├── redis/            # Shared ioredis provider
│   ├── test-utils/       # FakeRedis, FakeDb for unit tests
│   └── <domain>/         # One folder per domain module
├── drizzle/              # SQL migrations + journal
├── docs/                 # ← you are here
├── drizzle.config.ts     # drizzle-kit config
└── docker-compose.yml    # Local Postgres+PostGIS + Redis
```

## Module anatomy

A domain module folder typically contains:

```
<domain>/
├── <domain>.module.ts        # Nest module wiring
├── <domain>.controller.ts    # REST endpoints (+ *.gateway.ts for WebSocket)
├── <domain>.service.ts       # Business logic (injects DRIZZLE db)
├── <domain>.processor.ts     # BullMQ worker (if the domain has background jobs)
├── dto/                      # class-validator request DTOs
└── subscribers/              # EventBus subscribers (fan-out handlers)
```

Pure, framework-free logic is kept in standalone files so it is unit-tested
without infra — e.g. `incident-lifecycle.ts`, `hospital-scoring.ts`,
`ai/ai-safety.filter.ts`, `drill-tier.ts`, `incident-dna/anonymization.ts`.

## Shared infrastructure (`src/common`, `src/database`, `src/messaging`, `src/redis`)

| Path | Responsibility |
|---|---|
| `common/crypto/` | AES-256-GCM field encryption, blind index, `EncryptionService` |
| `common/retry.ts` | Exponential-backoff helper for outbound integrations (PRD 7.4) |
| `common/max-payload.guard.ts` | Rejects oversized critical payloads (<5KB, PRD 7.4) |
| `database/schema/` | Drizzle tables, pgEnums, `encryptedText`/`geographyPoint` custom types |
| `database/drizzle.module.ts` | Global `DRIZZLE` db handle (pg Pool) |
| `database/migrate.ts` | Migration runner (`pnpm migration:run`) |
| `messaging/event-bus.service.ts` | Failure-isolated fan-out + retry (PRD 8.2) |
| `messaging/queue.tokens.ts` | BullMQ queue names |
| `redis/redis.module.ts` | Shared ioredis client (`REDIS_CLIENT`) |

## Domain modules

See [07 — Modules](07-modules.md) for per-module detail. In brief: `auth`,
`admin-auth`, `users`, `detection`, `welfare`, `incidents`, `breakout`,
`transport`, `institutional`, `incident-dna`, `drills`, `admin`.
