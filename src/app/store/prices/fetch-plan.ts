import { PricesState } from '../../models/price.model';

/**
 * How long a fetch attempt suppresses a retry for the same date.
 *
 * Day-ahead prices publish once a day around 13:00 CET, so 15 minutes is long enough that
 * rapid date-stepping never re-hits the API, yet short enough that a user who leaves the tab
 * open still picks up newly published prices.
 */
export const ATTEMPT_TTL_MS = 15 * 60_000;

/**
 * Works out which dates still need fetching. Each fetch covers every area, so the plan is a
 * plain list of dates — one HTTP request each.
 *
 * A date is fetched when it has no price data *and* has not been attempted within the TTL.
 * The attempt check is what makes this terminate: the service returns `{}` for a date the API
 * has no data for, so a data-only check would re-request it on every date and range change.
 *
 * `now` is a parameter rather than a `Date.now()` call so the planner stays pure and testable.
 */
export function planDateFetches(
  state: Pick<PricesState, 'allAreaPricesByDate' | 'attemptsByDate'>,
  dates: string[],
  now: number,
): string[] {
  return dates.filter((date) => {
    const dayData = state.allAreaPricesByDate[date];
    if (dayData && Object.keys(dayData).length) return false;
    const attemptedAt = state.attemptsByDate[date];
    return attemptedAt === undefined || now - attemptedAt >= ATTEMPT_TTL_MS;
  });
}
