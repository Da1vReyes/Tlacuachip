# AGENTS.md

Guide for anyone (human or AI) working on this repo. Read this before making
changes — it explains how the pieces fit together and the conventions we're
holding to so the codebase stays coherent as more people touch it.

## What this is

Tlacuachic: a web app that helps someone in Mexico/LatAm with an idea and a
budget (from $50 to $500,000 MXN) turn it into a real business. Flow:

1. **Landing → sign up/login** (`web/src/pages/Landing.tsx`, `Auth.tsx`)
2. **Onboarding wizard** — one question at a time, game-like, not a form
   (`web/src/pages/BusinessForm.tsx`). Last step is a free-text description
   of the business (optional but pushed hard in copy) — it's sent to the AI
   for both the report and the team recommendations, so the reading is
   about *this* business, not just its category.
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
10. **Tutorial** (`Tutorial.tsx`, route `/tutorial`) — a plain-language walk
    through the whole flow plus a dedicated explainer for "Tu equipo"
    specifically (that screen confuses first-time users the most). Linked
    from the sidebar under "Ayuda" and shown as a dismissible banner on
    Dashboard until `preferences.tutorialSeen` is set.

**Two roles.** At sign-up the user picks *Quiero emprender* or *Ofrezco
servicios* (`Auth.tsx`, `user.role`). Providers get their own flow:
`ProviderSignup.tsx` (public profile + which roadmap steps they help with)
→ `ProviderDashboard.tsx` (how they appear, when they get surfaced, the
revenue model). `AppShell` swaps the sidebar per role. A provider is
surfaced to an entrepreneur only through `helpsWith` ↔ roadmap step ids —
never as a generic ad.

## Repo layout

```
tlacuachic/
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
├── services/
│   ├── user-service/       WIRED IN. Users, business profiles, reports,
│   │                       progress, preferences, provider profiles, saved
│   │                       teams. Real Postgres (see .env.example), JWT
│   │                       auth, every route scoped to the caller's own
│   │                       account (`/api/me/*`, never a client-sent id).
│   └── catalog-service/    WIRED IN. Roadmap steps, mentors, providers.
│                           Real Postgres, public GET routes, and an
│                           internal-key-protected PUT/DELETE that
│                           user-service calls to keep real provider
│                           signups in the public roster (see below).
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

Three processes, no Docker, no build step for either API:

```bash
cd server && npm install && npm run dev                      # http://localhost:4000
cd services/user-service && npm install && npm run dev       # http://localhost:4100 — needs DATABASE_URL + JWT_SECRET, see below
cd web && npm install && npm run dev                         # http://localhost:5173 (Vite picks a free port)
```

`web` talks to `server` via `VITE_API_URL` (default `http://localhost:4000`)
and to `user-service` via `VITE_USER_SERVICE_URL` (default
`http://localhost:4100`) — see `web/.env.example`. The app degrades
gracefully if `server` is down — the heatmap falls back to estimated
(mock) supply numbers, the AI features fall back to local rankings — but
**`user-service` is not optional**: without it, signup/login fail outright
(there's no local-only account mode anymore). Copy
`services/user-service/.env.example` to `.env` and set `DATABASE_URL`
(any Postgres — Render/Supabase/Neon/RDS all work; the service runs
`CREATE TABLE IF NOT EXISTS` on boot, tables are prefixed `tlacuachic_` so
it's safe to point at a database with other projects' tables already in
it) and `JWT_SECRET` (generate one — see the file's own comment for the
one-liner).

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
  state: `user`, `businessForm`, `report`, `progress`, `preferences`,
  `providerProfile`, `team`. Read/write it through `useApp()` — don't reach
  into `localStorage` or call `services/user-service` directly from a page.
  Every mutator (`saveBusinessForm`, `completeStep`, `savePreferences`, …)
  updates this state immediately (optimistic — the UI never waits on a
  round-trip) and mirrors the change to `user-service` in the background
  when authenticated; a background failure is logged (`console.warn`), not
  surfaced, so a flaky connection doesn't break the UI — it just means that
  one change won't show up if you log in elsewhere until it's retried.
  `localStorage` (`emprende-mvp-state` for state, `tlacuachic-token` for the
  session) is now a **cache for instant paint**, not the source of truth:
  on mount, if a token is present, `AppContext` refetches `GET /api/me` and
  overwrites local state with whatever Postgres says — that's what makes
  logging in from a different browser show your real data instead of an
  empty account. `preferences` owns profile visibility, location precision
  and the mandatory map-onboarding completion state.
- **Auth is real** (`services/user-service`): email/password with bcrypt,
  JWT bearer tokens (`services/user-service/src/auth.js`), Postgres-backed.
  `web/src/lib/userApi.ts` is the only file allowed to call it directly —
  go through `useApp()`'s `signup`/`login`/`logout` from a page. `signup`
  and `login` resolve with an `AuthResult` snapshot (`role`,
  `hasBusinessForm`, `hasProviderProfile`, `onboardingComplete`) computed
  from the just-fetched server response — **use that to decide where to
  navigate, not context state read right after calling them.** We hit this
  exact stale-closure bug once already: `navigate()` ran with the
  pre-update `businessForm` still in scope (React hadn't re-rendered yet)
  and sent a returning user with a saved business back to the wizard. See
  "No stale closures" below — same root cause as the `BusinessForm.tsx` one,
  different screen.
- **The catalog is real too** (`services/catalog-service`): roadmap steps,
  mentors, and providers live in Postgres, seeded once on first boot from
  the same content that used to live only in `web/src/data/mockData.ts`
  (that file is still imported as the initial state and offline fallback —
  don't delete it). `AppContext` fetches `/api/roadmap-steps`,
  `/api/mentors`, `/api/providers` once on mount and exposes them as
  `steps`, `mentors`, `catalogProviders` from `useApp()`. Pages that used to
  `import { providers, mentors, roadmapSteps } from "../data/mockData"`
  directly (`Team.tsx`, `Marketplace.tsx`, `StepDetail.tsx`,
  `Dashboard.tsx`, `Mentors.tsx`, `ProviderSignup.tsx`,
  `ProviderDashboard.tsx`) now read them from context instead — **don't
  reintroduce a direct `mockData` import for these three** in a page
  component, or it'll silently show stale demo data instead of the real
  roster.
  The part that actually makes the marketplace real: when a user saves a
  provider profile (`PUT /api/me/provider-profile` in `user-service`), that
  route also calls `PUT /api/providers/:userId` on `catalog-service`
  (`services/user-service/src/catalogSync.js`), authenticated with a shared
  `x-internal-key` header — not a user JWT, since `catalog-service` has no
  concept of auth. Account deletion calls the matching `DELETE` route. Both
  calls are fire-and-forget (logged on failure, never thrown) — same
  graceful-degradation posture as everything else here. Verified
  end-to-end: signed up a fresh provider account, saved a provider profile,
  confirmed the new row in `tlacuachic_providers` (`user_id` set) via a
  direct `GET /api/providers` call, confirmed it rendered on `/marketplace`
  in the browser, then deleted the account and confirmed the row was gone.
- **The market report is generated, not mock**, since `POST /api/report`
  (`server/src/report.js`) landed: it geocodes the business's city, counts
  REAL nearby similar businesses via Overpass, and asks the model to reason
  growth/revenue/survival/insights from that real count plus the business's
  own form — including the free-text `description` field
  (`BusinessFormData.description`, filled in the wizard's last step). The
  model is explicitly told a `0` count can mean "Overpass didn't answer",
  not "confirmed no competition" — don't remove that instruction, we hit
  the model confidently claiming an empty market once before adding it.
  `web/src/lib/report.ts → generateReport()` calls it and only falls back to
  `generateMockReport` (`web/src/data/mockData.ts`) if the SERVER itself is
  unreachable — the server already handles Overpass/model failures
  internally, so this outer fallback is a last resort, not the common path.
  `ReportData.source` (`"llm" | "fallback"`) and `.osmAvailable` tell you
  which happened; `Report.tsx` shows both.
- **Heatmap "oferta" (supply) is real**, sourced live from OpenStreetMap via
  `server/src/overpass.js` → `GET /api/density`. Demand and cost are still
  estimated. Same real source powers `/api/report`'s count.
- **Node's `fetch` needs IPv4 preferred** (`server/src/index.js` calls
  `dns.setDefaultResultOrder("ipv4first")` at startup) — some networks have
  a broken IPv6 route to Overpass's public instance (which still publishes
  AAAA records) and Node's fetch tries IPv6 first, hanging for the full
  timeout before falling back; `curl` doesn't have this problem, which is
  what made it confusing to debug. If you see Overpass timing out in Node
  while `curl` to the same URL works fine, this is why. `fetchRealPoints`
  also retries once on a connection-level failure before giving up.
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

- **Demand and cost in the heatmap are still estimated**, not real (supply
  and the report's business count are). Next highest-value data source:
  INEGI/DENUE (Mexico's business census, needs a free API token — see the
  DENUE validation notes from this repo's planning discussion) for
  formal-sector counts and sector growth by municipality, which would
  upgrade `server/src/report.js`'s heuristic beyond "real count + AI
  reasoning" to "real count + real published growth stats + AI reasoning."
- **No token revocation.** JWTs are valid for 30 days from issue with no
  server-side session to invalidate — "logout" only clears the token
  client-side; a captured token keeps working until it expires. Fine for a
  hackathon; a real deployment needs a revocation list or short-lived
  access tokens + refresh tokens.
- **No email verification, no rate limit on login beyond the generic
  20/min/IP** (`services/user-service/src/index.js → authLimiter`) — no
  account lockout, no CAPTCHA. Someone can brute-force a weak password
  slowly. Fine for a hackathon demo, not for real user data.
- **No tests.** Priority if this continues: the scoring math
  (`opportunityFrom` in `Heatmap.tsx`, `scoreFromCount` in
  `server/src/zones.js`) and the zone-bucketing geometry, since those are
  easy to silently break.
- **Zone grid is duplicated** across `web` and `server` (see Repo layout) —
  extract to a shared package if this grows past hackathon scope.
- `server` (the Overpass/AI one, not `user-service`) has no persistence or
  auth by design — it's a stateless proxy plus two LLM routes behind a
  per-IP rate limit (`AI_RATE_LIMIT_PER_MINUTE`, default 20). One gap:
  `GET /api/density` has no rate limit at all (the LLM routes do) — varying
  lat/lng slightly bypasses the 10-min cache, so it's the one endpoint that
  could burn through Overpass's shared quota if hammered. Add `aiLimiter`
  (or a separate, larger-quota limiter) to it before this goes anywhere
  public.
- **`catalog-service` has no rate limit tuned for it yet** — `publicLimiter`
  is a flat 120/min/IP on all three public GET routes, never load-tested.
  Fine for a demo, revisit if this ever sees real traffic.
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
