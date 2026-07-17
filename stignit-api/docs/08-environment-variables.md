# 08 — Environment Variables

All keys are validated at boot by `src/config/env.validation.ts` (Joi). Secrets
are **required in production** and relaxed with dev defaults otherwise. Never
commit real secrets — `.env` is git-ignored; use a secrets manager in prod.

## Core

| Key | Default | Notes |
|---|---|---|
| `NODE_ENV` | `development` | `development` \| `test` \| `production` |
| `PORT` | `3000` | HTTP port |
| `API_VERSION` | `v1` | URI version prefix |

## Database (Postgres + PostGIS)

| Key | Default | Notes |
|---|---|---|
| `DB_HOST` / `DB_PORT` | `localhost` / `5432` | Primary |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | `stignit` / … / `stignit` | |
| `DB_REPLICA_HOST` / `DB_REPLICA_PORT` | (falls back to primary) | Reserved for read-replica routing |
| `DB_POOL_MAX` | `20` | pg pool size |

## Redis

| Key | Default | Notes |
|---|---|---|
| `REDIS_HOST` / `REDIS_PORT` | `localhost` / `6379` | OTP, rate limit, token families, GEO, event stream, BullMQ |
| `REDIS_PASSWORD` | — | Optional |

## Crypto (PRD 11.1) — required in prod

| Key | Notes |
|---|---|
| `FIELD_ENCRYPTION_KEY` | 32-byte base64; AES-256-GCM key for PII |
| `FIELD_ENCRYPTION_KEY_PREVIOUS` | Optional; previous key kept for rotation |
| `BLIND_INDEX_KEY` | HMAC key for phone blind index + OTP/anon hashing |

## JWT (PRD 11.2)

| Key | Default | Notes |
|---|---|---|
| `JWT_ACCESS_SECRET` | — | Access-token secret (15m) |
| `JWT_ACCESS_TTL` | `15m` | |
| `JWT_REFRESH_SECRET` | — | Refresh-token secret (30d) |
| `JWT_REFRESH_TTL` | `30d` | |

## Admin SSO (PRD 11.2)

| Key | Default | Notes |
|---|---|---|
| `ADMIN_SSO_ISSUER` | `https://accounts.google.com` | |
| `ADMIN_SSO_CLIENT_ID` | — | Google OAuth client id |
| `ADMIN_SSO_ALLOWED_DOMAIN` | — | Hosted domain allowlist (e.g. `stignit.ng`) |

## Integrations (stubbed until wired)

| Key | Notes |
|---|---|
| `TERMII_API_KEY` / `TERMII_SENDER_ID` | Nigerian SMS (PRD 8.1) |
| `FCM_PROJECT_ID` | Push notifications |
| `GOOGLE_MAPS_API_KEY` | Mapping/geocoding |
| `AI_PROVIDER` | `stub` (default) \| `anthropic` \| `openai` \| `selfhosted` — OQ05 |
| `ANTHROPIC_API_KEY` / `AI_MODEL` | AI adapter (default model `claude-sonnet-5`) |
