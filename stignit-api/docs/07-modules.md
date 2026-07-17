# 07 — Modules

Per-module responsibilities. PRD section in brackets.

### `auth` / `admin-auth` [11.2]
Mobile OTP + JWT (rotating refresh, reuse detection); global `JwtAuthGuard` and
`AccessLevelGuard`. `admin-auth` is the separate Google-SSO scheme with a
DB-backed role registry and fail-closed guard.

### `users` [6.1]
Registration (16+ age gate, 2–4 contacts), encrypted PII, consent ledger,
skill-verification workflow, NDPA deletion (30-day purge job) + self-service
export, emergency-contact SMS invite/opt-out, **inbound-SMS webhook** (SAFE/CALL
ME/NEED HELP/STOP), and the time-boxed `MedicalAccessService`.

### `detection` [6.3]
`POST /detection/anomaly` — accepts the on-device composite score + context.
Structurally rejects audio (whitelisted DTO), enforces <5KB, applies the 0.72
threshold with a −15% risk-zone adjustment and Safe Mode suppression, then
initiates the welfare check.

### `welfare` [6.4] — critical path
State machine (PROMPT1 → PROMPT2 → escalation) on BullMQ delayed timers;
SAFE/NEED_HELP responses; race-safe 30s cancellation (correction, not undo);
offline sync that anchors the timeline to the original client time; false-alarm
count → non-punitive review flag.

### `incidents` [6.5] — critical path
`SituationRoomService` (single creation path for all 3 triggers, collision-safe
ID), PostGIS proximity (500m→2km), 90s proximity-silent timer, lifecycle state
machine, `IncidentAccessGuard`, `SituationRoomGateway`, the shared
`ActionLogService`, and the emergency-contact fan-out subscriber.

### `breakout` [6.6]
Tier-gated **immutable** messages, role assignment + eligibility, moderator
mute/remove/flag, 50-participant cap → read-only overflow. **AI Support Engine**:
pluggable provider, medical-context gating (verified Skilled Responder present),
and an **output safety filter** that discards any dosage/diagnosis/invasive text
and returns a safe fallback (defence-in-depth, not just a system prompt).

### `transport` [6.7]
Job/timer dispatch state machine (1→5km, 90s offers, no-show re-dispatch),
verification-gated driver pool, driver GPS → room broadcast, weighted hospital
recommendation (40/35/25), pre-arrival packet. Separate driver-app endpoints.

### `institutional` [6.8]
Builds the **anonymized packet** (dedicated shape — never the internal incident
object), dispatches SMS (police) + email (agencies), retries 3× at 2-min
intervals, then FLAGs for manual admin follow-up. Per-recipient delivery records.

### `incident-dna` [6.9]
Assembles the post-incident record, anonymizes the action trail at close
(deterministic session tokens), purges raw records at 24 months, and runs the
weekly DBSCAN risk-zone clustering that feeds detection sensitivity.

### `drills` [6.2]
Adaptive scenario selection (weak-category bias), server-side option
randomization, grading, anti-gaming (<5s flag), tier recompute on completion and
on scenario release. Admin content management endpoints (Content Manager).

### `admin` [6.12]
RBAC-scoped dashboard API (incidents, users, verification queue, drivers,
institutional contacts/flagged, risk recompute, KPIs), immutable audit log, and
audit-ready Incident DNA **PDF** export.
