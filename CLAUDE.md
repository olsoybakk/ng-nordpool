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

> **Never commit directly to `main`.** Always create a branch first, commit there, then open a PR.

> **Always ask the user before merging a PR.** Create and push the branch, open the PR, share the URL, then wait for explicit approval before running `gh pr merge`.

> **Always check CI before merging.** Run `gh pr checks <number>` and confirm all checks pass before attempting `gh pr merge`. If checks are still running, wait and re-run until they complete.

> **After merging, always delete the branch** — both remote (`git push origin --delete <branch>`) and local (`git branch -D <branch>`). Then run `git checkout main && git pull`.

> **After merging, always clean up `.playwright-mcp/`** — run `rm -rf .playwright-mcp/` to remove screenshots and snapshots left from Playwright MCP sessions. The directory is gitignored, so this is housekeeping rather than a safety net. Also delete any stray `*.png` / `*.jpg` files that ended up in the project root (`rm -f *.png *.jpg`) — those are **not** ignored and will be picked up by `git add -A`.

```bash
git config core.hooksPath .githooks
```

## Playwright MCP

`.mcp.json` configures the Playwright MCP server (`npx @playwright/mcp@latest`).
With the dev server running (`npm run dev`), Claude Code can navigate to
`http://localhost:3000`, take screenshots, click elements, and inspect the live app.
Screenshots and snapshots are written to `.playwright-mcp/`, which is gitignored.
Restart Claude Code after changing `.mcp.json` for the update to take effect.

`.mcp.json` is in `.gitignore` and must never be committed. Default content:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--output-dir", ".playwright-mcp"]
    }
  }
}
```

> **Screenshots must never be saved to the project root.** The `--output-dir .playwright-mcp` arg above enforces this for auto-saved files. When calling `browser_take_screenshot` with an explicit path, always use a path inside `.playwright-mcp/` (e.g. `.playwright-mcp/my-shot.png`).

## Commands

```bash
npm start          # dev server at http://localhost:4200
npm run dev        # dev server at http://localhost:3000
npm run build      # production build → dist/ng-nordpool/browser/
npm run watch      # incremental dev build (watch mode)
npm test           # all unit tests (vitest via @angular/build:unit-test)
ng test --include="**/app.spec.ts"  # single test file
npx prettier --write .  # format all files
```

There is no linter configured (no ESLint or similar). Prettier config is in `package.json` (`printWidth: 100`, `singleQuote: true`, `angular` HTML parser).

## TypeScript

`tsconfig.json` has `strict: true` plus `noImplicitReturns`, `noPropertyAccessFromIndexSignature`, `noFallthroughCasesInSwitch`, and `noImplicitOverride`. Angular templates use `strictTemplates` and `strictInjectionParameters`. All new code must satisfy these.

## Angular Signals

Component state uses `signal()` / `effect()` rather than `BehaviorSubject`. Exception: `zoomRange` in `PriceChartComponent` is a `BehaviorSubject` so the private `_vm$` combineLatest receives the new value synchronously within event handlers, preventing a flicker render. Cleanup uses `inject(DestroyRef).onDestroy(...)` instead of `ngOnDestroy`. Store observables (`store.select(...)`) are kept as observables for the template `async` pipe; signals are used for purely local UI state (`chartMode`, `theme`, `isFullscreen`, `tooltipData`, etc.). `PriceChartComponent` is an exception — its view model is exposed as a `vm` signal via `toSignal(_vm$)` rather than an async-piped observable. `@ngrx/entity` is installed but not used.

## Environment

The API base URL is configured via `.env` (committed, default values) and `.env.local` (gitignored, local overrides). `scripts/generate-env.js` reads both files plus `process.env` (highest priority) and writes `src/environments/environment.ts` before every build or dev server start. Priority: `process.env` > `.env.local` > `.env`.

`src/environments/environment.ts` is gitignored and generated — never edit it directly. To override the URL locally, create `.env.local` with `NORDPOOL_API_URL=<your-url>`.

`src/environments/build-info.ts` is committed with `BUILD_DATE = '1970-01-01T00:00:00.000Z'` as a default placeholder. The `prebuild` npm script overwrites it with `new Date().toISOString()` before every production build. `DashboardComponent` imports `BUILD_DATE`, formats it to `YYYY.MM.DD HH:mm` in the client's local timezone, and displays it as a two-line label (date / time) inside the hamburger menu.

## Data source

`{nordpoolApiUrl}?date={YYYY-MM-DD}&market=DayAhead&deliveryArea={AREA,...}&currency=NOK`

Free, no API key. Returns 15-minute interval data for all requested areas in one response (`multiAreaEntries`), with prices in `NOK/MWh`. The service maps each 15-min entry directly to `HourlyPrice`, converting `NOK/MWh → øre/kWh` (÷ 10). `time_start`/`time_end` use `localDeliveryStart`/`localDeliveryEnd` (CET/CEST local time, no timezone suffix) — parsed as local time by JS `Date`.

The app covers 15 areas across 7 countries (NO1–NO5, SE1–SE4, DK1/DK2, FI, EE, LT, LV) plus `SYS` — the Nordpool system price, labelled simply **Nordpool** in the UI. Only the areas of the **enabled countries** are requested — the default is Norway alone, and the user adds countries with the flag toggles. `currency=NOK` is requested for the Baltic areas too, so the chart stays directly comparable and the hardcoded "øre/kWh" unit strings remain valid.

**Nordpool publishes more area codes than this app models.** The full list also includes Central Western Europe (`AT`, `BE`, `FR`, `GER`, `NL`, `PL`) and South East Europe (`BG`, `TEL`). The API returns **no data** for any of them through this proxy — verified across multiple dates, `currency=EUR`, `market=N2EX_DayAhead`, and requesting them alone; the response is always HTTP 200 with 96 entries and no key for those zones. They are deliberately not modelled: a country toggle that switches on and draws nothing is worse than no toggle. Re-probe before adding any of them. Note also that `GER` — not `DE-LU` — is the correct German code.

## Architecture

### State (NgRx)

Feature key: `prices`. Single feature slice — no root reducer needed beyond this.

```
src/app/store/prices/
  prices.actions.ts    loadPrices / loadPricesSuccess / loadPricesFailure
                       requestPriceData
                       loadAllAreaPrices{date, areas, at} /
                         loadAllAreaPricesSuccess{date, areas, results} /
                         loadAllAreaPricesFailure
                       detectLocation
                       selectArea / selectDate / setDateRangeDays
                       toggleCountry / setEnabledCountries
                       setNotification / clearNotification
  prices.reducer.ts    initialState: {
                         prices[], allAreaPricesByDate{}, attemptsByDate{}, selectedArea,
                         enabledCountries, selectedDate:today, dateRangeDays:1, loading,
                         allAreasLoadingCount:0, error, notification:null
                       }
                       hydrateCountries() / hydrateArea() validate the localStorage values
                         on startup (both exported for tests, since initialState is computed
                         at import time). An area whose country is disabled is rejected.
                       loadAllAreaPrices records action.areas -> action.at in attemptsByDate.
                       loadAllAreaPricesSuccess MERGES into allAreaPricesByDate[date] —
                         replacing it would wipe the areas fetched for a different country.
                       toggleCountry / setEnabledCountries re-sort into COUNTRIES order,
                         refuse to leave zero countries enabled, and reassign selectedArea
                         when its country is switched off.
                       selectArea auto-enables that area's country.
  prices.effects.ts    loadPrices$ → NordpoolService.getPrices() via switchMap
                       loadAllAreaPrices$ → NordpoolService.getAllAreaPrices(date, areas)
                         via mergeMap; empty results (no areas with data, including when
                         API returns entries with empty entryPerArea) OR HTTP error →
                         loadAllAreaPricesSuccess (results:{}) + setNotification
                         (never sets state.error). A *partial* miss is silent — that area
                         simply has no line, and its attempt record stops the re-request.
                       clearNotificationAfterDelay$ → switchMap + timer(5000) →
                         clearNotification (resets timer on each new notification)
                       planPriceFetches$ → requestPriceData / selectDate /
                         setDateRangeDays / toggleCountry / setEnabledCountries /
                         selectArea → runs planAreaFetches() over the active dates and
                         enabled areas, emitting one loadAllAreaPrices per date that still
                         needs one. The ONLY place loadAllAreaPrices is constructed.
                         Deliberately not keyed on loadAllAreaPricesSuccess — that would
                         close the loop and let it re-plan itself indefinitely.
                       loadPricesAfterCountryToggle$ → toggleCountry /
                         setEnabledCountries → loadPrices for the post-reduction area
                       detectLocation$ → LocationService.detectPriceArea(), then
                         mergeMap → of(selectArea, loadPrices, requestPriceData);
                         catchError → EMPTY (silent fallback, keeps default NO1)
                       persistSelectedArea$ / persistEnabledCountries$ → state-driven
                         (store.select + skip(1) + distinctUntilChanged), writing to
                         localStorage (dispatch: false). State-driven rather than
                         payload-driven because the reducer can correct selectedArea;
                         skip(1) is load-bearing — store.select emits immediately on
                         subscribe, and writing the hydrated default before ngOnInit runs
                         would permanently suppress first-visit geolocation.
                       persistDateRangeDays$ → tap setDateRangeDays, writes to
                         localStorage (dispatch: false)
  prices.selectors.ts  selectAllPrices, selectSelectedArea, selectEnabledCountries,
                       selectEnabledAreas, selectSelectedDate, selectDateRangeDays,
                       selectLoading, selectAllAreasLoading, selectError,
                       selectCurrentPrice, selectCurrentPriceInRange, selectDailyStats,
                       selectRangeStats, selectNotification, selectActiveDates,
                       selectMergedAreaPrices
                       selectEnabledAreas: areasForCountries(enabledCountries), in
                         canonical COUNTRIES order.
                       selectMergedAreaPrices filters by enabled country, so a disabled
                         country's data stays in allAreaPricesByDate and re-enabling it
                         costs no requests.
                       selectCurrentPriceInRange: like selectCurrentPrice but checks
                         allAreaPricesByDate[today][selectedArea] — returns the current
                         slot whenever today falls within the active date range, even
                         when selectedDate is not today (e.g. tomorrow + multi-day)
                       selectRangeStats: min/max/avg across all days in the active date
                         range for the selected area; falls back to state.prices when
                         dateRangeDays ≤ 1. Used by stats-bar.
  fetch-plan.ts        planAreaFetches(state, dates, areas, now) → [{date, areas}] —
                       pure, so it is tested without the store. Skips an area that has
                       data, or that was attempted within ATTEMPT_TTL_MS (15 min); groups
                       by date so each date stays one HTTP request. `now` is a parameter
                       rather than a Date.now() call, keeping the planner deterministic.
src/app/store/index.ts re-exports all of the above
```

### Services

`src/app/services/price-cache.service.ts` — FIFO localStorage cache keyed by `date:area` strings (e.g. `"2026-05-13:NO1"`). Holds up to `16 × PRICE_AREAS.length` entries (currently 256, ~2.2 MB) — a 30-day retention at this area count would approach the typical 5 MB localStorage quota, and 16 days still exceeds one full 14-day range across every area. Inserting an existing key moves it to the back; `load()` trims an oversized persisted array so a shrunk constant converges immediately rather than one entry per write. `setMany()` writes a batch with a single `JSON.stringify`, so a multi-area fetch doesn't re-serialize the whole array once per area. Silently falls back to in-memory if `localStorage` is unavailable (quota exceeded, private browsing).

`src/app/services/nordpool.service.ts` — two methods: `getPrices(date, area)` fetches a single area; `getAllAreaPrices(date, areas)` fetches the given areas in one request. Both check `PriceCacheService` before making an HTTP call and write results back per-area, so a `getAllAreaPrices` hit warms the `getPrices` cache and vice versa. `getAllAreaPrices` partitions the requested areas into cached and uncached and asks the API for **only the uncached subset**, so enabling one more country does not refetch the ones already held. Both map each 15-min `multiAreaEntries` entry directly to a `HourlyPrice` (÷ 10 for NOK/MWh → øre/kWh), yielding up to 96 entries per area with no per-hour averaging. `getAllAreaPrices` only includes an area in the result if `toIntervalPrices` returns a non-empty array — entries where `entryPerArea` is `{}` (prices not yet published) are filtered out, keeping the result `{}` so the effect's no-data check triggers correctly.

`src/app/services/location.service.ts` — `detectPriceArea()` wraps `navigator.geolocation.getCurrentPosition` in an Observable, calls `nominatim.openstreetmap.org/reverse` for the country code, then maps to a `PriceArea`:

- Norway: lat/lon → NO1–NO5 (approximate bidding-zone boundaries)
- Sweden: lat → SE1–SE4; Denmark: lon split at 10° → DK1/DK2
- FI, EE, LT and LV map to their single area
- Any other country → NO1 (including visitors in the unmodelled CWE/SEE zones)

A detected area auto-enables its country, because the `selectArea` reducer handler does.

### Models

`src/app/models/price.model.ts` — `HourlyPrice` (`ore_per_kWh`, `time_start`, `time_end`), `PricesState`, `PriceArea` union (15 areas + `SYS`), `PRICE_AREAS` display list, `AREA_COLORS` record (see the country-hue-family decision below), plus the country model: `CountryCode`, `Country` (`code`, `nameKey`, `areas`), `COUNTRIES` (canonical order; the `SYS` entry carries `isReference: true`), `AREA_COUNTRY`, `areasForCountries()`, `DEFAULT_COUNTRIES` (`['NO']`), and the `isCountryCode` / `isPriceArea` guards. The country model lives here rather than in its own file because `PricesState` needs `CountryCode`, which a separate `country.model.ts` would turn into an import cycle.

### Components

All standalone. No shared module.

```
src/app/components/
  controls/       Custom area dropdown + date <input> with ‹/› prev/next day buttons
                  + Days stepper (1–14, ‹/› buttons + native <select>).
                  Date and Days controls are wrapped in a `.date-range-row` flex
                  container so they always appear on the same row.
                  maxDate is tomorrow (Date.now() + 864e5). stepDate(±1) guards
                  against going past maxDate. Next button disabled at maxDate.
                  Area change → selectArea + loadPrices.
                  Date change → selectDate + loadPrices (loadAllAreaPrices for the
                    full range is handled by the loadMultiDayPrices$ effect).
                  Clearing the date input resets to today: sets currentDate='' then
                    calls ChangeDetectorRef.detectChanges() to flush a CD cycle so
                    Angular's ngModel tracks '' as the current binding value, then
                    sets currentDate=today — the post-event CD sees ''→today and
                    writes to DOM (required in zoneless Angular; setTimeout does not
                    trigger CD without zone.js).
                  Range change → setDateRangeDays (effect handles fetching).
                  The area list is reactive: a subscription on selectEnabledAreas
                    filters PRICE_AREAS down to the enabled countries' areas, so the
                    dropdown can never point at a hidden area. currentAreaLabel looks up
                    the FULL list so the trigger never shows a bare code during the
                    transient between a country toggle and the area correction.
                    .area-select__options has max-height + overflow-y for the 20-entry case.
                  Custom dropdown (.area-select): replaces the native <select> to
                  allow per-option styling. Each option shows its area colour dot;
                  non-selected options at 0.8 opacity, selected at full opacity +
                  font-weight:600. Opens/closes on click; closes on outside click
                  (HostListener document:click) or Escape. Arrow Up/Down on the
                  trigger focuses the first/last option. Options have tabindex=0
                  with Enter/Space to select.
  stats-bar/      Now / Min / Avg / Max cards derived from store selectors.
                  Inputs: includeTax, showStromstotte.
                  "Now" uses selectCurrentPriceInRange so it appears whenever the
                  now-line is visible in the chart (not only when selectedDate === today).
                  Min/Avg/Max use selectRangeStats, which covers all days in the active
                  date range (not just the selected date).
                  effectiveOre() applies the strømstøtte formula (when showStromstotte)
                  and tax factor in sequence, matching the chart's price transform.
  country-toggles/ Row of 7 flag buttons (one per country in COUNTRIES order) plus a
                  SYS chip, adding/removing whole countries. Its own full-width row under the chart
                  header, separated by a border-top, so 12 buttons don't compete with the
                  display toggles for the header row; flex-wrap gives 2–3 rows at 375px.
                  Flags are inline SVG in a shared 24×16 viewBox via a template @switch —
                  emoji flags render as bare letter pairs ("NO", "DK") on Windows, and a
                  template @switch avoids innerHTML and the sanitizer entirely.
                  Inactive = opacity .45 + grayscale(1); active = full colour + accent
                  border. The flag IS the content, so it is desaturated rather than
                  recoloured the way the text toggles are.
                  The last enabled country's button is [disabled], mirroring the reducer
                  guard so the constraint is visible rather than a silent no-op.
                  A "Bare Norge" / "Norway only" reset appears whenever more than Norway
                  is enabled — switching 11 countries off one at a time is tedious.
  price-chart/    Pure SVG chart (no charting lib). Inputs: chartMode, includeTax,
                  showNorgespris, showStromstotte. Selects date range from store for multi-day data.
                  Y scale: both modes snap min to floor-25 and max to ceil-25 of
                    (full-dataset values ± 5 øre buffer). Horizontal grid lines at
                    every 50 øre; vertical day boundary lines in multi-day mode
                    (hidden for single day). Both use stroke: --color-text with
                    vector-effect:non-scaling-stroke so they render at 1 CSS pixel
                    on mobile instead of ~0.25px.
                    Scale is always derived from the complete unsliced dataset so the
                    y-axis stays fixed while zooming.
                  Bar mode: colour-coded bars (low/mid/high by tertile); current
                    hour highlighted. Y scale = single-area snapped min/max (full day).
                  Line mode: step chart — two SVG points per hour (left + right
                    edge at same Y) producing a staircase with a plain <polyline>.
                    One polyline per *visible* area (selectEnabledAreas is a stream of
                    _vm$ and a buildViewModel parameter); selected area renders on top
                    (sorted last). The right-edge area labels run a collision pass —
                    with 16 lines they would otherwise overlap, so labels closer than
                    labelSize × 1.1 to an already-placed one are dropped (showLabel:false).
                    The selected area is resolved first and so always keeps its label.
                    Y scale = global snapped min/max across all areas (full dataset).
                    Uses selectMergedAreaPrices for multi-day data across all areas.
                  Both modes: dashed vertical "now" line shown whenever today falls
                    within the visible date range (single-day: selectedDate === today;
                    multi-day: oldest date ≤ today ≤ selectedDate); hover tooltip;
                    fullscreen toggle; pinch-to-zoom; scroll-to-zoom.
                  Mobile chart height: 38% of viewport height (desktop uses container
                    height in line mode, fixed CHART_H in bar mode).
                  Tax: prices multiplied by 1.25 when includeTax is true (NO4 exempt).
                  Norgespris: dashed reference line at 50 øre/kWh (incl. tax) when
                    showNorgespris is true. Also injected into the tooltip as a
                    TooltipEntry (isNorgespris: true) sorted by price value alongside
                    the other areas (not always at the bottom).
                  Strømstøtte: when showStromstotte is true, all displayed prices are
                    recalculated via applyStromstotte() — prices ≤ 77 øre/kWh excl.
                    VAT are unchanged; prices above are compressed to
                    0.1 × spot + 0.9 × 77 (90% covered). A dashed threshold line is
                    drawn at 77 øre (or 96.25 incl. VAT) using --color-norgespris.
                    The transformation is applied inside displayOre() before the tax
                    factor, affecting bars, line points, y-scale, and tooltip prices.
                    Norgespris and Strømstøtte are independent toggles — both can be
                    active simultaneously.
                  Zoom: slot-range slicing (zoomRange → [startSlot, endSlot]).
                    buildViewModel re-maps the visible window to fill the full chart
                    width; x-labels, now-line, and hourStep adapt to the visible window;
                    y-scale is anchored to the full dataset. A ↺ reset button appears
                    above the chart when zoomed.
                    Pinch-to-zoom: two-finger gesture on mobile. Uses the same
                    floor-based formula as scroll-zoom (centerFrac =
                    (centerSlot - initZs) / initVisible) to keep the slot under
                    the pinch midpoint fixed. Tooltip and hover line are hidden
                    during the gesture.
                    Scroll-to-zoom: mouse wheel / trackpad on desktop. Uses
                    Math.pow(1.003, deltaY) so trackpad (small deltaY) feels smooth
                    and mouse wheel (large deltaY) snaps. Uses floor-based formula
                    (Math.floor(cursorSlot) - Math.floor(cursorFrac * clamped)) to
                    guarantee the slot under the cursor is preserved after each zoom
                    step. Tooltip and hover line are hidden on each wheel event.
                  Scrollbar: shown when zoomed; position:absolute at the bottom of
                    .chart-outer with a surface background and border-top separator,
                    so it never adds height to the card. A chart-outer--zoomed modifier
                    adds matching padding-bottom (20px desktop / 32px mobile) so axis
                    labels are not hidden behind it. touch-action:pan-x on the bar,
                    track, and thumb prevents iOS from intercepting horizontal swipes
                    as app-switcher gestures. Track height 20px on mobile (44px min-width
                    thumb). Thumb drag pans the visible window; track click pages left/right.
                    Entering the scrollbar clears hoveredSlot to hide the tooltip.
                  zoomRange is a BehaviorSubject<[number,number]|null> (not a signal)
                    so the private _vm$ combineLatest receives the new zoom value
                    synchronously within the same event handler, preventing an
                    intermediate render with the old chart state. A toSignal()-derived readonly is exposed
                    for template bindings. ResizeObserver watches .chart-wrapper (not
                    the host) so the scrollbar appearing never triggers a dims() change.
                  X-axis label density adapts to range: 3h / 6h / 12h / 24h steps
                    for 1 / ≤3 / ≤7 / 14-day ranges; further tightened when pinch-
                    zoomed to show 1h or 2h steps for short visible windows.
                    Day label thinning: dayLabelStep = ceil(estimatedDayLabelWidth /
                    svgUnitsPerDay) ensures only every Nth day boundary gets a label
                    so they never overlap — always starting from the first visible day.
                    Hour label suppression: hour labels within minSlotsFromBoundary
                    of any day boundary are hidden (same width estimate); on narrow
                    mobile this suppresses all intra-day hour labels entirely.
                    First day label x-offset: on mobile (yLabelInside) the leftmost
                    day label is clamped to start after the y-axis label area
                    (Math.max(natural x, offsetX + labelSize × 2.5 + 5)) so it
                    never collides with the "0" y-axis label at the bottom-left.
                    First-boundary extended clearance: because the first day label is
                    clamped rightward, hour labels inside that extended region would
                    still collide. minSlotsFromFirstBoundary adds the clamp offset
                    (labelSize × 2.5 + 5) to the normal clearance and is used for
                    bars in the first visible day; subsequent boundaries use the
                    standard minSlotsFromBoundary.
                    Both bar and line modes use the same showDayLabel / showHourLabel
                    fields computed in buildViewModel — no duplicate condition logic
                    in the template.
                  Hover column: semi-transparent fill (0.10 opacity) + a 1px center
                    line (0.30 opacity, vector-effect:non-scaling-stroke) to mark the
                    exact active slot.
                  Tooltip is an HTML div (not SVG) inside .chart-outer, with
                    pointer-events:none so it never blocks SVG mouse events. Closes
                    on both document:click and document:touchstart (iOS Safari does
                    not reliably bubble click from non-interactive elements).
                  Tooltip positioning: flips left when cursor is within 240px of the
                    right edge (rect.width - 240). Mouse: clamps vertically with a
                    half-height of 110px (line) / 35px (bar). Touch: three-state
                    anchor signal — 'above' (default, tooltip above fingertip) or
                    'below' (fallback when touch is within ~264px of the top).
                  Tooltip content: shows date when range > 1 day. Line mode lists all
                    areas + Norgespris (when active) sorted most→least expensive;
                    non-selected rows at 0.8 opacity, selected bold + accent background.
                    Bar mode shows only the selected area and Norgespris (when active).
                    When Strømstøtte is active, all area prices in the tooltip already
                    reflect effective post-support values (no separate tooltip entry).
                  Fullscreen uses CSS position:fixed (not the browser Fullscreen API).
                    dims() computed signal recalculates chartH and viewBox to fill
                    the card. width:auto on .chart-outer--fullscreen is critical —
                    without it the base width:100% overrides the right inset.
                  Scale-aware font sizing: dims() computes labelSize in SVG user
                    units so labels render at ~12px on screen regardless of viewport.
                    Text elements use [attr.font-size] (not CSS font-size).
                    font-family is set explicitly on the <svg> element (not via
                    font-family:inherit on <text>) because SVG does not reliably
                    inherit font-family from HTML parents in all browsers.
                    yLabelInside uses ww <= 640 (the CSS breakpoint), not a
                    labelSize threshold — keeps desktop labels outside the chart
                    and mobile labels inside regardless of the px target.
                    Y-axis <text> labels are rendered in a second @for loop after
                    the chart content (bars/lines) so they paint on top; grid
                    <line> elements stay in the first loop so they appear behind
                    data. Now-line y1 starts at nowLabelY + labelSize*0.4 so the
                    line does not draw through the NÅ label text.
                    When yLabelInside is true (mobile), labels get class
                    axis-label--inside which uses paint-order:stroke fill with a
                    4px (non-scaling) stroke in --color-surface — a per-glyph halo
                    that follows the exact letter outlines rather than a fixed rect.
                    buildYTicks returns { val, y, labelY } — y is the geometrically
                    correct grid-line position; labelY is clamped to
                    max(y, labelSize*0.6) so the top tick's centered text never
                    extends above the SVG viewport (y<0) and gets clipped.
                  Line visibility: vector-effect:non-scaling-stroke keeps stroke
                    widths in screen pixels (without it a 1.5-unit stroke at 1500-wide
                    viewBox renders at ~0.3px on mobile). --line-drop-shadow CSS
                    variable adds a dark drop-shadow in light mode only, giving
                    light-coloured lines contrast against the white background.
  price-table/    Up to 96-row table (one row per 15-min interval). Current
                  interval row highlighted + "Now" badge.
                  Only shown when chartMode === 'bar'.
                  Inputs: includeTax, showStromstotte. Uses the same shared
                  displayOre() from utils/pricing.ts as the chart, so displayed prices
                  always match.

src/app/pages/
  dashboard/      Owns chartMode, includeTax, showNorgespris, showStromstotte signals.
                  Header tagline: dateLabel computed signal formats the selected date
                    (single day) or range (multi-day) using Intl.DateTimeFormat with
                    the active locale (nb-NO / en-GB); reacts to date, range, and
                    language changes. Returns '' for empty/invalid dates.
                  Theme toggle and hamburger menu button are `position:fixed` at
                  top-right (`top:1rem; right:1.5rem; z-index:200`) so they stay
                  pinned regardless of scroll or sticky-header state. The hamburger
                  menu dropdown contains: build timestamp (`YYYY.MM.DD HH:mm`,
                  client timezone, from `BUILD_DATE` in build-info.ts), language
                  toggle, and a "Clear saved data" button that wipes localStorage
                  and reloads. Menu closes on outside click or Escape.
                  Line/Bar, Tax, Norgespris, and Strømstøtte toggles in the header.
                  Norgespris / Strømstøtte are [disabled] when Norway is not among the
                    enabled countries (hasNorway signal) — they are Norwegian schemes, so
                    with NO off they would do nothing. Disabled, not hidden, to avoid a
                    layout jump.
                  Tax is stricter: [disabled] unless Norway is the ONLY enabled entry
                    (norwayOnly signal), and an effect switches includeTax off when that
                    stops being true. VAT applies to Norwegian areas alone, so on a mixed
                    chart it would put VAT-inclusive NO prices on the same axis as raw
                    foreign ones. SYS counts as "other" — it is an unadjusted reference.
                    The title swaps to taxMixedTitle to explain why it is unavailable.
                  All four signals are initialised from localStorage on load and
                  written back via effect() on every change (keys: 'chartMode',
                  'includeTax', 'showNorgespris', 'showStromstotte').
                  Chart controls use flex-wrap so all five buttons remain accessible
                  on narrow mobile viewports without overflow.
                  On init dispatches loadPrices + requestPriceData via
                  combineLatest + first() — the planner effect decides which dates and
                  areas are actually missing. Also dispatches detectLocation if
                  localStorage has no saved area.
                  Loading state: a semi-transparent overlay spinner covers the
                  chart section; stats bar and "All hours" table fade to 40%
                  opacity (pointer-events: none) while loading$ || allAreasLoading$.
                  Toast: fixed-position notification driven by the notification
                  signal (toSignal from selectNotification); auto-dismisses after
                  5 s via clearNotificationAfterDelay$ effect.
```

### Routing

Lazy-loads `DashboardComponent` at `''`. Wildcard redirects to `''`.

### Persistence

`selectedArea` is written to `localStorage` by the `persistSelectedArea$` effect and read back in the reducer's `initialState`. `selectedDate` is written to `localStorage` by the `persistSelectedDate$` effect as `{ date, savedAt }`. On load the reducer reads it back; if the entry is older than 1 hour (or missing/malformed), it resets to today.

`dateRangeDays` is written to `localStorage` by the `persistDateRangeDays$` effect and read back in the reducer's `initialState` (clamped 1–14, defaults to 1 if invalid).

`enabledCountries` is written to `localStorage` by the `persistEnabledCountries$` effect as a JSON array and read back by `hydrateCountries()` in the reducer's `initialState`, which drops unknown codes, dedupes, sorts into `COUNTRIES` order, and falls back to `DEFAULT_COUNTRIES` (`['NO']`) when the result would be empty.

`chartMode`, `includeTax`, `showNorgespris`, and `showStromstotte` are written to `localStorage` by `effect()` calls in `DashboardComponent` and read back on component init.

Price data is cached in `localStorage` via `PriceCacheService` (key `nordpool_price_cache`). Up to `16 × PRICE_AREAS.length` entries are kept (currently 256); `getAllAreaPrices` stores each area individually so a multi-area fetch warms the per-area cache.

`detectLocation` is only dispatched when `localStorage.getItem('selectedArea')` is null (first visit or cleared storage). Once the area is detected and `selectArea` fires, `persistSelectedArea$` writes it to localStorage so detection never runs again.

### Styling

CSS custom properties in `src/styles.scss`. Dark mode default, light mode via `prefers-color-scheme: light`. Variables: `--color-bg`, `--color-surface`, `--color-border`, `--color-text`, `--color-muted`, `--color-accent`, `--color-low`, `--color-high`, `--line-drop-shadow` (dark shadow in light mode, `none` in dark mode).

Date inputs use `color-scheme` set in `src/styles.scss` following the same three-state pattern as the CSS variables (default dark, media-query light, explicit `[data-theme]` overrides) so the browser renders the native calendar icon and text at the correct contrast for each theme.

Theme toggle: `DashboardComponent` holds a `theme` signal (`'dark' | 'light'`) initialised from `window.matchMedia('(prefers-color-scheme: dark)')` on load. An `effect()` writes it to `document.documentElement` as `data-theme`. A `matchMedia` change listener keeps the signal in sync when the OS theme changes while the app is open. CSS uses `:root:not([data-theme='dark'])` in the media query and explicit `:root[data-theme='light']` / `:root[data-theme='dark']` blocks to handle all three states.

### Public assets

Static files in `public/` are served at the root. Current contents:

- `favicon.svg` — SVG emoji favicon (`⚡`), works in all modern browsers
- `apple-touch-icon.png` — 180×180 PNG for iOS home screen shortcuts; generated via canvas with `actualBoundingBox` metrics to visually centre the emoji
- `favicon.ico` — legacy fallback (kept for older browsers)

## Deployment

`.github/workflows/ci.yml` — triggers on every PR to `main`. Runs two parallel jobs:

- `test`: runs `npm test --watch=false` (triggers `pretest` → `generate-env.js` → `environment.ts`)
- `build`: runs `npm run build` (triggers `prebuild` → `generate-env.js` + stamps `build-info.ts`)

Both jobs are required status checks — merging to `main` is blocked until they pass.

`src/test-setup.ts` is loaded via `setupFiles` in `angular.json`. It replaces Angular's
partial localStorage stub with a full in-memory implementation so tests that import modules
reading `localStorage` at load time (e.g. the reducer) work correctly.

`.github/workflows/deploy.yml` — triggers on push to `main` and `workflow_dispatch`.

Build step: `npm run build -- --base-href=/ng-nordpool/` (uses `npm run build` so the `prebuild` script stamps `build-info.ts` with the deploy timestamp before Angular compiles). `NORDPOOL_API_URL` is passed to the build step from a `github-pages` environment secret (the `build` job declares `environment: github-pages` so it can access it) so `generate-env.js` writes the correct URL into `environment.ts`.
Post-build: copies `index.html` → `404.html` for client-side routing on Pages.
Deploys via `actions/upload-pages-artifact` + `actions/deploy-pages`.

Repo must be **public** for GitHub Pages on a free plan.

## Key decisions

- No third-party chart library — SVG rendered directly in the component to keep the bundle small.
- Step chart geometry: two points per hour (left + right edge at same Y) produces correct staircase without any path commands — a plain `<polyline>` is enough.
- Tooltip uses HTML (not SVG foreignObject) for easy styling. Uses `position: fixed` (not `absolute`) so it is never clipped by `overflow: hidden` on `.chart-outer`. Coordinates in `updateTooltip` are therefore viewport-relative (`clientX/clientY`); `relX/relY` are only used for slot detection and the flip threshold. `pointer-events: none` so it never blocks mouse events on the SVG.
- Tooltip flip threshold uses absolute pixels (`rect.width - 240`) rather than a percentage so it accounts for the tooltip's actual width.
- `chartMode` lives in the dashboard signal, not the store — it's purely presentational. It (along with `includeTax`, `showNorgespris`, and `showStromstotte`) is persisted to localStorage via `effect()` in the dashboard so settings survive a reload without polluting NgRx state.
- `loadAllAreaPrices` fires a single API request per date via `getAllAreaPrices(date, areas)` — the proxy accepts a comma-separated `deliveryArea` list so no parallel requests are needed.
- **Fetch bookkeeping records the attempt, not the result.** `getAllAreaPrices` drops areas whose price array is empty, so an area the API has no data for never lands in `allAreaPricesByDate` — a presence-only check would therefore re-request it on every date, range and country change forever. `attemptsByDate` stores a per-area timestamp, and `ATTEMPT_TTL_MS` (15 min) bounds the retry: day-ahead prices publish once a day around 13:00 CET, so a returning user still picks up newly published data while rapid clicking never re-hits the API. Attempts are recorded in the `loadAllAreaPrices` **reducer handler** (the timestamp rides on the action so the reducer stays pure), which also dedupes two triggers landing in the same tick. `attemptsByDate` is deliberately **not** persisted — prices survive in `PriceCacheService`, so a reload always grants a fresh retry.
- **Area colours are country hue families, not a flat hue ramp.** One hue per country with lightness steps inside multi-area countries (SE1–SE4 at 232°, DK1/DK2 at 332°), so a line's country reads from its hue and its area from the shade. 16 areas cannot be separated by hue alone, and the previously commented flat ramp collided with NO5 green and NO1 blue. `SYS` is deliberately outside the scheme — neutral grey, because it is a computed reference price rather than a market. NO1–NO5 keep their established colours — they are the primary audience and the app's recognisable identity.
- VAT, Norgespris and strømstøtte are Norwegian schemes, so `displayOre()` returns foreign areas untouched regardless of the toggles. Consolidating the three duplicated copies into `utils/pricing.ts` made that a one-line change rather than three.
- `currency=NOK` is requested for the euro-zone areas too. The API does the conversion, which keeps every line directly comparable on one axis and keeps the hardcoded "øre/kWh" strings in the tooltip, stats-bar and table correct.
- Price cache is keyed per `date:area`, and `getAllAreaPrices` splits the requested areas into cached and uncached rather than treating the whole set as all-or-nothing. Enabling one country therefore fetches only that country's areas.
- Custom dropdown instead of native `<select>` because `<option>` elements do not support opacity or colour cross-browser.
- Geolocation detection is fire-and-forget: the initial `loadPrices` + `loadAllAreaPrices` dispatch runs immediately with the stored/default area, then if detection succeeds it re-dispatches both for the detected area. No loading gate needed.
- `404.html` copy pattern handles deep-link / refresh on GitHub Pages without hash routing.
- `--base-href` is only needed for the Pages build; local dev works without it.
- NgRx Store Devtools enabled in dev mode — works with the Redux DevTools browser extension.
- Y-scale bounds are snapped to the nearest 25 øre after adding a 5 øre buffer. The snap helpers guarantee the result is strictly outside the buffered value (not equal), so a data max of exactly 220 øre never produces a scale max of 225.
- Zoom uses slot-range slicing (`zoomRange` → `[startSlot, endSlot]`) rather than SVG viewBox manipulation, so the y-axis label column is never clipped. X-labels, now-line, and hourStep adapt to the visible window; y-scale is anchored to the full unsliced dataset so the axis stays fixed while zooming.
- Scroll-to-zoom uses `Math.floor(cursorSlot) - Math.floor(cursorFrac * clamped)` (not `Math.round`) for the new start slot. This provably keeps `floor(slot under cursor)` constant after each zoom step: since `cursorFrac * clamped ∈ [k, k+1)`, the resulting slot position always lands in `[floor(cursorSlot), floor(cursorSlot)+1)`.
- `zoomRange` is a `BehaviorSubject` (not a signal) in `PriceChartComponent` so the private `_vm$` combineLatest receives the new zoom synchronously within the event handler. With a signal, Angular's `toObservable` effect fires after the current CD cycle, causing an intermediate render with the old chart — visible as flicker. The view model is exposed as a `vm` signal via `toSignal(_vm$)`; `_slotCount` and `_totalSlotCount` are `computed()` values derived from it rather than writable signals mutated via `tap`.
- `ResizeObserver` in `PriceChartComponent` watches `.chart-wrapper`, not the host element, so the scrollbar (position:absolute, does not affect flow) never changes `containerH`, never triggers a `dims()` recompute, and never causes a spurious `_vm$` emission.
- Scrollbar: `position:absolute; bottom:0` inside `.chart-outer` so it overlays the card bottom without adding height. `chart-outer--zoomed` adds `padding-bottom` to reserve space for it. `touch-action:pan-x` on all three scrollbar elements (bar/track/thumb) tells iOS these elements own horizontal swipes, suppressing the app-switcher gesture. Desktop: mouse thumb drag + track click pages. Mobile: touch thumb drag + track touchstart pages; track height 20px and min-width 44px for touch targets. `mouseenter` on the scrollbar clears `hoveredSlot` to hide the tooltip.
- Touch tooltip uses a three-state anchor signal (`'above'` / `'below'` / `'center'`) instead of a boolean. On touch the tooltip appears above the fingertip; it flips to below when the touch is within ~264px of the top of the chart.
- `selectCurrentPriceInRange` is used by the stats-bar instead of `selectCurrentPrice` so the "Now" card appears whenever the now-line is visible (today within the active range), not only when `selectedDate === today`.
- `selectRangeStats` is used by the stats-bar for Min/Avg/Max so the values reflect all days in the active date range, not just the selected date.
- Norgespris is injected into `pricesBySlot` as a `TooltipEntry` (`isNorgespris: true`) and sorted by price value alongside the other areas, rather than always appended at the bottom. `TooltipEntry.area` is `string` (not `PriceArea`) to accommodate the `'norgespris'` key.
- Strømstøtte applies as a pre-tax transform inside `displayOre()` rather than a separate pass, so every code path (bars, line points, y-scale min/max, tooltip) automatically uses effective prices with a single flag. The threshold line uses `--color-norgespris` (same red) since both lines are reference overlays of the same visual weight — no separate CSS variable needed.
- Multi-day prices are merged via `selectMergedAreaPrices` (selector concatenates `allAreaPricesByDate` entries for the active range). The store keyed by date avoids re-fetching already-loaded days.
- `loadAllAreaPrices$` treats both HTTP errors and null API responses (HTTP 200 with null body) the same way: dispatch `loadAllAreaPricesSuccess` with empty results + `setNotification`. The Nordpool API returns null for dates outside its ~10-day history window, not a 500.
- `planAreaFetches` replaced `selectLoadedDates`, whose "a date is loaded if _any_ area has data" heuristic became wrong once fetching went per-area: a date loaded while only Norway was enabled would have counted as complete and never picked up a newly enabled country.
- The country invariant lives in the **reducer**, not an effect, so state is never momentarily inconsistent for the synchronous selectors that index by `selectedArea` (`selectRangeStats`, `selectCurrentPriceInRange`, chart bar mode). The reducer refuses to disable the last country and reassigns `selectedArea` to the first area of the first remaining country in `COUNTRIES` order — deterministic, and no geography guessing.
- The chart gets its visible-area set from a **store selector inside `_vm$`**, not a signal input. Inputs reach `_vm$` through `toObservable(input)`, which emits _after_ the current CD cycle — the same flicker mechanism documented for `zoomRange` above — so an input would render one frame with the previous area set.
- `getAllAreaPrices` filters areas with no prices from its result before returning. When the Nordpool API returns `multiAreaEntries` where every `entryPerArea` is `{}` (prices not yet published), the result is `{}` rather than `{ NO1: [], …, NO5: [] }`, so the existing no-data check in the effect fires correctly and the notification is shown.
- `dateLabel` in `DashboardComponent` uses `Intl.DateTimeFormat.formatRange` for multi-day ranges and `format` for single days, with locale derived from the active language signal. Returns `''` for empty/invalid dates to avoid a runtime error when the date input is cleared.
- Clearing the date input in `ControlsComponent` uses `ChangeDetectorRef.detectChanges()` to flush a CD cycle with `currentDate=''` before setting today. This is necessary in zoneless Angular (no zone.js) because `setTimeout` does not trigger change detection — Angular's `ngModel` binding only updates the DOM when it detects a value change from the previous CD run, and without the intermediate flush it sees `today → today` (no change) and leaves the input blank.
- Day label thinning uses `dayLabelStep = ceil(8 × 0.66 × labelSize / svgUnitsPerDay)` — the estimated label width in SVG units divided by the available SVG units per day. The first visible day always gets a label; subsequent ones appear every `dayLabelStep` days. This keeps labels readable at all ranges on all screen sizes without hard-coded breakpoints.
- Hour labels in multi-day mode are suppressed within `minSlotsFromBoundary` slots of any day boundary (same `8 × 0.66 × labelSize` width estimate, converted to slots). On narrow mobile this suppresses all intra-day hour labels; on desktop the clearance is small and hour labels still show normally.
- `minSlotsFromFirstBoundary` extends the clearance for bars in the first visible day by adding the clamp offset (`labelSize × 2.5 + 5`) to the normal estimate. Without this, hour labels (e.g. "12") could fall within the extended footprint of the clamped first-day label and collide with it on 2-day mobile views.
- Grid lines use `stroke: var(--color-text)` at 30% opacity with `vector-effect: non-scaling-stroke`. The original `--color-border` was invisible in dark mode (nearly identical to the surface colour); without `non-scaling-stroke`, the 1-unit stroke is scaled to ~0.25px at the 1500-wide viewBox on mobile — the same reason `.line-path` uses the same property.
- Vertical day boundary lines are rendered from the same `vm.bars` loop (one `<line>` per bar where `isDayBoundary && $index > 0`). `$index > 0` skips the first bar which sits on the y-axis. They are guarded by `@if (vm.showDayLabels)` so they never appear for single-day ranges.
- Y-axis label halo on mobile uses `paint-order: stroke fill` with `vector-effect: non-scaling-stroke` instead of a background `<rect>`. This produces a per-glyph halo that follows exact letter outlines, avoiding the visually distracting fixed-size rectangle that consumed space even for a single-digit "0" label.
