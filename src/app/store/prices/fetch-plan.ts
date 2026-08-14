import { PriceArea, PricesState } from '../../models/price.model';

/**
 * How long a fetch attempt suppresses a retry for the same date+area.
 *
 * Day-ahead prices publish once a day around 13:00 CET, so 15 minutes is long enough that
 * rapid date-stepping or flag-toggling never re-hits the API, yet short enough that a user
 * who leaves the tab open still picks up newly published prices.
 */
export const ATTEMPT_TTL_MS = 15 * 60_000;

export interface AreaFetch {
  date: string;
  areas: PriceArea[];
}

/**
 * Works out which date+area combinations still need fetching, grouped so each date remains a
 * single HTTP request.
 *
 * An area is fetched when it has no price data *and* has not been attempted within the TTL.
 * The attempt check is what makes this terminate: the service drops areas the API returned no
 * data for, so those never appear in `allAreaPricesByDate` and a data-only check would
 * re-request them on every date, range and country change forever.
 *
 * `now` is a parameter rather than a `Date.now()` call so the planner stays pure and testable.
 */
export function planAreaFetches(
  state: Pick<PricesState, 'allAreaPricesByDate' | 'attemptsByDate'>,
  dates: string[],
  areas: PriceArea[],
  now: number,
): AreaFetch[] {
  const plan: AreaFetch[] = [];

  for (const date of dates) {
    const dayData = state.allAreaPricesByDate[date];
    const dayAttempts = state.attemptsByDate[date];

    const missing = areas.filter((area) => {
      if (dayData?.[area]?.length) return false;
      const attemptedAt = dayAttempts?.[area];
      return attemptedAt === undefined || now - attemptedAt >= ATTEMPT_TTL_MS;
    });

    if (missing.length) plan.push({ date, areas: missing });
  }

  return plan;
}
