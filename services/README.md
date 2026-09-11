# Microservices (in progress — not wired to the app yet)

This is a **parallel, disconnected** persistence layer. The web app still
runs entirely on `localStorage` (see `../AGENTS.md`) and `../server` still
only proxies OpenStreetMap for the heatmap — neither talks to anything here
yet. This exists to start proving out real, per-service persistence before
we cut the frontend over.

Each service owns its **own SQLite database file** — no shared database,
no service reaches into another's tables. That's the one microservices rule
that actually matters at this size; skip the rest (gateway, service
discovery, message bus) until there's an actual reason for it.

| Service | Port | Owns |
|---|---|---|
| [`user-service`](./user-service) | 4100 | users, business profiles, roadmap progress/XP |
| [`catalog-service`](./catalog-service) | 4200 | roadmap steps, mentors, suppliers (seeded on first boot) |

## Running

```bash
cd user-service && npm install && npm run dev      # :4100, creates data/user-service.db
cd catalog-service && npm install && npm run dev   # :4200, creates + seeds data/catalog-service.db
```

Each uses [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) —
a real embedded SQL database file on disk (`data/*.db`, gitignored), not an
in-memory mock. Kill the process and restart it: the data is still there.
No Docker, no external DB to stand up, `npm install` is the whole setup.

Schema lives as plain `src/schema.sql`, run via `db.exec()` on boot — no ORM,
no migration tool yet. Fine at this size; reach for something like
`node-pg-migrate` (or swap SQLite for Postgres) if this grows past a couple
of tables per service, since hand-written `ALTER TABLE` migrations get
error-prone fast.

## API shape

**user-service**
```
POST   /api/users                              { email, name } → upsert (signup/login)
GET    /api/users/:id
GET    /api/users/:id/business-profile
PUT    /api/users/:id/business-profile          { businessType, category, budget, country, state, city, experience }
GET    /api/users/:id/progress
POST   /api/users/:id/progress/complete-step    { stepId, xp }
```

**catalog-service**
```
GET /api/roadmap-steps
GET /api/mentors
GET /api/providers
```

## Why this isn't connected to the frontend yet

The web app's `AppContext` is the single source of truth today, persisted
to `localStorage`. Wiring these in means replacing that with real HTTP
calls + loading/error states per screen — a real change, not a drop-in.
Do it deliberately, screen by screen (start with `BusinessForm.tsx` →
`PUT /api/users/:id/business-profile`, since that's the one write path
with the most obvious win), not as one big swap.
