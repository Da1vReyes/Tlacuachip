# Services

Two independent services, both wired to the app and live, both in the
same shared Postgres database (different `DATABASE_URL`-pointed instance
is fine too — they only share a schema prefix convention, not a runtime).

Each owns its own tables — no service reaches into another's. The only
cross-service communication is a single internal, shared-secret-protected
route: `user-service` calls it to keep `catalog-service`'s public provider
roster in sync when someone saves a real provider profile. That's it; no
gateway, service discovery, or message bus, and there doesn't need to be
yet.

| Service | Port | Owns | Status |
|---|---|---|---|
| [`user-service`](./user-service) | 4100 | users, business profiles, reports, progress, preferences, provider profiles, saved teams | **Wired in.** Real Postgres, JWT auth |
| [`catalog-service`](./catalog-service) | 4200 | roadmap steps, mentors, providers (seed + real accounts) | **Wired in.** Real Postgres, public reads, internal-key-protected writes |

## user-service

Real Postgres persistence (`pg`, no ORM) and real auth (bcrypt + JWT). Every
mutating route lives under `/api/me/*`, requires a `Bearer` token, and
operates on `req.userId` — decoded from the token, never from a client-sent
id. That's deliberate: an earlier version of this service took `:id` from
the URL with no ownership check at all (textbook IDOR — anyone could read
or write anyone else's business profile). It was never wired to the
frontend, so nothing exploited it, but don't reintroduce that shape. If you
ever need an admin-style "look up another user" endpoint, it needs its own
explicit authorization check — never just relax the `/api/me` pattern.

```bash
cp e.env.example e.env   # set DATABASE_URL (any Postgres) and JWT_SECRET
npm install
npm run dev             # :4100, runs schema.sql (CREATE TABLE IF NOT EXISTS) on boot
```

Tables are prefixed `tlacuachic_`, so it's safe to point `DATABASE_URL` at
a database that already has other projects' tables in it — nothing here
touches anything not prefixed that way.

```
POST   /api/auth/signup                         { email, password, name?, role }
POST   /api/auth/login                          { email, password }
GET    /api/me                                  full profile bootstrap (user + business profile + report + progress + preferences + provider profile + team)
PUT    /api/me/role                              { role }
PUT    /api/me/business-profile                  { businessType, category, budget, country, state, city, experience, description? }
GET    /api/me/report
PUT    /api/me/report                            full ReportData blob, stored as JSONB
GET    /api/me/progress
POST   /api/me/progress/complete-step            { stepId, xp }
PUT    /api/me/preferences                       any subset of DataPreferences
GET    /api/me/provider-profile
PUT    /api/me/provider-profile                  { name, kind, isAI, city, country, description, helpsWith } — also syncs into catalog-service's public roster (see below)
GET    /api/me/team
POST   /api/me/team/:providerId/toggle
DELETE /api/me                                    deletes the account and everything under it (ON DELETE CASCADE), also removes it from catalog-service's roster
```

`web/src/lib/userApi.ts` is the only file that should call this directly —
everything else goes through `useApp()` in `AppContext.tsx`, which updates
local state immediately and syncs to the server in the background.

**Known limits, honestly:** no token revocation (JWTs are valid 30 days,
logout only clears the client-side copy), no email verification, no
account lockout beyond a generic 20-requests/minute/IP limiter on
`/api/auth/*`. Fine for a hackathon demo; not what you'd want for real
user data at scale.

## catalog-service

Roadmap steps, mentors, and providers — public, read-only catalog data,
real Postgres, seeded once on first boot (`seedIfEmpty()`, safe to restart).

`tlacuachic_providers` holds two kinds of rows, distinguished by `user_id`:
`NULL` for the shipped seed/demo providers, or a real account's id for a
provider who actually signed up. The second kind is what makes the
marketplace real instead of a static list: whenever `user-service` saves a
provider profile (`PUT /api/me/provider-profile`), it calls
`PUT /api/providers/:userId` here, authenticated with a shared
`x-internal-key` header (not a user JWT — this service has no concept of
auth, it just trusts whoever holds the key). Account deletion in
`user-service` calls the matching `DELETE` route, so a removed account
disappears from the public roster too. Both calls are fire-and-forget on
`user-service`'s side — if `catalog-service` is briefly down, the user's
own save still succeeds, it just doesn't propagate until the next save.

```bash
cp e.env.example e.env   # set DATABASE_URL and INTERNAL_API_KEY (must match user-service's CATALOG_INTERNAL_API_KEY)
npm install
npm run dev             # :4200, runs schema.sql then seeds if empty
```

```
GET    /api/roadmap-steps
GET    /api/mentors
GET    /api/providers
PUT    /api/providers/:userId    internal only (x-internal-key) — called by user-service
DELETE /api/providers/:userId    internal only (x-internal-key) — called by user-service
```

`web/src/lib/catalogApi.ts` fetches these on app mount; `AppContext.tsx`
keeps the bundled `web/src/data/mockData.ts` content as the initial state
and fallback, so the app still works with demo data if this service is
unreachable.
