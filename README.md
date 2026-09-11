# Tlacuachic

Tlacuachic helps first-time entrepreneurs in Latin America turn an idea into a
real business: a data-backed market report, a real-business-density heatmap,
a gamified step-by-step roadmap, and an AI-curated team of mentors, lawyers,
accountants and suppliers — with real accounts and real Postgres persistence.

Built for a hackathon — see [AGENTS.md](./AGENTS.md) for the full
architecture, conventions, and how to run everything.

## Quickstart

Three terminals:

```bash
cd server && npm install && npm run dev                     # API on :4000
```

```bash
cd services/user-service && npm install && npm run dev      # Accounts API on :4100
```

```bash
cd web && npm install && npm run dev                        # App on :5173 (or next free port)
```

Open the URL Vite prints. `user-service` needs a Postgres database and a
signing secret first:

```bash
cp services/user-service/.env.example services/user-service/.env
# set DATABASE_URL (any Postgres works) and JWT_SECRET (see the file's
# own comment for a one-line command to generate one)
```

Without it, signup/login fail outright — there's no local-only mode
anymore, accounts are real. `server` (the Overpass/AI one) is more
forgiving: the app still runs without it, just with fewer live numbers on
the heatmap and local rankings instead of AI recommendations.

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
│   └── catalog-service/  Roadmap/mentor/supplier catalog — not wired to anything yet
└── design/    Source for the click-through concept prototype
```
