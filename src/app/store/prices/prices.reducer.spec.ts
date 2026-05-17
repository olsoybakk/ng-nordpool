import { pricesReducer, initialState } from './prices.reducer';
import * as PricesActions from './prices.actions';
import { HourlyPrice, PricesState } from '../../models/price.model';

const price = (ore: number): HourlyPrice => ({
  ore_per_kWh: ore,
  time_start: '2026-05-17T00:00:00',
  time_end: '2026-05-17T00:15:00',
});

const clean: PricesState = {
  ...initialState,
  selectedArea: 'NO1',
  selectedDate: '2026-05-17',
  dateRangeDays: 1,
};

describe('pricesReducer', () => {
  it('returns initial state for unknown action', () => {
    const state = pricesReducer(undefined, { type: '@@INIT' } as never);
    expect(state).toEqual(initialState);
  });

  describe('loadPrices', () => {
    it('sets loading and clears error', () => {
      const state = pricesReducer(
        { ...clean, error: 'previous error' },
        PricesActions.loadPrices({ area: 'NO1', date: '2026-05-17' }),
      );
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('loadPricesSuccess', () => {
    it('stores prices and clears loading', () => {
      const prices = [price(100), price(200)];
      const state = pricesReducer(
        { ...clean, loading: true },
        PricesActions.loadPricesSuccess({ prices }),
      );
      expect(state.loading).toBe(false);
      expect(state.prices).toEqual(prices);
    });
  });

  describe('loadPricesFailure', () => {
    it('sets error and clears loading', () => {
      const state = pricesReducer(
        { ...clean, loading: true },
        PricesActions.loadPricesFailure({ error: 'Network error' }),
      );
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });
  });

  describe('loadAllAreaPrices', () => {
    it('increments allAreasLoadingCount', () => {
      const state = pricesReducer(
        clean,
        PricesActions.loadAllAreaPrices({ date: '2026-05-17' }),
      );
      expect(state.allAreasLoadingCount).toBe(1);
    });
  });

  describe('loadAllAreaPricesSuccess', () => {
    it('stores results and decrements count', () => {
      const prices = [price(50)];
      const state = pricesReducer(
        { ...clean, allAreasLoadingCount: 1 },
        PricesActions.loadAllAreaPricesSuccess({
          date: '2026-05-17',
          results: { NO1: prices },
        }),
      );
      expect(state.allAreasLoadingCount).toBe(0);
      expect(state.allAreaPricesByDate['2026-05-17']['NO1']).toEqual(prices);
    });

    it('does not decrement allAreasLoadingCount below 0', () => {
      const state = pricesReducer(
        { ...clean, allAreasLoadingCount: 0 },
        PricesActions.loadAllAreaPricesSuccess({ date: '2026-05-17', results: {} }),
      );
      expect(state.allAreasLoadingCount).toBe(0);
    });
  });

  describe('selectArea', () => {
    it('updates selectedArea', () => {
      const state = pricesReducer(clean, PricesActions.selectArea({ area: 'NO3' }));
      expect(state.selectedArea).toBe('NO3');
    });
  });

  describe('selectDate', () => {
    it('updates selectedDate', () => {
      const state = pricesReducer(clean, PricesActions.selectDate({ date: '2026-05-10' }));
      expect(state.selectedDate).toBe('2026-05-10');
    });
  });

  describe('setDateRangeDays', () => {
    it('updates dateRangeDays', () => {
      const state = pricesReducer(clean, PricesActions.setDateRangeDays({ days: 7 }));
      expect(state.dateRangeDays).toBe(7);
    });
  });

  describe('setNotification / clearNotification', () => {
    it('sets notification message', () => {
      const state = pricesReducer(clean, PricesActions.setNotification({ message: 'No data' }));
      expect(state.notification).toBe('No data');
    });

    it('clears notification message', () => {
      const state = pricesReducer(
        { ...clean, notification: 'No data' },
        PricesActions.clearNotification(),
      );
      expect(state.notification).toBeNull();
    });
  });
});
