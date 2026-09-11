# Tlacuachic

Tlacuachic helps first-time entrepreneurs in Latin America turn an idea into a
real business: a data-backed market report, a real-business-density heatmap,
a gamified step-by-step roadmap, and an AI-curated team of mentors, lawyers,
accountants and suppliers — with real accounts, real Postgres persistence,
and real provider signups that actually appear in the marketplace.

Built for a hackathon — see [AGENTS.md](./AGENTS.md) for the full
architecture, conventions, and how to run everything.

## Deploy

The project is prepared for a Render Blueprint with separate web, market,
users and catalog services plus one shared PostgreSQL database. Follow the
exact service order and environment-variable checklist in
[docs/RENDER.md](./docs/RENDER.md). The previous Railway guide remains as an
alternative. For a reproducible local stack, use `docker compose up --build`
once Docker Desktop is running.

## Quickstart

For the hackathon demo, start every service from one terminal:

```bash
npm run dev
```

Four terminals:

```bash
cd server && npm install && npm run dev                        # API on :4000
```

```bash
cd services/user-service && npm install && npm run dev         # Accounts API on :4100
```

```bash
cd services/catalog-service && npm install && npm run dev      # Catalog API on :4200
```

```bash
cd web && npm install && npm run dev                           # App on :5173 (or next free port)
```

Open the URL Vite prints. `user-service` and `catalog-service` both need a
Postgres database (can be the same one — they use their own tables):

```bash
cp services/user-service/e.env.example services/user-service/e.env
# set DATABASE_URL, JWT_SECRET (see the file's own comment for a one-line
# command to generate one), and CATALOG_INTERNAL_API_KEY

cp services/catalog-service/e.env.example services/catalog-service/e.env
# set DATABASE_URL and INTERNAL_API_KEY — must match CATALOG_INTERNAL_API_KEY above
```

Without `user-service`, signup/login fail outright — there's no local-only
mode anymore, accounts are real. Without `catalog-service`, the roadmap,
mentors, and marketplace fall back to the bundled demo data. `server` (the
Overpass/AI one) is the most forgiving: the app still runs without it, just
with fewer live numbers on the heatmap and local rankings instead of AI
recommendations.

To turn on the AI features (team matching, report interpretation):

```bash
cp server/e.env.example server/e.env   # then set OPENROUTER_API_KEY
```

The key stays on the server. The UI tells you whether the AI is configured.

### Demo account

Once the database environment is configured, create a repeatable non-sensitive
demo account in Postgres:

```bash
npm run seed:demo
```

It prints the configured demo credentials. The defaults are documented only in
`services/user-service/.env.example`; override them in your local `.env` before
a public deployment.

## Structure

```
tlacuachic/
├── web/       React + TypeScript + Vite frontend
├── server/    Node + Express API (OpenStreetMap density, OpenRouter AI routes)
├── services/
│   ├── user-service/     Accounts, business profiles, progress — real Postgres, wired in
│   └── catalog-service/  Roadmap/mentors/providers — real Postgres, wired in, synced from user-service
└── design/    Source for the click-through concept prototype
```
# Optional but recommended for a stable Mexico heatmap: after downloading the
# official DENUE CSV archives from INEGI, build a local official snapshot.
# The source data is ignored by Git and can be regenerated at any time.
npm run import:denue # CDMX by default; set DENUE_STATE_CODE=14 for Jalisco
