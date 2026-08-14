import { createReducer, on } from '@ngrx/store';
import {
  AREA_COUNTRY,
  areasForCountries,
  COUNTRIES,
  CountryCode,
  DEFAULT_COUNTRIES,
  isCountryCode,
  isPriceArea,
  PriceArea,
  PricesState,
} from '../../models/price.model';
import * as PricesActions from './prices.actions';
import { localISODate } from '../../utils/date';

const todayISO = localISODate();
const storedDays = Math.min(
  14,
  Math.max(1, parseInt(localStorage.getItem('dateRangeDays') ?? '1', 10)),
);

function loadStoredDate(): string {
  try {
    const raw = localStorage.getItem('selectedDate');
    if (!raw) return todayISO;
    const { date, savedAt } = JSON.parse(raw) as { date: string; savedAt: number };
    return Date.now() - savedAt < 3_600_000 ? date : todayISO;
  } catch {
    return todayISO;
  }
}

/** Sorts into canonical COUNTRIES order so state never depends on click order. */
function sortCountries(codes: readonly CountryCode[]): CountryCode[] {
  const set = new Set(codes);
  return COUNTRIES.filter((c) => set.has(c.code)).map((c) => c.code);
}

/** Exported for tests — initialState is computed at import time, so it cannot be re-derived. */
export function hydrateCountries(raw: string | null): CountryCode[] {
  try {
    if (!raw) return [...DEFAULT_COUNTRIES];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_COUNTRIES];
    const valid = sortCountries(parsed.filter(isCountryCode));
    return valid.length ? valid : [...DEFAULT_COUNTRIES];
  } catch {
    return [...DEFAULT_COUNTRIES];
  }
}

/** An area is only valid if it exists *and* its country is enabled. */
export function hydrateArea(raw: string | null, countries: readonly CountryCode[]): PriceArea {
  const fallback = areasForCountries(countries)[0] ?? 'NO1';
  if (!isPriceArea(raw)) return fallback;
  return countries.includes(AREA_COUNTRY[raw]) ? raw : fallback;
}

const initialCountries = hydrateCountries(localStorage.getItem('enabledCountries'));

export const initialState: PricesState = {
  prices: [],
  allAreaPricesByDate: {},
  attemptsByDate: {},
  selectedArea: hydrateArea(localStorage.getItem('selectedArea'), initialCountries),
  enabledCountries: initialCountries,
  selectedDate: loadStoredDate(),
  dateRangeDays: isNaN(storedDays) ? 1 : storedDays,
  loading: false,
  allAreasLoadingCount: 0,
  error: null,
  notification: null,
};

export const pricesReducer = createReducer(
  initialState,

  on(PricesActions.loadPrices, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(PricesActions.loadPricesSuccess, (state, { prices }) => ({
    ...state,
    prices,
    loading: false,
  })),

  on(PricesActions.loadPricesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Attempts are recorded on dispatch, not on success, so an in-flight request also suppresses
  // a duplicate plan and an HTTP failure throttles for the TTL instead of retrying immediately.
  on(PricesActions.loadAllAreaPrices, (state, { date, areas, at }) => ({
    ...state,
    attemptsByDate: {
      ...state.attemptsByDate,
      [date]: {
        ...state.attemptsByDate[date],
        ...Object.fromEntries(areas.map((area) => [area, at])),
      },
    },
    allAreasLoadingCount: state.allAreasLoadingCount + 1,
  })),

  // Merge, never replace: fetches are area-scoped now, so enabling Sweden must not wipe the
  // Norwegian data already held for this date.
  on(PricesActions.loadAllAreaPricesSuccess, (state, { date, results }) => ({
    ...state,
    allAreaPricesByDate: {
      ...state.allAreaPricesByDate,
      [date]: { ...state.allAreaPricesByDate[date], ...results },
    },
    allAreasLoadingCount: Math.max(0, state.allAreasLoadingCount - 1),
  })),

  on(PricesActions.loadAllAreaPricesFailure, (state, { error }) => ({
    ...state,
    allAreasLoadingCount: Math.max(0, state.allAreasLoadingCount - 1),
    error,
  })),

  // Selecting an area implies its country is wanted — keeps the invariant self-healing and lets
  // geolocation land on a foreign area without a separate dispatch.
  on(PricesActions.selectArea, (state, { area }) => ({
    ...state,
    selectedArea: area,
    enabledCountries: state.enabledCountries.includes(AREA_COUNTRY[area])
      ? state.enabledCountries
      : sortCountries([...state.enabledCountries, AREA_COUNTRY[area]]),
  })),

  on(PricesActions.toggleCountry, (state, { code }) => {
    const next = state.enabledCountries.includes(code)
      ? state.enabledCountries.filter((c) => c !== code)
      : sortCountries([...state.enabledCountries, code]);

    // The last country cannot be removed — an empty chart has nothing to show and would leave
    // selectedArea with nowhere to fall back to.
    if (!next.length) return state;

    return {
      ...state,
      enabledCountries: next,
      selectedArea: next.includes(AREA_COUNTRY[state.selectedArea])
        ? state.selectedArea
        : areasForCountries(next)[0],
    };
  }),

  on(PricesActions.setEnabledCountries, (state, { codes }) => {
    const next = sortCountries(codes);
    if (!next.length) return state;
    return {
      ...state,
      enabledCountries: next,
      selectedArea: next.includes(AREA_COUNTRY[state.selectedArea])
        ? state.selectedArea
        : areasForCountries(next)[0],
    };
  }),

  on(PricesActions.selectDate, (state, { date }) => ({
    ...state,
    selectedDate: date,
  })),

  on(PricesActions.setDateRangeDays, (state, { days }) => ({
    ...state,
    dateRangeDays: days,
  })),

  on(PricesActions.setNotification, (state, { message }) => ({
    ...state,
    notification: message,
  })),

  on(PricesActions.clearNotification, (state) => ({
    ...state,
    notification: null,
  })),
);
