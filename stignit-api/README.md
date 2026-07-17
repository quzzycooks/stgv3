# Stignit API

Backend for **Stignit** — a civilian emergency-response coordination platform for
the Nigerian market. NestJS + PostgreSQL (PostGIS) via **Drizzle ORM** + Redis
(BullMQ + Streams). Built against Stignit PRD v1.0 (§6–§12).

**Full engineering docs live in [`docs/`](docs/README.md).**

## Quick start

```bash
cp .env.example .env
# generate real secrets:
node -e "console.log('FIELD_ENCRYPTION_KEY='+require('crypto').randomBytes(32).toString('base64'))"
# set BLIND_INDEX_KEY, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET too

docker compose up -d postgres redis     # local infra (PostGIS + Redis)
pnpm install
pnpm migration:run                       # apply schema
pnpm start:dev                           # http://localhost:3000
```

- OpenAPI/Swagger UI: `http://localhost:3000/docs` (JSON at `/docs-json`) — the
  versioned contract the frontend builds against.
- Health: `GET /health`. All other routes are `/v1/...` and require auth.

## Testing

```bash
pnpm test        # unit + integration (no infra needed — DB/Redis are faked)
pnpm build       # type-check
```

Coverage focuses on the high-risk logic: field crypto, OTP lockout, refresh-token
reuse detection, the event-bus failure isolation + critical-path chain, medical
access control, breakout tier-gating, the AI safety filter, hospital scoring,
institutional-packet anonymization, incident-DNA anonymization, drill tiering,
and cross-role admin RBAC (403 assertions).

## Architecture

- **Data layer** — Drizzle ORM over a `pg` pool; schema in `src/database/schema`,
  SQL migrations in `drizzle/`. PII encryption is transparent via a Drizzle
  `customType` (AES-256-GCM). Read-replica routing (PRD 7.2) is a documented
  follow-up (single primary pool for MVP).
- **Event bus** — Redis Streams (durability/replay) + an in-process fan-out with
  **failure isolation** (§8.2): one subscriber failing never blocks the others;
  failures are re-queued via BullMQ with backoff.
- **Queues (BullMQ)** — notifications, institutional dispatch, driver dispatch,
  event retry, incident/welfare timers, DNA maintenance. Nothing critical fans out
  synchronously in the request path (7.3).
- **Field-level encryption** — AES-256-GCM for PII at rest (§11.1) with key
  rotation; a keyed **blind index** provides encrypted-but-searchable phone lookup.
- **Auth** — mobile: phone+OTP → JWT access + rotating refresh (reuse → whole-chain
  revocation). Admin: separate Google SSO, DB-backed role registry, fail-closed.
  Driver: separate driver-scoped token. RBAC re-derived from the DB per request.

### Modules (`src/`)

| Module | PRD | Notes |
|---|---|---|
| `auth`, `admin-auth` | 11.2 | OTP/JWT; separate admin SSO |
| `users` | 6.1 | registration, encrypted PII, skill verification, contacts + inbound SMS, NDPA deletion/export, consent |
| `detection` | 6.3 | anomaly intake (no audio, <5KB), risk-zone threshold |
| `welfare` | 6.4 | state machine, timers, race-safe cancellation, offline sync |
| `incidents` | 6.5 | Situation Room creation (3 paths), proximity (PostGIS), lifecycle, WS gateway |
| `breakout` | 6.6 | tier-gated messages (immutable), roles, moderation, AI guidance + safety filter |
| `transport` | 6.7 | dispatch state machine, driver gating, hospital scoring, pre-arrival packet |
| `institutional` | 6.8 | anonymized packet, SMS/email dispatch, retry→flag |
| `incident-dna` | 6.9 | action trail, close-time anonymization, retention purge, risk clustering |
| `drills` | 6.2 | adaptive selection, grading, anti-gaming, tier recompute |
| `admin` | 6.12 | RBAC dashboard API, audit log, incident PDF |

## Flagged PRD ambiguities / open questions

- **OQ01 (monetization)** — no payments/gating built (§5.3).
- **OQ02 (AI liability)** — conservative AI output filtering + placeholder
  disclaimers; legal language is Legal Counsel's call.
- **OQ05 (LLM provider)** — AI is behind a provider interface; default is an
  offline protocol stub, Anthropic Claude adapter is opt-in via config.
- **OQ07 (incident taxonomy)** — followed §9's 7-type enum; drill categories
  (which include FLOOD/CHILD/NIGHT) are a separate taxonomy.
- **Welfare default delay** — PRD §6.4.1/§9 say 120s (used here); the prototype
  showed 60s.
- **`/welfare/:sessionId/respond`** — welfare is pre-incident, so responses are
  session-scoped rather than the PRD's `/incidents/{id}/welfare-response`.

## Not production-ready until

- External adapters (Termii SMS, FCM push, email, Anthropic, Google Maps) are
  stubbed — wire real providers + secrets manager.
- Inbound-SMS and driver/institutional webhooks need provider signature checks.
- Run the adversarial security audit (OWASP API Top 10) + SAST/DAST in CI, and a
  full docker-backed e2e of the §8.2 critical path against real Postgres/Redis.
