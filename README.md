# ng-nordpool

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-live-brightgreen?logo=github)](https://olsoybakk.github.io/ng-nordpool/)
[![Deploy to GitHub Pages](https://github.com/olsoybakk/ng-nordpool/actions/workflows/deploy.yml/badge.svg)](https://github.com/olsoybakk/ng-nordpool/actions/workflows/deploy.yml)

A single-page Angular app for browsing Nordpool day-ahead electricity spot prices for Norway. Pick a price area and date to see the full 24-hour price profile, with live highlighting of the current hour.

## Features

- **5 Norwegian price areas** — NO1–NO5
- **Line chart** — all areas overlaid as a step chart; selected area highlighted
- **Bar chart** — colour-coded low/mid/high by price tertile; current hour highlighted
- **Stats bar** — current, min, avg and max for the selected day
- **Hourly table** — NOK/kWh, EUR/kWh and exchange rate for all 24 hours (bar mode)
- **Dark/light mode** — follows system preference automatically; toggle button overrides manually
- **NgRx store** — all state managed via actions, reducers, effects and selectors

## Data source

Prices are fetched from [hvakosterstrommen.no](https://www.hvakosterstrommen.no/api), a free public API that republishes Nordpool spot data. No API key required.

## Development

```bash
npm start       # dev server → http://localhost:4200
npm run dev     # dev server → http://localhost:3000
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
