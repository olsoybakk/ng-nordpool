import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PricesState } from '../../models/price.model';

export const selectPricesState = createFeatureSelector<PricesState>('prices');

export const selectAllPrices = createSelector(
  selectPricesState,
  (state) => state.prices
);

export const selectSelectedArea = createSelector(
  selectPricesState,
  (state) => state.selectedArea
);

export const selectSelectedDate = createSelector(
  selectPricesState,
  (state) => state.selectedDate
);

export const selectLoading = createSelector(
  selectPricesState,
  (state) => state.loading
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
  const values = prices.map((p) => p.NOK_per_kWh);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((a, b) => a + b, 0) / values.length,
  };
});
