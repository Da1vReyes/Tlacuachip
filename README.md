# Tlacuachic

Tlacuachic helps first-time entrepreneurs in Mexico / Latin America turn an
idea into a real business. Given an idea and a budget (from $50 to $500,000
MXN) it produces a market report, a business-density heatmap, a gamified
step-by-step roadmap and an AI-curated team of mentors, lawyers, accountants
and suppliers. Service providers can sign up too and are surfaced to
entrepreneurs only when they help with the entrepreneur's next roadmap step.

Built for a hackathon. The UI is in Spanish.

## Features

- Onboarding wizard (one question at a time) and privacy choice at sign-up
- Layered location map (supply, demand, cost) based on OpenStreetMap
  (Overpass) and an official INEGI DENUE snapshot
- Market report with AI interpretation (optional, via OpenRouter)
- Roadmap of steps to open the business, each linked to mentors / providers
- "Your team": providers ranked by next pending step and city, with a panel
  showing the exact minimized payload before anything is sent to the AI
- Two roles: entrepreneur and service provider (own profile + dashboard)
- Real accounts (JWT) and Postgres persistence

## Stack

| Part | Tech |
| --- | --- |
| `web/` | React 19, TypeScript, Vite, React Router, Leaflet, Recharts |
| `server/` | Node, Express 5 (map density + OpenRouter AI routes), no database |
| `services/user-service` | Node, Express 5, PostgreSQL, JWT |
| `services/catalog-service` | Node, Express 5, PostgreSQL |

## Run it locally

Requirements: Node 22.9+ (tested on 24) and a PostgreSQL database for the two
services (local or managed).

```bash
# 1. Install dependencies for each part
for d in server services/user-service services/catalog-service web; do (cd $d && npm install); done

# 2. Configure the services
cp services/user-service/.env.example services/user-service/.env
cp services/catalog-service/.env.example services/catalog-service/.env
cp server/.env.example server/.env
```

Edit the `.env` files:

- `DATABASE_URL` in both services (they can share one database; they use
  their own tables). TLS is skipped for `localhost` URLs; set
  `DATABASE_SSL=true|false` to override.
- `JWT_SECRET` in `user-service` and a shared random value for
  `INTERNAL_API_KEY` (catalog) = `CATALOG_INTERNAL_API_KEY` (users). The
  `.env.example` files include a command to generate them.
- Optional: `OPENROUTER_API_KEY` in `server/.env` to enable AI features. The
  key stays on the server; without it the app uses local fallbacks.

```bash
# 3. Start everything (market :4000, users :4100, catalog :4200, web :5173)
npm run dev
```

Open the URL Vite prints. Optionally create a demo account with
`npm run seed:demo`; its credentials come from `services/user-service/.env.example`.

Without `user-service`, sign-up / login fail. Without `catalog-service`, the
roadmap, mentors and marketplace fall back to bundled demo data. There is also
a `docker-compose.yml` (`docker compose up --build`) that starts Postgres and
the services.

### Tests and build

```bash
npm test          # server unit tests (node:test)
npm run build     # type-check + production build of the web app
```

## Project structure

```
web/                       React + TypeScript frontend
server/                    Express API: OSM density, DENUE snapshot, AI routes
services/user-service/     Accounts, business profiles, progress, messages
services/catalog-service/  Roadmap steps, mentors, provider roster
scripts/                   Dev runner and DENUE importer
design/                    Concept prototype
docs/                      Deployment notes (Railway)
render.yaml, vercel.json   Deployment configs
AGENTS.md                  Architecture and conventions in detail
```

## Deploying

`render.yaml` describes a Render Blueprint (web, market, users and catalog
services). `vercel.json` and `docs/RAILWAY.md` cover the other options.
Environment variables are listed in each `.env.example`.

## Limitations / next steps

- Test coverage is limited to the `server` core logic; the web app and the
  Postgres services have no automated tests.
- The web bundle is ~550 kB; routes could be code-split.
- The DENUE pilot snapshot (`server/data/denue-pilot.json`) is not in the repo, so the map uses Overpass; see
  `scripts/import-denue.mjs` to generate one locally.
- A few `oxlint` warnings about state updates inside effects remain.
