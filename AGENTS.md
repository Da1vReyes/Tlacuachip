# AGENTS.md

Guide for anyone (human or AI) working on this repo. Read this before making
changes — it explains how the pieces fit together and the conventions we're
holding to so the codebase stays coherent as more people touch it.

## What this is

Tlacuachip: a web app that helps someone in Mexico/LatAm with an idea and a
budget (from $50 to $500,000 MXN) turn it into a real business. Flow:

1. **Landing → sign up/login** (`web/src/pages/Landing.tsx`, `Auth.tsx`)
2. **Onboarding wizard** — one question at a time, game-like, not a form
   (`web/src/pages/BusinessForm.tsx`)
3. **Privacy choice** at sign-up — the user chooses private, key-business-data
   or full-profile visibility (`Auth.tsx`)
4. **Map interpretation onboarding** — required before dashboard. Three
   layers (supply, demand, cost) explain the evidence, let the user select a
   zone and state whether they are exploring or already have a location
   (`MapOnboarding.tsx`)
5. **Dashboard** — only after map onboarding. KPIs, revenue projection chart, budget breakdown, roadmap
   progress, community feed (`Dashboard.tsx`)
6. **Market report / full map** — deeper sources and continued exploration
   (`Report.tsx`, `Heatmap.tsx`)
7. **Roadmap** — horizontal gamified timeline of steps to actually open the
   business, each connecting to mentors/suppliers when relevant
   (`Roadmap.tsx`, `StepDetail.tsx`)
8. **Your team** — AI-curated roster of lawyers, accountants, financial
   advisors, marketing (human or AI agent), gestoría and suppliers, ranked
   by the entrepreneur's *next pending roadmap step* and city, with a
   "what the AI will see" panel showing the exact minimized payload before
   anything leaves the device (`Team.tsx`, `lib/privacy.ts`, `lib/matching.ts`).
9. **Mentors / Marketplace / Community / Settings** — supporting screens.
   `Settings.tsx` owns profile visibility, location precision and data deletion.

**Two roles.** At sign-up the user picks *Quiero emprender* or *Ofrezco
servicios* (`Auth.tsx`, `user.role`). Providers get their own flow:
`ProviderSignup.tsx` (public profile + which roadmap steps they help with)
→ `ProviderDashboard.tsx` (how they appear, when they get surfaced, the
revenue model). `AppShell` swaps the sidebar per role. A provider is
surfaced to an entrepreneur only through `helpsWith` ↔ roadmap step ids —
never as a generic ad.

## Repo layout

```
tlacuachip/
├── web/                  React 19 + TypeScript + Vite
│   ├── src/pages/         One file per screen/route
│   ├── src/components/    AppShell (sidebar/topbar), icons.tsx (inline SVG set)
│   ├── src/context/       AppContext — the one source of client state
│   ├── src/hooks/         useCountUp, useCityCenter, useDensity
│   ├── src/data/          Mock data generators (report, mentors, providers…)
│   ├── src/types/         Shared TS types
│   └── src/index.css      The entire design system (tokens + utility classes)
├── server/                Node + Express, ESM, no build step
│   └── src/
│       ├── index.js       Routes
│       ├── overpass.js    Overpass (OpenStreetMap) client
│       ├── zones.js       3x3 zone-grid math, shared conceptually with web
│       └── categories.js  Business category → OSM tag mapping
├── services/              Real persistence layer, built in parallel —
│                          NOT wired to the app yet. See services/README.md.
│   ├── user-service/       Users, business profiles, roadmap progress. Own SQLite DB.
│   └── catalog-service/    Roadmap steps, mentors, suppliers. Own SQLite DB, seeded.
└── design/                Source `.dc.html` for the click-through concept
                            prototype (Claude Design canvas) — not part of
                            the shipped app, keep for pitching/iterating.
```

There is no shared package between `web` and `server` yet — the zone grid
(`ROW_OFFSET`/`COL_OFFSET`, 3×3 layout) is duplicated in
`web/src/pages/Heatmap.tsx`, `web/src/pages/Dashboard.tsx`, and
`server/src/zones.js`. **If you change the grid shape, change it in all
three.** Worth extracting into a shared package if this survives past the
hackathon (see Known gaps below).

## Running it

Two processes, no Docker, no build step for the API:

```bash
cd server && npm install && npm run dev   # http://localhost:4000
cd web && npm install && npm run dev      # http://localhost:5173 (Vite picks a free port)
```

`web` talks to the API via `VITE_API_URL` (see `web/.env.example`), default
`http://localhost:4000`. The app degrades gracefully if the API is down —
the heatmap falls back to estimated (mock) supply numbers instead of real
OpenStreetMap counts, and the AI features fall back to local rankings.

**AI (OpenRouter).** Copy `server/.env.example` to `server/.env` and set
`OPENROUTER_API_KEY` (optionally `OPENROUTER_MODEL`, default
`openai/gpt-4o-mini`). `npm run dev` loads it via Node's
`--env-file-if-exists` — no dotenv dependency. Without a key,
`GET /api/ai/status` reports `configured: false`, the UI disables the
"Recomendar con IA" / "Interpretar con IA" buttons and says so, and
`POST /api/match` / `POST /api/insights` answer with `source: "fallback"`
using `server/src/matching.js`. The key never reaches the browser.

Type-check and lint before pushing:

```bash
cd web && npx tsc --noEmit && npm run lint
```

There's no test suite yet (hackathon timeline). If you add non-trivial logic
(scoring formulas, data merging), consider adding one — see Known gaps.

## State & data flow

- **`AppContext`** (`web/src/context/AppContext.tsx`) is the only client
  state: `user`, `businessForm`, `report`, `progress` (level/XP/completed
  steps), all persisted to `localStorage` under one JSON key. Read/write it
  through `useApp()` — don't reach into `localStorage` directly from a page.
  `preferences` owns profile visibility, location precision, selected zone
  and the mandatory map-onboarding completion state.
- **Report + heatmap data is mock**, generated deterministically from the
  business form (`web/src/data/mockData.ts`) — same input always produces
  the same numbers, so it's not random noise, but it isn't real market data
  either. Say so if it comes up in a demo or pitch.
- **Heatmap "oferta" (supply) is real**, sourced live from OpenStreetMap via
  `server/src/overpass.js` → `GET /api/density`. Demand and cost are still
  estimated. This is the one number in the app you can defend as not made
  up — see the credibility discussion this repo grew out of.
- Routing is `HashRouter` (`react-router-dom`) — URLs look like
  `/#/roadmap`. That's deliberate: it means `web/` can be deployed as a
  static site with zero server-side routing config. Query strings live
  inside the hash (`/#/auth?role=provider`) and `useSearchParams` reads them.
- **Privacy is enforced twice, on purpose.** The client builds the exact
  payload the AI gets (`web/src/lib/privacy.ts → buildMinimizedProfile`)
  from `preferences.visibility` / `locationPrecision`, and shows it to the
  user verbatim. The server then re-runs the same rules
  (`server/src/privacy.js → sanitizeProfile`) and drops anything the
  visibility level doesn't allow, plus whitelists/caps every field. Email,
  name, exact budget and address are never part of the schema at all.
  If you add a field to the profile, add it to BOTH minimizers and decide
  which visibility level unlocks it.
- **Matching** is deterministic first (`lib/matching.ts` ↔
  `server/src/matching.js`, keep them in sync): score = rating + 6 if the
  provider helps with the next pending step (+2 for a future step) + 2 for
  same city (+1 for an AI agent) ± category fit. The LLM only *chooses and
  explains* among the top 8 candidates the client sends; its output is
  filtered back to that candidate list, so it cannot invent a provider.

## Design system

Everything lives in `web/src/index.css` as CSS custom properties + utility
classes — there's no component library, no Tailwind, no CSS-in-JS. The
current direction is deliberately **minimal operating UI**: warm off-white
canvas, thin gray rules, near-black text and one cobalt signal color. Flat
panels use borders, not elevation. Follow `DESIGN.md`; do not reintroduce
dashboard-card shadows or decorative gradients.

Icons are hand-drawn inline SVG in `web/src/components/icons.tsx`
(stroke-based, 24×24 viewBox, `currentColor`). **No emoji, no icon-font
libraries** — stay consistent with the existing set when adding one.

Motion conventions (also in `index.css`):
- `.page-enter` — fade+slide on route change (wired once in `AppShell`,
  you don't need to add it per page)
- `.stagger > *` — staggered fade-in for list/grid children
- `.card-hover`, `.card-clickable` — restrained interactive feedback only
- `.pop-in` — ease-out-quint pop for things appearing after a user action
  (no bounce/elastic easing — it reads as dated; we specifically fixed this
  once, don't reintroduce `cubic-bezier(0.34, 1.56, ...)`-style overshoot)

## Conventions

- **TypeScript, strict**: `web` is typed end-to-end. `npx tsc --noEmit` must
  pass before you push. The `server` is plain ESM JS by choice (hackathon
  speed) — keep it small enough that this stays fine, or migrate it to TS if
  it grows real business logic.
- **Redirects belong in `useEffect`, never in the render body.** Don't do
  `if (!ready) { navigate(...); return null; }` directly in a component —
  calling `navigate()` during render is a real bug (React warns
  "Cannot update a component while rendering a different component") and
  breaks under concurrent rendering. Pattern to follow, used throughout
  `web/src/pages/`:
  ```tsx
  useEffect(() => {
    if (!ready) navigate("/formulario", { replace: true });
  }, [ready, navigate]);

  if (!ready) return null;
  ```
- **No stale closures in delayed callbacks.** If a handler does
  `setSomething(value)` and then needs to act on that value shortly after
  (e.g. `setTimeout(..., 220)` for an auto-advance animation), pass `value`
  explicitly into the delayed function — don't read it back off state,
  which is still the pre-update value in that closure. See
  `web/src/pages/BusinessForm.tsx` (`submitForm(exp, cat)`) for the fixed
  pattern; this bit us once already.
- **Animate `transform`/`opacity`, not layout properties.** Progress bars
  animate `transform: scaleX(...)` on a full-width element, not `width` —
  keeps them off the main thread's layout pass. Follow this for any new
  progress/loading indicator.
- Inline `style={{}}` is used deliberately for anything data-driven
  (colors computed from a score, positions computed from a grid). Static,
  reusable styling goes in `index.css` as a class instead.
- **Privacy is product behavior, not visual copy.** Profile visibility and
  data deletion must update `preferences` through `useApp()`. Never expose a
  user's email, exact budget, or precise address in public/community views.

## Known lint warnings (reviewed, intentionally left)

Running `npm run lint` in `web/` surfaces a handful of `oxlint`
`react(set-state-in-effect)` warnings in `useCityCenter.ts`, `useDensity.ts`,
`Heatmap.tsx`, and `AppContext.tsx`, plus one `react(only-export-components)`
in `AppContext.tsx`. These are the standard "fetch/hydrate in an effect, set
loading state, setState on resolution" and "context file exports both the
Provider and its `useX` hook" patterns — both are idiomatic React, not bugs.
Don't "fix" these by moving fetches into render or splitting the context
file unless you have a concrete reason; they're flagged, not broken.

## Known gaps / next steps

- **Demand and cost in the heatmap are still estimated**, not real. Next
  highest-value data source: INEGI/DENUE (Mexico's business census) for
  actual formal-sector business counts and sector growth, replacing
  `generateMockReport` in `web/src/data/mockData.ts`.
- **No auth backend** — "login" just stores a name/email in `localStorage`.
  `services/user-service` now persists users/profiles/progress for real
  (SQLite), but the web app doesn't call it yet — see `services/README.md`
  for the cutover plan. Still no passwords/sessions, just email-as-identity.
- **No tests.** Priority if this continues: the scoring math
  (`opportunityFrom` in `Heatmap.tsx`, `scoreFromCount` in
  `server/src/zones.js`) and the zone-bucketing geometry, since those are
  easy to silently break.
- **Zone grid is duplicated** across `web` and `server` (see Repo layout) —
  extract to a shared package if this grows past hackathon scope.
- `server` has no persistence or auth — it's a stateless proxy in front of
  Overpass (10 min in-memory cache) plus two LLM routes behind a per-IP
  rate limit (`AI_RATE_LIMIT_PER_MINUTE`, default 20). Fine for a demo; add
  a shared store before running more than one process.
- **The provider roster is seed data** (`web/src/data/mockData.ts →
  providers`). A real provider signing up today only persists locally
  (`providerProfile` in `AppContext`) and isn't added to the roster other
  users see — wiring that needs `services/catalog-service` (whose schema is
  now behind: it still has the old `type/category` provider shape and the
  old roadmap step ids). Update its `schema.sql` + `seed.js` before cutting
  over.
- **Contacting a provider isn't built** — "Guardar en mi equipo" persists a
  list; there's no messaging or deal flow yet, so the commission revenue
  stream described on the landing page has no mechanism behind it.

## Contributing

- Branch off `main`, open a PR, keep commits scoped (one concern per
  commit) — this repo is being actively demoed, so `main` should always run.
- If you touch `web/src/index.css`, check you're not duplicating an
  existing token first.
- If you touch the zone grid or scoring formulas, update this file's
  "Known gaps" section if the gap you were closing is listed above.
