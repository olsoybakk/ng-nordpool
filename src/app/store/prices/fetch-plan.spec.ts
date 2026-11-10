import { ATTEMPT_TTL_MS, planDateFetches } from './fetch-plan';
import { HourlyPrice, PricesState } from '../../models/price.model';

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

describe('planDateFetches', () => {
  it('includes a date that has never been attempted', () => {
    expect(planDateFetches(state(), ['2026-05-16'], NOW)).toEqual(['2026-05-16']);
  });

  it('skips a date that already has price data', () => {
    const s = state({ '2026-05-16': { NO1: prices() } });
    expect(planDateFetches(s, ['2026-05-16'], NOW)).toEqual([]);
  });

  it('skips a date attempted but returning no data, while the TTL holds', () => {
    // The regression case: an empty day carries no data, so without the attempt record it
    // would be re-requested on every single user interaction.
    const s = state({ '2026-05-16': {} }, { '2026-05-16': NOW - 60_000 });
    expect(planDateFetches(s, ['2026-05-16'], NOW)).toEqual([]);
  });

  it('retries an attempted-but-empty date once the TTL has expired', () => {
    const s = state({ '2026-05-16': {} }, { '2026-05-16': NOW - ATTEMPT_TTL_MS });
    expect(planDateFetches(s, ['2026-05-16'], NOW)).toEqual(['2026-05-16']);
  });

  it('skips an in-flight date that has no data yet', () => {
    const s = state({}, { '2026-05-16': NOW - 1000 });
    expect(planDateFetches(s, ['2026-05-16'], NOW)).toEqual([]);
  });

  it('returns only the missing dates of a range, in order', () => {
    const s = state({ '2026-05-15': { NO1: prices() } });
    expect(planDateFetches(s, ['2026-05-16', '2026-05-15', '2026-05-14'], NOW)).toEqual([
      '2026-05-16',
      '2026-05-14',
    ]);
  });
});
