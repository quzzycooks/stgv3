# 09 — Common Issues

### Boot fails: `FIELD_ENCRYPTION_KEY must decode to 32 bytes`
The key must be **base64 of exactly 32 bytes**. Regenerate:
`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
Rotating keys? Move the old value to `FIELD_ENCRYPTION_KEY_PREVIOUS` so existing
ciphertext still decrypts.

### `migration:run` fails on `CREATE EXTENSION postgis`
Use the `postgis/postgis` image (the compose file does). A vanilla `postgres`
image lacks PostGIS and the geo tables/indexes won't create.

### Decryption throws `Malformed ciphertext envelope` / auth-tag errors
The row was written with a different `FIELD_ENCRYPTION_KEY`. Restore the correct
key (or its previous value). GCM auth-tag failures also mean tampered/corrupted
ciphertext — by design it refuses to decrypt.

### Login/refresh returns "reuse detected — session revoked"
Expected when an **old** refresh token is replayed after rotation. The whole
family is revoked as a theft signal; the client must re-authenticate via OTP.

### Admin endpoints always 403
`AdminAuthGuard` is fail-closed. The verified SSO email must exist in `admins`
with `active = true` and a role that satisfies the route's `@AdminRoles`
(Super Admin bypasses). Also check `ADMIN_SSO_ALLOWED_DOMAIN`.

### Driver endpoints 401
Driver actions need a **driver-scoped** token (`typ:'driver'`), minted by Ops via
`POST /v1/transport/driver/:driverId/token`. A mobile user JWT will not work.

### AI guidance returns a generic fallback
Either no provider is configured (`AI_PROVIDER=stub`) or the output safety filter
flagged the model's response (dosage/diagnosis/invasive). This is intentional —
prohibited content is replaced, never forwarded.

### Numeric lat/lng comes back as a string
Drizzle returns `numeric` as `string`. `parseFloat()` before using as a number
(services already do this where required).

### Proximity/dispatch finds nobody
`user_locations`/`drivers.geom` must be populated (via `POST /incidents/location`
and driver location updates). Drivers also need **all four** verification gates
true and status `AVAILABLE` to enter the pool.

### Tests can't reach a database
They don't need one — `FakeDb` and `FakeRedis` (`src/test-utils/`) back the unit
and critical-path integration suites. A real docker-backed e2e is a separate,
future suite.

### Jest prints "a worker process failed to exit gracefully"
Benign teardown warning from open handles in a couple of suites; tests still pass.
Run with `--detectOpenHandles` if you want to trace it.
