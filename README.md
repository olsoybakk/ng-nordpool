# ng-nordpool

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-live-brightgreen?logo=github)](https://olsoybakk.github.io/ng-nordpool/)
[![Deploy to GitHub Pages](https://github.com/olsoybakk/ng-nordpool/actions/workflows/deploy.yml/badge.svg)](https://github.com/olsoybakk/ng-nordpool/actions/workflows/deploy.yml)
[![CI](https://github.com/olsoybakk/ng-nordpool/actions/workflows/ci.yml/badge.svg)](https://github.com/olsoybakk/ng-nordpool/actions/workflows/ci.yml)

A single-page Angular app for browsing Nordpool electricity spot prices for Norway — today, tomorrow, and historical data. Pick a price area, date and range to see the full price profile in 15-minute intervals, with live highlighting of the current period.

**Live app:** https://olsoybakk.github.io/ng-nordpool/

## Features

- **5 Norwegian price areas** — NO1–NO5, with a custom dropdown showing each area's colour and dimming unselected options
- **Date range selector** — view 1–14 days at once; all areas fetched and merged across the selected range
- **Line chart** — all areas overlaid as a step chart; selected area highlighted
- **Bar chart** — colour-coded low/mid/high by price tertile; current period highlighted
- **Tax toggle** — apply 25% VAT to all prices (NO4 exempt); off by default
- **Norgespris reference line** — dashed line at 50 øre/kWh incl. tax for quick comparison
- **Hover tooltip** — time range (+ date when range > 1 day) + prices for all areas sorted by value (line) or selected area only (bar); Norgespris shown inline when active; flips left/right, appears above fingertip on touch
- **Pinch-to-zoom** — two-finger pinch zooms into a time window; ↺ button resets; page zoom is disabled so the gesture is captured by the chart
- **Stats bar** — current, min, avg and max (øre/kWh); "Now" visible whenever today falls within the selected date range
- **15-minute table** — øre/kWh for all 96 intervals (bar mode, single day only)
- **Persistent settings** — language, chart mode, tax, Norgespris and date range survive page reloads; area is remembered and auto-detected on first visit
- **localStorage cache** — up to 30 full days cached (all areas); switching between dates and ranges is instant
- **Dark/light mode** — follows system preference automatically; toggle button overrides manually
- **NgRx store** — all state managed via actions, reducers, effects and selectors

## Data source

Prices are fetched from a Nordpool proxy API. No API key required. The API returns 15-minute interval data for all areas in a single request, with prices converted from NOK/MWh to øre/kWh.

Configure the API URL in `src/environments/environment.local.ts` (created automatically on first `npm run dev`).

## Development

```bash
npm run dev     # dev server → http://localhost:3000 (auto-creates environment.local.ts)
npm start       # dev server → http://localhost:4200
npm run build   # production build → dist/ng-nordpool/browser/
npm test        # unit tests (Vitest)
```

## Tech stack

|           |                                          |
| --------- | ---------------------------------------- |
| Framework | Angular 21 (standalone components)       |
| State     | NgRx 21 (store, effects, store-devtools) |
| Styling   | SCSS with CSS custom properties          |
| Chart     | Pure SVG — no charting library           |
| Tests     | Vitest via `@angular/build:unit-test`    |
| CI/CD     | GitHub Actions → GitHub Pages            |
