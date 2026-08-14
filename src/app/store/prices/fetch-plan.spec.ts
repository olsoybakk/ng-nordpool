import { ATTEMPT_TTL_MS, planAreaFetches } from './fetch-plan';
import { HourlyPrice, PriceArea, PricesState } from '../../models/price.model';

const NOW = 1_760_000_000_000;

function prices(): HourlyPrice[] {
  return [{ ore_per_kWh: 42, time_start: '2026-05-16T00:00:00', time_end: '2026-05-16T00:15:00' }];
}

function state(
  allAreaPricesByDate: PricesState['allAreaPricesByDate'] = {},
  attemptsByDate: PricesState['attemptsByDate'] = {},
): Pick<PricesState, 'allAreaPricesByDate' | 'attemptsByDate'> {
  return { allAreaPricesByDate, attemptsByDate };
}

describe('planAreaFetches', () => {
  it('includes an area that has never been attempted', () => {
    expect(planAreaFetches(state(), ['2026-05-16'], ['NO1'], NOW)).toEqual([
      { date: '2026-05-16', areas: ['NO1'] },
    ]);
  });

  it('skips an area that already has price data', () => {
    const s = state({ '2026-05-16': { NO1: prices() } });
    expect(planAreaFetches(s, ['2026-05-16'], ['NO1'], NOW)).toEqual([]);
  });

  it('skips an area attempted but returning no data, while the TTL holds', () => {
    // The regression case: the service never stores an empty area, so without the attempt
    // record this area would be re-requested on every single user interaction.
    const s = state({ '2026-05-16': {} }, { '2026-05-16': { DK1: NOW - 60_000 } });
    expect(planAreaFetches(s, ['2026-05-16'], ['DK1'], NOW)).toEqual([]);
  });

  it('retries an attempted-but-empty area once the TTL has expired', () => {
    const s = state({ '2026-05-16': {} }, { '2026-05-16': { DK1: NOW - ATTEMPT_TTL_MS } });
    expect(planAreaFetches(s, ['2026-05-16'], ['DK1'], NOW)).toEqual([
      { date: '2026-05-16', areas: ['DK1'] },
    ]);
  });

  it('requests only the missing areas for a date, as one grouped entry', () => {
    const s = state(
      { '2026-05-16': { NO1: prices(), NO2: prices() } },
      { '2026-05-16': { NO3: NOW - 1000 } },
    );
    const areas: PriceArea[] = ['NO1', 'NO2', 'NO3', 'NO4', 'NO5'];
    expect(planAreaFetches(s, ['2026-05-16'], areas, NOW)).toEqual([
      { date: '2026-05-16', areas: ['NO4', 'NO5'] },
    ]);
  });

  it('returns one entry per date and omits fully covered dates', () => {
    const s = state({ '2026-05-15': { NO1: prices() } });
    expect(planAreaFetches(s, ['2026-05-15', '2026-05-16'], ['NO1'], NOW)).toEqual([
      { date: '2026-05-16', areas: ['NO1'] },
    ]);
  });

  it('returns an empty plan when everything is covered', () => {
    const s = state({ '2026-05-16': { NO1: prices(), NO2: prices() } });
    expect(planAreaFetches(s, ['2026-05-16'], ['NO1', 'NO2'], NOW)).toEqual([]);
  });

  it('requests only a newly enabled country across every active date', () => {
    // Norway already loaded for both dates; enabling Denmark must not refetch NO.
    const s = state({
      '2026-05-15': { NO1: prices() },
      '2026-05-16': { NO1: prices() },
    });
    const plan = planAreaFetches(s, ['2026-05-15', '2026-05-16'], ['NO1', 'DK1', 'DK2'], NOW);
    expect(plan).toEqual([
      { date: '2026-05-15', areas: ['DK1', 'DK2'] },
      { date: '2026-05-16', areas: ['DK1', 'DK2'] },
    ]);
  });

  it('treats an area stored as an empty array as missing', () => {
    const s = state({ '2026-05-16': { NO1: [] } });
    expect(planAreaFetches(s, ['2026-05-16'], ['NO1'], NOW)).toEqual([
      { date: '2026-05-16', areas: ['NO1'] },
    ]);
  });
});
