# 04 — Architecture

## Request lifecycle

1. **Helmet + CORS** (main.ts).
2. **URI versioning** — everything is under `/v1` (health is version-neutral).
3. **Global `ValidationPipe`** — `whitelist` + `forbidNonWhitelisted` strips and
   rejects unknown fields (OWASP mass-assignment defence; also how the detection
   endpoint structurally refuses an `audio` field, PRD 6.3.3).
4. **Global guards (in order):**
   - `JwtAuthGuard` — app-wide default; every route is authenticated unless
     `@Public()`. Admin/driver routes are `@Public()` and use their own guards.
   - `AccessLevelGuard` — enforces `@MinAccessLevel()`, re-reading the tier from
     the DB (never trusting the token claim, PRD 11.2).
   - `ThrottlerGuard` — baseline rate limit; OTP endpoints add stricter `@Throttle`.
5. **Route guards** — `IncidentAccessGuard` (participant/trigger membership),
   `AdminAuthGuard` (SSO + role), `DriverAuthGuard`, `MaxPayloadGuard`.
6. **Interceptors** — `AuditInterceptor` on admin routes logs every mutation.

## Data layer (Drizzle + PostGIS)

- The global `DRIZZLE` provider is a `NodePgDatabase` over a `pg.Pool`.
- Schema is code (`src/database/schema`), migrations are SQL under `drizzle/`.
- **Field encryption is transparent**: `encryptedText`/`encryptedJson` custom
  types run AES-256-GCM in `toDriver`/`fromDriver`, so services read/write
  plaintext while the DB only stores ciphertext.
- **Geospatial**: `geographyPoint` columns are written via raw `sql\`ST_MakePoint…\``
  and queried with `ST_DWithin`/`ST_ClusterDBSCAN` through `db.execute()`.
- **Replication (PRD 7.2):** MVP uses a single primary pool; a replica read-pool
  + routing is a documented follow-up (Drizzle has no built-in read/write split).

## Event-driven critical path (PRD §8.2)

`SituationRoomService.create()` is the convergence point for all three entry
paths (manual trigger, welfare escalation, NEED_HELP). It publishes
`SITUATION_ROOM_CREATED` on the **EventBus**, which:

- persists the event to a Redis Stream (durability/replay, best-effort), then
- fans out to subscribers with `Promise.allSettled` — **failure isolation**: a
  throwing subscriber never blocks the others, and is re-enqueued on the
  `event-retry` BullMQ queue with backoff.

Subscribers (each in its own module, all independent):
`contacts-notification` (users), `institutional`, `driver-dispatch` (transport),
and `dna-anonymize` on `INCIDENT_CLOSED`.

## Queues (BullMQ)

`notifications`, `institutional`, `dispatch`, `event-retry`, `incident-timers`,
`welfare`, `dna`, `maintenance`. Anything slow or fan-out-heavy is queued, never
run synchronously in the request path (PRD 7.3: 1M pushes/hour, 500 dispatches
/city). Timers (welfare prompts, 90s proximity, offer timeouts, no-show) are
delayed jobs; a state check on fire makes late timers no-op (race-safe).

## Realtime

`SituationRoomGateway` (Socket.IO, namespace `/rt`) authenticates the JWT at
connect **and** re-checks room membership from the DB on every `incident:join`
(roles change mid-incident). Services push updates via `emitToIncident()`.

## Reliability & isolation

The welfare-check → Situation Room → alert path is treated as the highest
criticality. Lower-criticality work (analytics, admin, DNA batch, risk
clustering) is queue-backed and isolated so its failures can't cascade into the
critical path. Outbound integrations share `withRetry` (3 tries, ≤30s backoff).
