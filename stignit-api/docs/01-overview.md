# 01 — Overview

Stignit is a **coordination layer** for emergencies in Nigerian cities — it
activates in the first critical minutes before formal responders arrive. It is
explicitly **not** a replacement for government services, and it does **no**
medical diagnosis or triage (PRD §5.3).

The platform operates on three axes (PRD §1):

- **Detection** — recognising something is wrong before anyone reports it
  (on-device sensors → backend threshold → welfare check).
- **Organization** — turning bystanders, responders, and institutions into one
  operational picture (Situation Room + Breakout Room).
- **Movement** — getting the victim verified transport and a pre-informed hospital.

## The critical path (PRD §8.2)

The highest-criticality flow, isolated from everything else:

```
on-device anomaly ─▶ POST /detection/anomaly ─▶ welfare check (state machine)
   │                                                │
   │ NEED_HELP / timeout                            ▼
   └──────────────────────▶ Situation Room created ──▶ SITUATION_ROOM_CREATED event
                                                        │  (failure-isolated fan-out)
                    ┌───────────────────────────────────┼───────────────────────────────┐
                    ▼                                   ▼                                ▼
        emergency-contact alerts        institutional packet (anon.)         driver dispatch
                    │                                                                    │
                    ▼                                                     driver accepts ▼
        WebSocket updates to room  ◀────────────  hospital recommendation + pre-arrival packet
                                                                                         │
                                                                            dropoff ─▶ TRANSFERRED
                                                                                         │
                                                                        Incident DNA finalized + anonymized
```

If one fan-out subscriber fails (e.g. SMS provider down), the others still run
and the failure is retried — the chain degrades gracefully rather than failing.

## Building blocks

| Concept | Meaning |
|---|---|
| **Welfare Check** | Timed "Are you safe?" filter between a sensor anomaly and a public alert |
| **Situation Room** | The incident container / single source of truth; has a lifecycle state machine |
| **Breakout Room** | The structured coordination layer inside a Situation Room (tier-gated, AI-assisted) |
| **Incident DNA** | The immutable, anonymized post-incident record used for learning + risk zones |
| **Tiers** | OBSERVER → TIER1 → TIER2 → SKILLED, earned via drills (+ credential verification) |
| **Risk Zone** | A GPS cluster of past incidents that raises detection sensitivity |

## Personas (PRD §4)

Bystander/Observer (read-only until drilled), Trained Responder (Tier 1/2),
Verified Professional (Skilled), Emergency Contact (SMS, no app needed), and the
Operations Administrator (web dashboard).
