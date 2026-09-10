# Tlacuachip

Tlacuachip helps first-time entrepreneurs in Latin America turn an idea into a
real business: a data-backed market report, a real-business-density heatmap,
a gamified step-by-step roadmap, and a marketplace of mentors and suppliers.

Built for a hackathon — see [AGENTS.md](./AGENTS.md) for the full
architecture, conventions, and how to run everything.

## Quickstart

Two terminals:

```bash
cd server && npm install && npm run dev   # API on :4000
```

```bash
cd web && npm install && npm run dev      # App on :5173 (or next free port)
```

Open the URL Vite prints. The web app calls the API for real business-density
data (`VITE_API_URL`, defaults to `http://localhost:4000`); the app still
works without the API running, it just falls back to fewer live numbers on
the heatmap.

## Structure

```
tlacuachip/
├── web/     React + TypeScript + Vite frontend
├── server/  Node + Express API (OpenStreetMap-backed business density)
└── design/  Source for the click-through concept prototype
```
