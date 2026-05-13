# ng-nordpool

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-live-brightgreen?logo=github)](https://olsoybakk.github.io/ng-nordpool/)
[![Deploy to GitHub Pages](https://github.com/olsoybakk/ng-nordpool/actions/workflows/deploy.yml/badge.svg)](https://github.com/olsoybakk/ng-nordpool/actions/workflows/deploy.yml)

A single-page Angular app for browsing Nordpool day-ahead electricity spot prices for Norway. Pick a price area and date to see the full 24-hour price profile in 15-minute intervals, with live highlighting of the current period.

**Live app:** https://olsoybakk.github.io/ng-nordpool/

## Features

- **5 Norwegian price areas** — NO1–NO5, with a custom dropdown showing each area's colour and dimming unselected options
- **Line chart** — all areas overlaid as a step chart; selected area highlighted
- **Bar chart** — colour-coded low/mid/high by price tertile; current period highlighted
- **Hover tooltip** — time range + prices for all areas (line) or selected area only (bar); flips left/right and clamps vertically to stay within the chart
- **Stats bar** — current, min, avg and max for the selected day (øre/kWh)
- **15-minute table** — øre/kWh for all 96 intervals (bar mode)
- **localStorage cache** — last 30 date × area combinations cached so switching between dates is instant
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

| | |
|---|---|
| Framework | Angular 21 (standalone components) |
| State | NgRx 21 (store, effects, store-devtools) |
| Styling | SCSS with CSS custom properties |
| Chart | Pure SVG — no charting library |
| CI/CD | GitHub Actions → GitHub Pages |
