# 02 — Setup Guide

## Prerequisites

- Node 20+ and `pnpm`
- Docker (for local Postgres+PostGIS and Redis)

## 1. Install & configure

```bash
pnpm install
cp .env.example .env
```

Generate the crypto secrets and paste them into `.env`:

```bash
node -e "console.log('FIELD_ENCRYPTION_KEY='+require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('BLIND_INDEX_KEY='+require('crypto').randomBytes(24).toString('hex'))"
node -e "console.log('JWT_ACCESS_SECRET='+require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET='+require('crypto').randomBytes(32).toString('hex'))"
```

## 2. Start infrastructure

```bash
docker compose up -d postgres redis
```

Postgres uses the `postgis/postgis:16-3.4` image (PostGIS ships enabled; the
first migration also runs `CREATE EXTENSION postgis`).

## 3. Migrate

```bash
pnpm migration:run        # applies drizzle/0000_init.sql (PostGIS + full schema)
```

## 4. Run

```bash
pnpm start:dev            # http://localhost:3000, Swagger at /docs
```

## Working with the schema (Drizzle)

- Source of truth: `src/database/schema/index.ts`.
- After changing the schema, generate a new migration:

  ```bash
  pnpm migration:generate   # drizzle-kit → new SQL in ./drizzle
  pnpm migration:run
  ```

- `pnpm migration:push` (dev only) pushes the schema directly without a migration
  file; `pnpm db:studio` opens Drizzle Studio.

> The committed `drizzle/0000_init.sql` was hand-authored to bootstrap PostGIS +
> the full schema in one step. Subsequent changes should go through
> `migration:generate`.

## Testing

```bash
pnpm test        # unit + integration; DB/Redis are faked, no infra needed
pnpm build       # type-check
```
