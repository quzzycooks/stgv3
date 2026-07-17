# 05 — Database Schema

Source of truth: `src/database/schema/index.ts` (Drizzle). Migrations: `drizzle/`.
Mirrors PRD §9, extended for geo, drills, admin, and audit.

## Conventions

- **PKs**: `uuid` `defaultRandom()` (`gen_random_uuid()`); `incidents.incident_id`
  is a human-readable `varchar(26)` (`STIGNIT-YYYY-MM-DD-XXXXXX`).
- **Timestamps**: `timestamptz`; `created_at`/`updated_at` default `now()`.
- **Enums**: Postgres enum types, generated from the shared TS enums in
  `src/database/enums.ts` (single source for DTOs, guards, and DB).
- **Encrypted columns** (`encryptedText`/`encryptedJson`): `text` at rest,
  AES-256-GCM — `phone_number`, `full_name`, `date_of_birth`, `medical_info`,
  driver `full_name`/`phone_number`.
- **Blind index**: `phone_hash char(64)` (HMAC) carries UNIQUE + login/webhook
  lookup, because the phone itself is encrypted.
- **Geography**: `geography(Point,4326)` with GiST indexes on `incidents`,
  `user_locations`, `risk_zones`, `drivers`, `hospitals`.
- **Numerics**: `numeric(9,6)` for lat/lng (returned as strings — `parseFloat`
  where a number is needed).

## Core entities (PRD §9)

| Table | Purpose | Notable columns |
|---|---|---|
| `users` | Identity + tier + settings | `phone_hash` (unique), encrypted PII, `access_level`, `skill_verified`, `welfare_check_delay_sec`, `deletion_requested_at` |
| `emergency_contacts` | 2–4 per user | encrypted name/phone, `phone_hash`, `priority`, `opted_out` |
| `incidents` | Situation Room container | `incident_id` PK, `trigger_type`, `incident_type`, `status`, geo, `occurred_at` (timeline anchor), `anonymized_at` |
| `incident_participants` | User↔incident | `proximity_confirmed`, `proximity_flagged_silent`, `breakout_room_role`, `is_moderator` |
| `incident_action_logs` | Incident DNA trail (append-only) | `actor_session_token`, `action_type`, `action_payload` jsonb |

## Supporting entities

| Table | Purpose |
|---|---|
| `skill_verifications` | Credential review workflow (72h SLA) |
| `consent_records` | Append-only NDPA consent ledger |
| `user_locations` | Last-known location for proximity (consent-gated) |
| `risk_zones` | DBSCAN clusters of incidents (raise detection sensitivity) |
| `breakout_messages` | Immutable Breakout Room messages |
| `drivers` / `hospitals` / `driver_dispatches` | Transport layer |
| `institutional_contacts` / `institutional_dispatches` | Police/agency packet delivery + status |
| `drill_scenarios` / `drill_sessions` / `drill_responses` | Drill & adaptive-learning system |
| `admins` / `audit_logs` | Dashboard accounts + immutable admin audit trail |

## Key relationships

- `incidents 1─* incident_participants`, `1─* incident_action_logs`,
  `1─* breakout_messages`, `1─* driver_dispatches`,
  `1─* institutional_dispatches` (all `ON DELETE CASCADE`).
- `users 1─* emergency_contacts / skill_verifications / consent_records`.
- `incidents.triggering_user_id` is nulled at anonymization (6.9.3); the
  session token lives only in the (retained, anonymized) action log.

## Retention (PRD 6.9.3 / 6.1.2)

- Deleted-account PII: hard-purged 30 days after request (`purgeDueDeletions`).
- Raw incident records: purged after 24 months (`purgeExpired`).
- Anonymized aggregates (risk zones): retained indefinitely.
