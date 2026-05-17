import {
  selectDailyStats,
  selectLoadedDates,
  selectMergedAreaPrices,
  selectRangeStats,
} from './prices.selectors';
import { HourlyPrice, PricesState } from '../../models/price.model';

const p = (ore: number): HourlyPrice => ({ ore_per_kWh: ore, time_start: '', time_end: '' });

const base: PricesState = {
  prices: [],
  allAreaPricesByDate: {},
  selectedArea: 'NO1',
  selectedDate: '2026-05-17',
  dateRangeDays: 1,
  loading: false,
  allAreasLoadingCount: 0,
  error: null,
  notification: null,
};

describe('selectDailyStats', () => {
  it('returns null for empty prices', () => {
    expect(selectDailyStats.projector([])).toBeNull();
  });

  it('computes min, max, and avg', () => {
    const result = selectDailyStats.projector([p(100), p(200), p(300)])!;
    expect(result.min).toBe(100);
    expect(result.max).toBe(300);
    expect(result.avg).toBeCloseTo(200);
  });

  it('handles a single price', () => {
    const result = selectDailyStats.projector([p(150)])!;
    expect(result.min).toBe(150);
    expect(result.max).toBe(150);
    expect(result.avg).toBe(150);
  });
});

describe('selectLoadedDates', () => {
  it('returns empty array when no dates are loaded', () => {
    expect(selectLoadedDates.projector(base)).toEqual([]);
  });

  it('excludes dates where all areas returned empty results', () => {
    const state: PricesState = {
      ...base,
      allAreaPricesByDate: { '2026-05-17': {} },
    };
    expect(selectLoadedDates.projector(state)).toEqual([]);
  });

  it('excludes dates where all area arrays are empty', () => {
    const state: PricesState = {
      ...base,
      allAreaPricesByDate: { '2026-05-17': { NO1: [] } },
    };
    expect(selectLoadedDates.projector(state)).toEqual([]);
  });

  it('includes dates that have at least one area with data', () => {
    const state: PricesState = {
      ...base,
      allAreaPricesByDate: {
        '2026-05-16': { NO1: [p(100)] },
        '2026-05-17': {},
      },
    };
    expect(selectLoadedDates.projector(state)).toEqual(['2026-05-16']);
  });
});

describe('selectRangeStats', () => {
  it('returns null when there are no prices', () => {
    expect(selectRangeStats.projector(base)).toBeNull();
  });

  it('uses state.prices for single-day range', () => {
    const state: PricesState = { ...base, prices: [p(100), p(200)], dateRangeDays: 1 };
    const result = selectRangeStats.projector(state)!;
    expect(result.min).toBe(100);
    expect(result.max).toBe(200);
    expect(result.avg).toBe(150);
  });

  it('merges prices across days for multi-day range', () => {
    const state: PricesState = {
      ...base,
      selectedDate: '2026-05-17',
      dateRangeDays: 2,
      allAreaPricesByDate: {
        '2026-05-16': { NO1: [p(100)] },
        '2026-05-17': { NO1: [p(300)] },
      },
    };
    const result = selectRangeStats.projector(state)!;
    expect(result.min).toBe(100);
    expect(result.max).toBe(300);
    expect(result.avg).toBe(200);
  });
});

describe('selectMergedAreaPrices', () => {
  it('returns empty object when no data is loaded', () => {
    expect(selectMergedAreaPrices.projector(base)).toEqual({});
  });

  it('returns prices for a single date', () => {
    const prices = [p(100)];
    const state: PricesState = {
      ...base,
      allAreaPricesByDate: { '2026-05-17': { NO1: prices } },
    };
    expect(selectMergedAreaPrices.projector(state)['NO1']).toEqual(prices);
  });

  it('concatenates prices across multiple dates in chronological order', () => {
    const p1 = p(100);
    const p2 = p(200);
    const state: PricesState = {
      ...base,
      selectedDate: '2026-05-17',
      dateRangeDays: 2,
      allAreaPricesByDate: {
        '2026-05-16': { NO1: [p1] },
        '2026-05-17': { NO1: [p2] },
      },
    };
    expect(selectMergedAreaPrices.projector(state)['NO1']).toEqual([p1, p2]);
  });
});
