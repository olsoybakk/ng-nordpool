import { createFeatureSelector, createSelector } from '@ngrx/store';
import {
  AREA_COUNTRY,
  areasForCountries,
  HourlyPrice,
  PriceArea,
  PricesState,
} from '../../models/price.model';
import { localISODate } from '../../utils/date';

export const selectPricesState = createFeatureSelector<PricesState>('prices');

export const selectAllPrices = createSelector(selectPricesState, (state) => state.prices);

export const selectSelectedArea = createSelector(selectPricesState, (state) => state.selectedArea);

export const selectEnabledCountries = createSelector(
  selectPricesState,
  (state) => state.enabledCountries,
);

/** Areas of the enabled countries, in canonical COUNTRIES order. */
export const selectEnabledAreas = createSelector(selectEnabledCountries, (countries) =>
  areasForCountries(countries),
);

export const selectSelectedDate = createSelector(selectPricesState, (state) => state.selectedDate);

export const selectDateRangeDays = createSelector(
  selectPricesState,
  (state) => state.dateRangeDays,
);

export const selectLoading = createSelector(selectPricesState, (state) => state.loading);

export const selectAllAreasLoading = createSelector(
  selectPricesState,
  (state) => state.allAreasLoadingCount > 0,
);

export const selectError = createSelector(selectPricesState, (state) => state.error);

export const selectCurrentPrice = createSelector(selectAllPrices, (prices) => {
  const now = new Date();
  return (
    prices.find((p) => {
      const start = new Date(p.time_start);
      const end = new Date(p.time_end);
      return now >= start && now < end;
    }) ?? null
  );
});

/**
 * Current price for the selected area whenever today falls within the active date range —
 * works even when selectedDate is not today (e.g. tomorrow selected, multi-day range
 * includes today). Used by the stats-bar so the "Now" card appears whenever the "now"
 * marker is visible in the chart.
 */
export const selectCurrentPriceInRange = createSelector(selectPricesState, (state) => {
  const now = new Date();
  const todayISO = localISODate(now);
  const { selectedDate, dateRangeDays, selectedArea } = state;
  const oldestDate = subtractDays(selectedDate, dateRangeDays - 1);
  if (todayISO < oldestDate || todayISO > selectedDate) return null;

  const todayPrices =
    state.allAreaPricesByDate[todayISO]?.[selectedArea] ??
    (selectedDate === todayISO ? state.prices : []);

  return (
    todayPrices.find((p) => {
      const start = new Date(p.time_start);
      const end = new Date(p.time_end);
      return now >= start && now < end;
    }) ?? null
  );
});

export const selectDailyStats = createSelector(selectAllPrices, (prices) => {
  if (!prices.length) return null;
  const values = prices.map((p) => p.ore_per_kWh);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((a, b) => a + b, 0) / values.length,
  };
});

/** Min/max/avg across all days in the active date range for the selected area. */
export const selectRangeStats = createSelector(selectPricesState, (state) => {
  const { selectedDate, dateRangeDays, selectedArea } = state;
  let prices: HourlyPrice[];
  if (dateRangeDays <= 1) {
    prices = state.prices;
  } else {
    const dates = Array.from({ length: dateRangeDays }, (_, i) =>
      subtractDays(selectedDate, dateRangeDays - 1 - i),
    );
    prices = [];
    for (const date of dates) {
      const dayPrices = state.allAreaPricesByDate[date]?.[selectedArea];
      if (dayPrices) prices.push(...dayPrices);
    }
  }
  if (!prices.length) return null;
  const values = prices.map((p) => p.ore_per_kWh);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((a, b) => a + b, 0) / values.length,
  };
});

function subtractDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T12:00:00');
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export const selectNotification = createSelector(selectPricesState, (state) => state.notification);

/** ISO date strings for the active range, oldest first. */
export const selectActiveDates = createSelector(selectPricesState, (state) =>
  Array.from({ length: state.dateRangeDays }, (_, i) =>
    subtractDays(state.selectedDate, state.dateRangeDays - 1 - i),
  ),
);

/**
 * Areas of the *enabled* countries with prices concatenated across the active date range,
 * oldest first. Filtering here rather than only in the chart keeps every consumer consistent and
 * lets a disabled country's data stay in the store, so re-enabling it costs no requests.
 */
export const selectMergedAreaPrices = createSelector(selectPricesState, (state) => {
  const dates = Array.from({ length: state.dateRangeDays }, (_, i) =>
    subtractDays(state.selectedDate, state.dateRangeDays - 1 - i),
  );
  const enabled = new Set(state.enabledCountries);
  const result: Partial<Record<PriceArea, HourlyPrice[]>> = {};
  for (const date of dates) {
    const dayData = state.allAreaPricesByDate[date];
    if (!dayData) continue;
    for (const _area of Object.keys(dayData)) {
      const area = _area as PriceArea;
      const prices = dayData[area];
      if (!prices?.length) continue;
      if (!enabled.has(AREA_COUNTRY[area])) continue;
      if (!result[area]) result[area] = [];
      result[area]!.push(...prices);
    }
  }
  return result;
});
