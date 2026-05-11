# ng-nordpool

Angular 21 app that displays Nordpool day-ahead electricity spot prices.

## Links

- **GitHub repo:** https://github.com/olsoybakk/ng-nordpool
- **Live app:** https://olsoybakk.github.io/ng-nordpool/
- **GitHub Actions:** https://github.com/olsoybakk/ng-nordpool/actions

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
                       selectArea / selectDate
  prices.reducer.ts    initialState: { prices[], selectedArea:'NO1', selectedDate:today, loading, error }
  prices.effects.ts    loadPrices$ → NordpoolService.getPrices() via switchMap
  prices.selectors.ts  selectAllPrices, selectSelectedArea, selectSelectedDate,
                       selectLoading, selectError, selectCurrentPrice, selectDailyStats
src/app/store/index.ts re-exports all of the above
```

### Service

`src/app/services/nordpool.service.ts` — single method `getPrices(date, area)` that builds the URL and calls `HttpClient.get<HourlyPrice[]>`.

### Models

`src/app/models/price.model.ts` — `HourlyPrice`, `PricesState`, `PriceArea` union type, `PRICE_AREAS` display list.

### Components

All standalone. No shared module.

```
src/app/components/
  controls/       Area <select> + date <input>. Dispatches selectArea + selectDate + loadPrices on change.
  stats-bar/      Now / Min / Avg / Max cards derived from store selectors.
  price-chart/    Pure SVG bar chart (no charting lib). Bars coloured low/mid/high by tertile.
                  Current hour bar gets a highlight stroke. Y-axis ticks built dynamically.
  price-table/    24-row table. Current hour row highlighted + "Now" badge.

src/app/pages/
  dashboard/      Composes all four components. Dispatches initial loadPrices on OnInit
                  using combineLatest + first() to avoid subscribe-in-subscribe.
```

### Routing

Lazy-loads `DashboardComponent` at `''`. Wildcard redirects to `''`.

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
- `404.html` copy pattern handles deep-link / refresh on GitHub Pages without hash routing.
- `--base-href` is only needed for the Pages build; local dev works without it.
- NgRx Store Devtools enabled in dev mode — works with the Redux DevTools browser extension.
