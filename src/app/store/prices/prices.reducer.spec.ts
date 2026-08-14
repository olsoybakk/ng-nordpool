import { pricesReducer, initialState, hydrateCountries, hydrateArea } from './prices.reducer';
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
  enabledCountries: ['NO'],
  selectedDate: '2026-05-17',
  dateRangeDays: 1,
};

const AT = 1_760_000_000_000;

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
        PricesActions.loadAllAreaPrices({ date: '2026-05-17', areas: ['NO1'], at: AT }),
      );
      expect(state.allAreasLoadingCount).toBe(1);
    });

    it('records an attempt timestamp for every requested area', () => {
      const state = pricesReducer(
        clean,
        PricesActions.loadAllAreaPrices({ date: '2026-05-17', areas: ['DK1', 'DK2'], at: AT }),
      );
      expect(state.attemptsByDate['2026-05-17']).toEqual({ DK1: AT, DK2: AT });
    });

    it('merges attempts with those already recorded for the date', () => {
      const state = pricesReducer(
        { ...clean, attemptsByDate: { '2026-05-17': { NO1: 1 } } },
        PricesActions.loadAllAreaPrices({ date: '2026-05-17', areas: ['DK1'], at: AT }),
      );
      expect(state.attemptsByDate['2026-05-17']).toEqual({ NO1: 1, DK1: AT });
    });
  });

  describe('loadAllAreaPricesSuccess', () => {
    it('stores results and decrements count', () => {
      const prices = [price(50)];
      const state = pricesReducer(
        { ...clean, allAreasLoadingCount: 1 },
        PricesActions.loadAllAreaPricesSuccess({
          date: '2026-05-17',
          areas: ['NO1'],
          results: { NO1: prices },
        }),
      );
      expect(state.allAreasLoadingCount).toBe(0);
      expect(state.allAreaPricesByDate['2026-05-17']['NO1']).toEqual(prices);
    });

    it('merges into the date rather than replacing it', () => {
      // Fetches are area-scoped, so enabling Denmark must not wipe the Norwegian data.
      const no = [price(50)];
      const dk = [price(70)];
      const state = pricesReducer(
        { ...clean, allAreaPricesByDate: { '2026-05-17': { NO1: no } } },
        PricesActions.loadAllAreaPricesSuccess({
          date: '2026-05-17',
          areas: ['DK1'],
          results: { DK1: dk },
        }),
      );
      expect(state.allAreaPricesByDate['2026-05-17']).toEqual({ NO1: no, DK1: dk });
    });

    it('does not decrement allAreasLoadingCount below 0', () => {
      const state = pricesReducer(
        { ...clean, allAreasLoadingCount: 0 },
        PricesActions.loadAllAreaPricesSuccess({
          date: '2026-05-17',
          areas: ['NO1'],
          results: {},
        }),
      );
      expect(state.allAreasLoadingCount).toBe(0);
    });
  });

  describe('selectArea', () => {
    it('updates selectedArea', () => {
      const state = pricesReducer(clean, PricesActions.selectArea({ area: 'NO3' }));
      expect(state.selectedArea).toBe('NO3');
    });

    it('auto-enables the area’s country', () => {
      const state = pricesReducer(clean, PricesActions.selectArea({ area: 'SE2' }));
      expect(state.selectedArea).toBe('SE2');
      expect(state.enabledCountries).toEqual(['NO', 'SE']);
    });

    it('leaves enabledCountries untouched when the country is already on', () => {
      const before = clean.enabledCountries;
      const state = pricesReducer(clean, PricesActions.selectArea({ area: 'NO3' }));
      expect(state.enabledCountries).toBe(before);
    });
  });

  describe('toggleCountry', () => {
    it('adds a country in canonical order, not click order', () => {
      let state = pricesReducer(clean, PricesActions.toggleCountry({ code: 'FI' }));
      state = pricesReducer(state, PricesActions.toggleCountry({ code: 'DK' }));
      expect(state.enabledCountries).toEqual(['NO', 'DK', 'FI']);
    });

    it('removes an enabled country', () => {
      const state = pricesReducer(
        { ...clean, enabledCountries: ['NO', 'DK'] },
        PricesActions.toggleCountry({ code: 'DK' }),
      );
      expect(state.enabledCountries).toEqual(['NO']);
    });

    it('refuses to remove the last remaining country', () => {
      const state = pricesReducer(clean, PricesActions.toggleCountry({ code: 'NO' }));
      expect(state).toBe(clean);
    });

    it('reassigns selectedArea when its country is switched off', () => {
      const state = pricesReducer(
        { ...clean, enabledCountries: ['NO', 'DK'], selectedArea: 'DK1' },
        PricesActions.toggleCountry({ code: 'DK' }),
      );
      expect(state.enabledCountries).toEqual(['NO']);
      expect(state.selectedArea).toBe('NO1');
    });

    it('leaves selectedArea alone when its country stays enabled', () => {
      const state = pricesReducer(
        { ...clean, enabledCountries: ['NO', 'DK'], selectedArea: 'NO3' },
        PricesActions.toggleCountry({ code: 'DK' }),
      );
      expect(state.selectedArea).toBe('NO3');
    });

    it('picks the first area of the first remaining country', () => {
      const state = pricesReducer(
        { ...clean, enabledCountries: ['DK', 'SE'], selectedArea: 'DK2' },
        PricesActions.toggleCountry({ code: 'DK' }),
      );
      expect(state.enabledCountries).toEqual(['SE']);
      expect(state.selectedArea).toBe('SE1');
    });
  });

  describe('setEnabledCountries', () => {
    it('sorts into canonical order', () => {
      const state = pricesReducer(
        clean,
        PricesActions.setEnabledCountries({ codes: ['NL', 'DK', 'NO'] }),
      );
      expect(state.enabledCountries).toEqual(['NO', 'DK', 'NL']);
    });

    it('ignores an empty list', () => {
      const state = pricesReducer(clean, PricesActions.setEnabledCountries({ codes: [] }));
      expect(state).toBe(clean);
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

describe('hydrateCountries', () => {
  it('defaults to Norway when nothing is stored', () => {
    expect(hydrateCountries(null)).toEqual(['NO']);
  });

  it('defaults to Norway on malformed JSON', () => {
    expect(hydrateCountries('not json')).toEqual(['NO']);
  });

  it('defaults to Norway when the stored value is not an array', () => {
    expect(hydrateCountries('{"a":1}')).toEqual(['NO']);
  });

  it('defaults to Norway for an empty array', () => {
    expect(hydrateCountries('[]')).toEqual(['NO']);
  });

  it('drops unknown codes and sorts into canonical order', () => {
    expect(hydrateCountries('["NL","XX","NO"]')).toEqual(['NO', 'NL']);
  });

  it('deduplicates repeated codes', () => {
    expect(hydrateCountries('["DK","DK"]')).toEqual(['DK']);
  });

  it('falls back to Norway when every stored code is invalid', () => {
    expect(hydrateCountries('["XX","YY"]')).toEqual(['NO']);
  });
});

describe('hydrateArea', () => {
  it('keeps a stored area whose country is enabled', () => {
    expect(hydrateArea('NO3', ['NO'])).toBe('NO3');
  });

  it('falls back when the stored area belongs to a disabled country', () => {
    expect(hydrateArea('DK1', ['NO'])).toBe('NO1');
  });

  it('falls back for an unknown area', () => {
    expect(hydrateArea('ZZ9', ['NO'])).toBe('NO1');
  });

  it('falls back for a missing value', () => {
    expect(hydrateArea(null, ['SE'])).toBe('SE1');
  });

  it('uses the first area of the first enabled country in canonical order', () => {
    // Canonical COUNTRIES order is NO, SE, DK, … — not the order the codes were given in.
    expect(hydrateArea('NO1', ['DK', 'SE'])).toBe('SE1');
  });
});
