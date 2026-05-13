import { createFeatureSelector, createSelector } from '@ngrx/store';
import { HourlyPrice, PriceArea, PricesState } from '../../models/price.model';

export const selectPricesState = createFeatureSelector<PricesState>('prices');

export const selectAllPrices = createSelector(
  selectPricesState,
  (state) => state.prices
);

/** All areas for the primary selected date only (backwards compat). */
export const selectAllAreaPrices = createSelector(
  selectPricesState,
  (state) => state.allAreaPricesByDate[state.selectedDate] ?? {}
);

export const selectSelectedArea = createSelector(
  selectPricesState,
  (state) => state.selectedArea
);

export const selectSelectedDate = createSelector(
  selectPricesState,
  (state) => state.selectedDate
);

export const selectDateRangeDays = createSelector(
  selectPricesState,
  (state) => state.dateRangeDays
);

export const selectLoading = createSelector(
  selectPricesState,
  (state) => state.loading
);

export const selectAllAreasLoading = createSelector(
  selectPricesState,
  (state) => state.allAreasLoadingCount > 0
);

export const selectError = createSelector(
  selectPricesState,
  (state) => state.error
);

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

export const selectDailyStats = createSelector(selectAllPrices, (prices) => {
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

export const selectNotification = createSelector(
  selectPricesState,
  (state) => state.notification
);

/** Date strings that have already been fetched and stored. */
export const selectLoadedDates = createSelector(
  selectPricesState,
  (state) => Object.keys(state.allAreaPricesByDate)
);

/** ISO date strings for the active range, oldest first. */
export const selectActiveDates = createSelector(selectPricesState, (state) =>
  Array.from({ length: state.dateRangeDays }, (_, i) =>
    subtractDays(state.selectedDate, state.dateRangeDays - 1 - i)
  )
);

/** All areas with prices concatenated across all dates in the active range, oldest first. */
export const selectMergedAreaPrices = createSelector(selectPricesState, (state) => {
  const dates = Array.from({ length: state.dateRangeDays }, (_, i) =>
    subtractDays(state.selectedDate, state.dateRangeDays - 1 - i)
  );
  const result: Partial<Record<PriceArea, HourlyPrice[]>> = {};
  for (const date of dates) {
    const dayData = state.allAreaPricesByDate[date];
    if (!dayData) continue;
    for (const _area of Object.keys(dayData)) {
      const area = _area as PriceArea;
      const prices = dayData[area];
      if (!prices) continue;
      if (!result[area]) result[area] = [];
      result[area]!.push(...prices);
    }
  }
  return result;
});
