# Tlacuachic

Tlacuachic helps first-time entrepreneurs in Latin America turn an idea into a
real business: a data-backed market report, a real-business-density heatmap,
a gamified step-by-step roadmap, and an AI-curated team of mentors, lawyers,
accountants and suppliers — with real accounts, real Postgres persistence,
and real provider signups that actually appear in the marketplace.

Built for a hackathon — see [AGENTS.md](./AGENTS.md) for the full
architecture, conventions, and how to run everything.

## Quickstart

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
cp services/user-service/.env.example services/user-service/.env
# set DATABASE_URL, JWT_SECRET (see the file's own comment for a one-line
# command to generate one), and CATALOG_INTERNAL_API_KEY

cp services/catalog-service/.env.example services/catalog-service/.env
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
cp server/.env.example server/.env   # then set OPENROUTER_API_KEY
```

The key stays on the server. The UI tells you whether the AI is configured.

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
