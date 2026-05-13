# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# ng-nordpool

Angular 21 app that displays Nordpool day-ahead electricity spot prices.

## Links

- **GitHub repo:** https://github.com/olsoybakk/ng-nordpool
- **Live app:** https://olsoybakk.github.io/ng-nordpool/
- **GitHub Actions:** https://github.com/olsoybakk/ng-nordpool/actions

## Git workflow

`main` is protected — direct pushes are blocked (enforced on GitHub and by a local pre-push hook in `.githooks/pre-push`). All changes go through a PR. The repository only allows **squash merges** — use `gh pr merge <number> --squash` when merging. New clones need:

> **Always ask the user before merging a PR.** Create and push the branch, open the PR, share the URL, then wait for explicit approval before running `gh pr merge`.

```bash
git config core.hooksPath .githooks
```

## Playwright MCP

`.mcp.json` configures the Playwright MCP server (`npx @playwright/mcp@latest --output-dir .playwright-mcp`).
With the dev server running (`npm run dev`), Claude Code can navigate to
`http://localhost:3000`, take screenshots, click elements, and inspect the live app.
Screenshots and snapshots are written to `.playwright-mcp/`.
Restart Claude Code after changing `.mcp.json` for the update to take effect.

## Commands

```bash
npm start          # dev server at http://localhost:4200
npm run dev        # dev server at http://localhost:3000
npm run build      # production build → dist/ng-nordpool/browser/
npm test           # all unit tests (vitest via @angular/build:unit-test)
ng test --include="**/app.spec.ts"  # single test file (currently the only spec)
npx prettier --write .  # format all files (printWidth 100, singleQuotes)
```

> **Note:** `app.spec.ts` has a stale "render title" test that expects `<h1>Hello, ng-nordpool</h1>` — the `App` component only renders `<router-outlet />`, so that assertion always fails. The "should create the app" test passes fine.

## TypeScript

`tsconfig.json` has `strict: true` plus `noImplicitReturns`, `noPropertyAccessFromIndexSignature`, `noFallthroughCasesInSwitch`, and `noImplicitOverride`. Angular templates use `strictTemplates` and `strictInjectionParameters`. All new code must satisfy these.

## Angular Signals

Component state uses `signal()` / `effect()` rather than `BehaviorSubject`. Cleanup uses `inject(DestroyRef).onDestroy(...)` instead of `ngOnDestroy`. Store observables (`store.select(...)`) are kept as observables for the template `async` pipe; signals are used for purely local UI state (`chartMode`, `theme`, `isFullscreen`, `tooltipData`, etc.). `@ngrx/entity` is installed but not used.

## Environment

The API base URL is configured via `src/environments/environment.ts` (committed, used in production builds) and `src/environments/environment.local.ts` (gitignored, used automatically in development via `fileReplacements` in `angular.json`).

`npm run dev` runs a `predev` script that creates `environment.local.ts` from `environment.ts` on a fresh clone. Edit `environment.local.ts` to point at a different URL locally without affecting git.

Both files point at a Netlify CORS proxy. Check `src/environments/environment.ts` for the current URL.

## Data source

`{nordpoolApiUrl}?date={YYYY-MM-DD}&market=DayAhead&deliveryArea={AREA,...}&currency=NOK`

Free, no API key. Returns 15-minute interval data for all requested areas in one response (`multiAreaEntries`), with prices in `NOK/MWh`. The service maps each 15-min entry directly to `HourlyPrice`, converting `NOK/MWh → øre/kWh` (÷ 10). `time_start`/`time_end` use `localDeliveryStart`/`localDeliveryEnd` (CET/CEST local time, no timezone suffix) — parsed as local time by JS `Date`.

The app shows only Norwegian areas: NO1–NO5. Non-Norwegian areas are commented out in the model, PRICE_AREAS list, AREA_COLORS, and location service.

## Architecture

### State (NgRx)

Feature key: `prices`. Single feature slice — no root reducer needed beyond this.

```
src/app/store/prices/
  prices.actions.ts    loadPrices / loadPricesSuccess / loadPricesFailure
                       loadAllAreaPrices / loadAllAreaPricesSuccess / loadAllAreaPricesFailure
                       detectLocation
                       selectArea / selectDate
  prices.reducer.ts    initialState: {
                         prices[], allAreaPrices{}, selectedArea, selectedDate:today,
                         loading, allAreasLoading, error
                       }
                       selectedArea is hydrated from localStorage on startup.
  prices.effects.ts    loadPrices$ → NordpoolService.getPrices() via switchMap
                       loadAllAreaPrices$ → NordpoolService.getAllAreaPrices() via
                         switchMap; single API call for all areas; catchError returns
                         loadAllAreaPricesFailure (does not silently drop partial data)
                       detectLocation$ → LocationService.detectPriceArea(), then
                         mergeMap → of(selectArea, loadPrices, loadAllAreaPrices);
                         catchError → EMPTY (silent fallback, keeps default NO1)
                       persistSelectedArea$ → tap selectArea, writes to localStorage
                         (dispatch: false)
  prices.selectors.ts  selectAllPrices, selectAllAreaPrices, selectSelectedArea,
                       selectSelectedDate, selectLoading, selectAllAreasLoading,
                       selectError, selectCurrentPrice, selectDailyStats
src/app/store/index.ts re-exports all of the above
```

### Services

`src/app/services/nordpool.service.ts` — two methods: `getPrices(date, area)` fetches a single area; `getAllAreaPrices(date)` fetches all 5 areas in one request. Both call the proxy and map each 15-min `multiAreaEntries` entry directly to a `HourlyPrice` (÷ 10 for NOK/MWh → øre/kWh), yielding up to 96 entries per area with no per-hour averaging.

`src/app/services/location.service.ts` — `detectPriceArea()` wraps `navigator.geolocation.getCurrentPosition` in an Observable, calls `nominatim.openstreetmap.org/reverse` for the country code, then maps to a `PriceArea`:
- Norway: lat/lon → NO1–NO5 (approximate bidding-zone boundaries)
- All other countries → NO1 (non-Norwegian mappings commented out)

### Models

`src/app/models/price.model.ts` — `HourlyPrice` (`ore_per_kWh`, `time_start`, `time_end`), `PricesState`, `PriceArea` union type (currently NO1–NO5 only; other areas commented out), `PRICE_AREAS` display list, `AREA_COLORS` record (5 HSL hues for active areas; remaining 15 commented out).

### Components

All standalone. No shared module.

```
src/app/components/
  controls/       Area <select> + date <input> with ‹/› prev/next day buttons.
                  maxDate is tomorrow (Date.now() + 864e5). stepDate(±1) guards
                  against going past maxDate. Next button disabled at maxDate.
                  Area change → selectArea + loadPrices.
                  Date change → selectDate + loadPrices + loadAllAreaPrices.
                  A colored dot (AREA_COLORS[currentArea]) overlays the select
                  via position:absolute inside .select-wrapper — native selects
                  can't hold custom markup cross-browser.
  stats-bar/      Now / Min / Avg / Max cards derived from store selectors.
  price-chart/    Pure SVG chart (no charting lib). Accepts chartMode input signal.
                  Also selects selectedDate from store to compute the now-line.
                  Y scale: both modes snap min to floor-25 and max to ceil-25 of
                    (data ± 5 øre buffer). Grid lines at every 50 øre.
                  Bar mode: colour-coded bars (low/mid/high by tertile); current
                    hour highlighted. Y scale = single-area snapped min/max.
                  Line mode: step chart — two SVG points per hour (left + right
                    edge at same Y) producing a staircase with a plain <polyline>.
                    One polyline per area; selected area renders on top (sorted last).
                    Y scale = global snapped min/max across all areas.
                  Both modes: dashed vertical "now" line (only when selectedDate ===
                    today); hover tooltip listing all areas sorted most expensive→cheapest
                    with full label (e.g. "NO3 — Midt-Norge"); fullscreen toggle.
                  Tooltip is an HTML div (not SVG) inside .chart-outer, with
                    pointer-events:none so it never blocks SVG mouse events. Closes
                    on both document:click and document:touchstart (iOS Safari does
                    not reliably bubble click from non-interactive elements).
                  Fullscreen uses CSS position:fixed (not the browser Fullscreen API).
                    dims() computed signal recalculates chartH and viewBox to fill
                    the card. width:auto on .chart-outer--fullscreen is critical —
                    without it the base width:100% overrides the right inset.
                  Scale-aware font sizing: dims() computes labelSize in SVG user
                    units so labels render at ~10px on screen regardless of viewport.
                    Text elements use [attr.font-size] (not CSS font-size).
                  Line visibility: vector-effect:non-scaling-stroke keeps stroke
                    widths in screen pixels (without it a 1.5-unit stroke at 1500-wide
                    viewBox renders at ~0.3px on mobile). --line-drop-shadow CSS
                    variable adds a dark drop-shadow in light mode only, giving
                    light-coloured lines contrast against the white background.
  price-table/    Up to 96-row table (one row per 15-min interval). Current
                  interval row highlighted + "Now" badge.
                  Only shown when chartMode === 'bar'.

src/app/pages/
  dashboard/      Owns chartMode signal (default: 'line'). Line/Bar toggle in header.
                  On init dispatches loadPrices + loadAllAreaPrices via
                  combineLatest + first(). Also dispatches detectLocation if
                  localStorage has no saved area.
                  Loading state: a semi-transparent overlay spinner covers the
                  chart section; stats bar and "All hours" table fade to 40%
                  opacity (pointer-events: none) while loading$ || allAreasLoading$.
```

### Routing

Lazy-loads `DashboardComponent` at `''`. Wildcard redirects to `''`.

### Persistence

`selectedArea` is written to `localStorage` by the `persistSelectedArea$` effect and read back in the reducer's `initialState`. The selected date always resets to today on load.

`detectLocation` is only dispatched when `localStorage.getItem('selectedArea')` is null (first visit or cleared storage). Once the area is detected and `selectArea` fires, `persistSelectedArea$` writes it to localStorage so detection never runs again.

### Styling

CSS custom properties in `src/styles.scss`. Dark mode default, light mode via `prefers-color-scheme: light`. Variables: `--color-bg`, `--color-surface`, `--color-border`, `--color-text`, `--color-muted`, `--color-accent`, `--color-low`, `--color-high`, `--line-drop-shadow` (dark shadow in light mode, `none` in dark mode).

Theme toggle: `DashboardComponent` holds a `theme` signal (`'dark' | 'light'`) initialised from `window.matchMedia('(prefers-color-scheme: dark)')` on load. An `effect()` writes it to `document.documentElement` as `data-theme`. A `matchMedia` change listener keeps the signal in sync when the OS theme changes while the app is open. CSS uses `:root:not([data-theme='dark'])` in the media query and explicit `:root[data-theme='light']` / `:root[data-theme='dark']` blocks to handle all three states.

### Public assets

Static files in `public/` are served at the root. Current contents:
- `favicon.svg` — SVG emoji favicon (`⚡`), works in all modern browsers
- `apple-touch-icon.png` — 180×180 PNG for iOS home screen shortcuts; generated via canvas with `actualBoundingBox` metrics to visually centre the emoji
- `favicon.ico` — legacy fallback (kept for older browsers)

## Deployment

`.github/workflows/deploy.yml` — triggers on push to `main` and `workflow_dispatch`.

Build step: `npx ng build --base-href=/ng-nordpool/`
Post-build: copies `index.html` → `404.html` for client-side routing on Pages.
Deploys via `actions/upload-pages-artifact` + `actions/deploy-pages`.

Repo must be **public** for GitHub Pages on a free plan.

## Key decisions

- No third-party chart library — SVG rendered directly in the component to keep the bundle small.
- Step chart geometry: two points per hour (left + right edge at same Y) produces correct staircase without any path commands — a plain `<polyline>` is enough.
- Tooltip uses HTML (not SVG foreignObject) for easy styling. Positioned absolute inside `.chart-outer`; `pointer-events: none` so it never blocks mouse events on the SVG. Sibling of `.chart-wrapper` so it is never clipped by the wrapper.
- `chartMode` lives in the dashboard signal, not the store — it's purely presentational and doesn't need to survive a reload.
- `loadAllAreaPrices` fires a single API request for all 5 areas via `getAllAreaPrices(date)` — the proxy accepts a comma-separated `deliveryArea` list so no parallel requests are needed.
- Geolocation detection is fire-and-forget: the initial `loadPrices` + `loadAllAreaPrices` dispatch runs immediately with the stored/default area, then if detection succeeds it re-dispatches both for the detected area. No loading gate needed.
- `404.html` copy pattern handles deep-link / refresh on GitHub Pages without hash routing.
- `--base-href` is only needed for the Pages build; local dev works without it.
- NgRx Store Devtools enabled in dev mode — works with the Redux DevTools browser extension.
- Y-scale bounds are snapped to the nearest 25 øre after adding a 5 øre buffer. The snap helpers guarantee the result is strictly outside the buffered value (not equal), so a data max of exactly 220 øre never produces a scale max of 225.
