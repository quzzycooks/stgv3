# 06 — Auth & Permissions

There are **three separate identity spaces**; they share no credentials (PRD 11.2).

## 1. Mobile users — phone + OTP → JWT

- `POST /v1/auth/otp/request` — 6-digit OTP, 5-min expiry, resend cooldown.
  Codes are stored HMAC-hashed in Redis, never in plaintext.
- 3 failed verifies → 15-min lockout (Redis TTL). Endpoint is IP-throttled.
- `POST /v1/auth/otp/verify` — on success issues a **JWT access token (15m)** +
  **rotating refresh token (30d)**. First verify for a new phone creates an
  `INCOMPLETE` account; `POST /v1/users/register` completes it.
- `POST /v1/auth/refresh` — **rotation with reuse detection**: refresh tokens
  belong to a Redis "family"; using an already-rotated/revoked token revokes the
  **whole family** (theft signal → forced re-auth).
- `POST /v1/auth/logout` — revokes the family.

Access-token claims (`accessLevel`) are a **hint only**. Incident-sensitive
endpoints re-derive authorization from the DB at request time.

## 2. Admin dashboard — Google Workspace SSO

- `AdminAuthGuard`: verifies the Google ID token, enforces the allowed hosted
  domain, resolves the email to an `admins` row (DB-backed registry), and
  enforces `@AdminRoles(...)`. **Fail-closed** — unknown email → 403.
- Roles (PRD 6.12.3): `SUPER_ADMIN` (implicitly satisfies any requirement),
  `OPERATIONS_MANAGER`, `CONTENT_MANAGER`, `ANALYTICS_VIEWER`.
- Every admin mutation is written to `audit_logs` by `AuditInterceptor`.

## 3. Drivers — driver-scoped token

- Ops mints a `typ:'driver'` JWT via `POST /v1/transport/driver/:driverId/token`
  (admin SSO, Ops Manager). `DriverAuthGuard` validates it for driver actions.

## Tiers (mobile access levels)

`OBSERVER → TIER1 → TIER2 → SKILLED`, earned via drills (`≥50%` → Tier1, `≥70%`
→ Tier2) plus credential verification for SKILLED. Recomputed on every drill
completion and on scenario release. Enforced by `AccessLevelGuard`
(`@MinAccessLevel`) and inside services (e.g. Breakout posting is Tier1+).

## Incident access matrix (PRD 6.5.5)

`IncidentAccessGuard` allows the triggering user or a participant; others 403.
Emergency contacts get SMS (no API access); institutions get a static packet,
never live room access; admins use the admin API. Medical info is a **time-boxed,
incident-scoped** grant — verified Skilled Responder, incident still open, both
parties are participants, and every read is audited (`MedicalAccessService`).

## WebSocket

`/rt` namespace authenticates the access JWT at connect and re-checks room
membership from the DB on every `incident:join`.
