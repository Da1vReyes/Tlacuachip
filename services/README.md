# Services

Two independent services. `user-service` is **wired to the app and live**;
`catalog-service` is not connected to anything yet.

Each owns its own data — no shared database, no service reaching into
another's tables. That's the one microservices rule that actually matters
at this size; there's no gateway, service discovery, or message bus, and
there doesn't need to be yet.

| Service | Port | Owns | Status |
|---|---|---|---|
| [`user-service`](./user-service) | 4100 | users, business profiles, reports, progress, preferences, provider profiles, saved teams | **Wired in.** Real Postgres, JWT auth |
| [`catalog-service`](./catalog-service) | 4200 | roadmap steps, mentors, suppliers | Not connected. Still SQLite, still the old schema (see below) |

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
cp .env.example .env   # set DATABASE_URL (any Postgres) and JWT_SECRET
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
PUT    /api/me/provider-profile                  { name, kind, isAI, city, country, description, helpsWith }
GET    /api/me/team
POST   /api/me/team/:providerId/toggle
DELETE /api/me                                    deletes the account and everything under it (ON DELETE CASCADE)
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

Roadmap steps, mentors, and suppliers, seeded on first boot. Still runs on
SQLite and the schema predates the current roadmap step ids and provider
shape (`kind`/`isAI`/`helpsWith` — see `web/src/types/index.ts`). Nothing
calls it. If you wire it in, update `schema.sql` and `seed.js` to match
the current shapes first, or the ids won't line up with what
`web/src/data/mockData.ts` and the roadmap actually use.

```bash
cd catalog-service && npm install && npm run dev   # :4200, creates + seeds data/catalog-service.db
```
