# Stignit API — Engineering Documentation

Reference docs for developers working on (or joining) the Stignit backend — a
civilian emergency-response coordination platform for the Nigerian market.

> **Scope:** the **stignit-api** backend (PRD v1.0, §6–§12). The mobile apps and
> the web admin dashboard are separate frontends that consume this API.

> For the live, interactive **API reference** (endpoints, request/response
> schemas), run the app and open Swagger at `/docs`.

## Stack at a glance

| | |
|---|---|
| **Framework** | [NestJS 11](https://nestjs.com) (TypeScript) |
| **Database** | PostgreSQL + PostGIS via [Drizzle ORM](https://orm.drizzle.team) |
| **Cache / realtime infra** | Redis (OTP, rate limit, token families, GEO, event stream) |
| **Queues / jobs** | BullMQ (notifications, dispatch, institutional, timers, maintenance) |
| **Realtime** | Socket.IO WebSocket gateway (Situation Room channel) |
| **Mobile auth** | Phone + OTP → JWT access + rotating refresh |
| **Admin auth** | Google Workspace SSO (separate), role-based |
| **PII** | AES-256-GCM field-level encryption + blind index |
| **AI** | Pluggable provider (default offline stub; Anthropic Claude adapter) |
| **Docs** | Swagger/OpenAPI at `/docs` |

## Read these in order

| # | Doc | What it covers |
|---|-----|----------------|
| 01 | [Overview](01-overview.md) | What the product is; the big building blocks |
| 02 | [Setup Guide](02-setup-guide.md) | Run it locally, migrate, seed |
| 03 | [Project Structure](03-project-structure.md) | Folder layout & module anatomy |
| 04 | [Architecture](04-architecture.md) | Request lifecycle, event-driven critical path, cross-cutting patterns |
| 05 | [Database Schema](05-database-schema.md) | Tables, Drizzle conventions, key relationships |
| 06 | [Auth & Permissions](06-auth-and-permissions.md) | OTP/JWT, admin SSO, driver tokens, RBAC |
| 07 | [Modules](07-modules.md) | Per-module responsibilities |
| 08 | [Environment Variables](08-environment-variables.md) | Every `.env` key explained |
| 09 | [Common Issues](09-common-issues.md) | Troubleshooting & gotchas |
