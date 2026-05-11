# ng-nordpool

Angular 21 app that displays Nordpool day-ahead electricity spot prices.

## Links

- **GitHub repo:** https://github.com/olsoybakk/ng-nordpool
- **Live app:** https://olsoybakk.github.io/ng-nordpool/
- **GitHub Actions:** https://github.com/olsoybakk/ng-nordpool/actions

## README badges

```markdown
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-live-brightgreen?logo=github)](https://olsoybakk.github.io/ng-nordpool/)
[![Deploy to GitHub Pages](https://github.com/olsoybakk/ng-nordpool/actions/workflows/deploy.yml/badge.svg)](https://github.com/olsoybakk/ng-nordpool/actions/workflows/deploy.yml)
```

## Commands

```bash
npm start          # dev server at http://localhost:4200
npm run build      # production build → dist/ng-nordpool/browser/
npm test           # unit tests (vitest)
```

## Data source

`https://www.hvakosterstrommen.no/api/v1/prices/{year}/{month}-{day}_{area}.json`

Free, no API key. Returns 24 hourly objects with `NOK_per_kWh`, `EUR_per_kWh`, `EXR`, `time_start`, `time_end`. Supports 20 price areas: NO1–NO5, SE1–SE4, DK1–DK2, FI, EE, LT, LV, AT, BE, DE-LU, FR, NL.

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
                       loadAllAreaPrices$ → forkJoin of all 20 areas via switchMap;
                         each area uses catchError(() => of([])) so one failure
                         doesn't cancel the rest
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

`src/app/services/nordpool.service.ts` — single method `getPrices(date, area)` that builds the URL and calls `HttpClient.get<HourlyPrice[]>`.

`src/app/services/location.service.ts` — `detectPriceArea()` wraps `navigator.geolocation.getCurrentPosition` in an Observable, calls `nominatim.openstreetmap.org/reverse` for the country code, then maps to a `PriceArea`:
- Norway: lat/lon → NO1–NO5 (approximate bidding-zone boundaries)
- Sweden: lat → SE1–SE4
- Denmark: lon < 10° → DK1, else DK2
- FI / EE / LV / LT / AT / BE / DE / LU / FR / NL → direct
- Unknown country → NO1

### Models

`src/app/models/price.model.ts` — `HourlyPrice`, `PricesState`, `PriceArea` union type, `PRICE_AREAS` display list, `AREA_COLORS` record (20 evenly-spaced HSL hues, 18° apart).

### Components

All standalone. No shared module.

```
src/app/components/
  controls/       Area <select> + date <input>.
                  Area change → selectArea + loadPrices.
                  Date change → selectDate + loadPrices + loadAllAreaPrices.
  stats-bar/      Now / Min / Avg / Max cards derived from store selectors.
  price-chart/    Pure SVG chart (no charting lib). Accepts chartMode input signal.
                  Bar mode: colour-coded bars (low/mid/high by tertile); current
                    hour highlighted. Y scale = single-area min/max.
                  Line mode: one polyline per area using AREA_COLORS. Selected area
                    is 2.5px / 100% opacity and gets hour dots; others are 1.2px /
                    70%. Y scale = global min/max across all loaded areas. Zone bands
                    (low/mid/high) drawn as background rects. Selected area sorts
                    last so it renders on top. Area code label at end of each line.
  price-table/    24-row table. Current hour row highlighted + "Now" badge.
                  Only shown when chartMode === 'bar'.

src/app/pages/
  dashboard/      Owns chartMode signal (default: 'line'). Line/Bar toggle in header.
                  On init dispatches loadPrices + loadAllAreaPrices via
                  combineLatest + first(). Also dispatches detectLocation if
                  localStorage has no saved area. Shows allAreasLoading spinner
                  in line mode.
```

### Routing

Lazy-loads `DashboardComponent` at `''`. Wildcard redirects to `''`.

### Persistence

`selectedArea` is written to `localStorage` by the `persistSelectedArea$` effect and read back in the reducer's `initialState`. The selected date always resets to today on load.

`detectLocation` is only dispatched when `localStorage.getItem('selectedArea')` is null (first visit or cleared storage). Once the area is detected and `selectArea` fires, `persistSelectedArea$` writes it to localStorage so detection never runs again.

### Styling

CSS custom properties in `src/styles.scss`. Dark mode default, light mode via `prefers-color-scheme: light`. Variables: `--color-bg`, `--color-surface`, `--color-border`, `--color-text`, `--color-muted`, `--color-accent`, `--color-low`, `--color-high`.

## Deployment

`.github/workflows/deploy.yml` — triggers on push to `main` and `workflow_dispatch`.

Build step: `npx ng build --base-href=/ng-nordpool/`
Post-build: copies `index.html` → `404.html` for client-side routing on Pages.
Deploys via `actions/upload-pages-artifact` + `actions/deploy-pages`.

Repo must be **public** for GitHub Pages on a free plan.

## Key decisions

- No third-party chart library — SVG rendered directly in the component to keep the bundle small.
- `chartMode` lives in the dashboard signal, not the store — it's purely presentational and doesn't need to survive a reload.
- `loadAllAreaPrices` fires 20 parallel HTTP requests; per-area `catchError` means partial data is shown rather than a full failure.
- Geolocation detection is fire-and-forget: the initial `loadPrices` + `loadAllAreaPrices` dispatch runs immediately with the stored/default area, then if detection succeeds it re-dispatches both for the detected area. No loading gate needed.
- `404.html` copy pattern handles deep-link / refresh on GitHub Pages without hash routing.
- `--base-href` is only needed for the Pages build; local dev works without it.
- NgRx Store Devtools enabled in dev mode — works with the Redux DevTools browser extension.
