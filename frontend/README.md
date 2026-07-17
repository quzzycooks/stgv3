# Stignit — Frontend

React + TypeScript + Vite mobile web client for `stignit-api`, the AI-powered emergency response platform for Nigerian roads.

This is a real client of the backend in `../stignit-api` — every screen either calls a real endpoint or is clearly a device-local feature (recent-incident history, the Medical ID QR code, Quick Unlock). Nothing here fakes an integration the API doesn't have.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

By default the app expects `stignit-api` running at `http://localhost:3000` (see `../stignit-api/docs/02-setup-guide.md` for spinning it up, e.g. via its `docker-compose.yml` for Postgres + Redis). Without a running backend, screens that fetch data will show loading/error states — the UI itself is fully navigable.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | Yes | Base URL of `stignit-api` (no `/v1` suffix — that's added automatically). |
| `VITE_WS_URL` | Yes | Same host, used for the Socket.IO `/rt` realtime namespace. |
| `VITE_MAPBOX_TOKEN` | No | Enables a live Mapbox map on map screens. Get a free token at [account.mapbox.com/access-tokens](https://account.mapbox.com/access-tokens/) — no billing card required for the free tier. Without it, a styled placeholder renders instead — the app looks and works fine with zero secrets configured. |

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — type-check (`tsc -b`) then production build
- `npm run preview` — preview the production build
- `npm run lint` — oxlint

## Architecture

```
src/
  api/            Axios client + one module per backend domain (auth, users, incidents, breakout, transport, drills, welfare, detection)
  components/ui/  Design-system primitives (Button, Card, Input, Sheet, Switch, ProgressRing, MapPreview, SwipeToConfirm, ...)
  components/layout/  AppShell, BottomNav, FloatingSosButton
  features/       One folder per screen group, mirrors the product's real modules
  stores/         Zustand: auth session, theme, onboarding flag, device-local incident history, registration wizard, drills
  hooks/          useSocket (WS), useCountdown, useGeolocation, useTheme
  routes/         Route tree (lazy-loaded per screen) + auth guards
  lib/            zod schemas mirrored to backend DTO constraints, enum mirrors, design tokens helpers
  styles/         tokens.css — the entire color/spacing/shadow/typography system, light + dark
```

**Auth model**: phone number + 6-digit OTP only (`/v1/auth/otp/*`) — the backend has no email/Google/Apple login. "Face ID / Fingerprint" is a device-local WebAuthn platform-authenticator gate in front of an already-issued session (`src/lib/webauthn.ts`); it never touches the network, since there's no server-side relying party for it.

**Realtime**: `useIncidentSocket` joins/leaves the `/rt` Socket.IO namespace's `incident:{id}` room and forwards `breakout:message` and related events into React Query's cache.

**What's intentionally not here**: standalone Police/Fire/Ambulance directories, Safe Route, Weather, Traffic, Family Location, multi-media incident reports, and a personal analytics dashboard — none of these have a backing endpoint in `stignit-api` today. The Admin dashboard and Driver app are separate personas/apps and out of scope for this build. See the project's plan notes for the full reasoning.

## Design system

Colors, typography, radii and shadows are defined once in `src/styles/tokens.css` using Tailwind v4's `@theme` for the static brand palette (primary `#B00020`, accent `#1976D2`, success `#2E7D32`, warning `#F9A825`) plus a separate layer of semantic CSS variables (`--surface-card`, `--text-body`, `--tint-primary`, etc.) that flip between light and dark via `[data-theme="dark"]`. Toggle theme in Settings, or it follows the OS by default.
