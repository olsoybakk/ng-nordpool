import { Translations } from '../i18n/translations';

export interface HourlyPrice {
  ore_per_kWh: number;
  time_start: string;
  time_end: string;
}

export interface PricesState {
  prices: HourlyPrice[];
  allAreaPricesByDate: Record<string, Partial<Record<PriceArea, HourlyPrice[]>>>;
  /**
   * Epoch-ms timestamp of the last fetch *attempt* per date+area. Records the attempt rather
   * than the result, because an area the API has no data for is never stored in
   * allAreaPricesByDate — so a presence check alone would re-request it forever.
   * Deliberately not persisted: prices survive in PriceCacheService, so a reload always
   * grants a fresh retry.
   */
  attemptsByDate: Record<string, Partial<Record<PriceArea, number>>>;
  selectedArea: PriceArea;
  enabledCountries: CountryCode[];
  selectedDate: string;
  dateRangeDays: number;
  loading: boolean;
  allAreasLoadingCount: number;
  error: string | null;
  notification: string | null;
}

export type PriceArea =
  | 'NO1'
  | 'NO2'
  | 'NO3'
  | 'NO4'
  | 'NO5'
  | 'SE1'
  | 'SE2'
  | 'SE3'
  | 'SE4'
  | 'DK1'
  | 'DK2'
  | 'FI'
  | 'EE'
  | 'LT'
  | 'LV'
  | 'SYS';

export const PRICE_AREAS: { value: PriceArea; label: string }[] = [
  { value: 'NO1', label: 'NO1 — Sørøst-Norge' },
  { value: 'NO2', label: 'NO2 — Sørvest-Norge' },
  { value: 'NO3', label: 'NO3 — Midt-Norge' },
  { value: 'NO4', label: 'NO4 — Nord-Norge' },
  { value: 'NO5', label: 'NO5 — Vest-Norge' },
  { value: 'SE1', label: 'SE1 — Luleå' },
  { value: 'SE2', label: 'SE2 — Sundsvall' },
  { value: 'SE3', label: 'SE3 — Stockholm' },
  { value: 'SE4', label: 'SE4 — Malmö' },
  { value: 'DK1', label: 'DK1 — West Denmark' },
  { value: 'DK2', label: 'DK2 — East Denmark' },
  { value: 'FI', label: 'FI — Finland' },
  { value: 'EE', label: 'EE — Estonia' },
  { value: 'LT', label: 'LT — Lithuania' },
  { value: 'LV', label: 'LV — Latvia' },
  { value: 'SYS', label: 'SYS — Nordpool' },
];

/**
 * Country hue families: one hue per country, lightness steps within multi-area countries, so
 * a line's country reads from its hue and its area from the shade. 15 areas cannot be told
 * apart by hue alone (24° spacing), which is why a flat ramp was rejected.
 * NO1–NO5 keep their long-established colours; the six added hues sit in the bands ≥18° away
 * from the reserved Norwegian hues (0 / 27 / 46 / 140 / 204).
 */
export const AREA_COLORS: Record<PriceArea, string> = {
  NO1: 'hsl(204, 70%, 68%)',
  NO2: 'hsl(46,  90%, 62%)',
  NO3: 'hsl(27,  85%, 62%)',
  NO4: 'hsl(0,   72%, 65%)',
  NO5: 'hsl(140, 50%, 54%)',
  SE1: 'hsl(232, 62%, 76%)',
  SE2: 'hsl(232, 62%, 68%)',
  SE3: 'hsl(232, 62%, 60%)',
  SE4: 'hsl(232, 62%, 52%)',
  DK1: 'hsl(332, 62%, 70%)',
  DK2: 'hsl(332, 62%, 58%)',
  FI: 'hsl(168, 60%, 62%)',
  EE: 'hsl(252, 62%, 62%)',
  LT: 'hsl(292, 62%, 62%)',
  LV: 'hsl(272, 62%, 62%)',
  // Neutral grey: SYS is an unadjusted reference price, not a bidding zone, and should read
  // as one against the coloured market lines.
  SYS: 'hsl(220, 6%, 55%)',
};

export type CountryCode = 'NO' | 'SE' | 'DK' | 'FI' | 'EE' | 'LT' | 'LV' | 'SYS';

/**
 * A toggleable group of price areas. Every entry is a country except SYS ("Nordpool"), the
 * system price — a computed reference rather than a bidding zone, so it carries `isReference`
 * and renders as a labelled chip instead of a flag.
 */
export interface Country {
  code: CountryCode;
  /** Key into the i18n dictionary — typed so a missing translation is a compile error. */
  nameKey: keyof Translations;
  areas: readonly PriceArea[];
  isReference?: boolean;
}

/** Canonical display and iteration order: Nordics, then Baltics, then the SYS reference. */
export const COUNTRIES: readonly Country[] = [
  { code: 'NO', nameKey: 'countryNO', areas: ['NO1', 'NO2', 'NO3', 'NO4', 'NO5'] },
  { code: 'SE', nameKey: 'countrySE', areas: ['SE1', 'SE2', 'SE3', 'SE4'] },
  { code: 'DK', nameKey: 'countryDK', areas: ['DK1', 'DK2'] },
  { code: 'FI', nameKey: 'countryFI', areas: ['FI'] },
  { code: 'EE', nameKey: 'countryEE', areas: ['EE'] },
  { code: 'LT', nameKey: 'countryLT', areas: ['LT'] },
  { code: 'LV', nameKey: 'countryLV', areas: ['LV'] },
  { code: 'SYS', nameKey: 'systemPrice', areas: ['SYS'], isReference: true },
];

export const AREA_COUNTRY: Record<PriceArea, CountryCode> = COUNTRIES.reduce(
  (acc, country) => {
    for (const area of country.areas) acc[area] = country.code;
    return acc;
  },
  {} as Record<PriceArea, CountryCode>,
);

/** Countries enabled on a first visit — keeps the app Norway-only until a flag is clicked. */
export const DEFAULT_COUNTRIES: readonly CountryCode[] = ['NO'];

export function isCountryCode(value: unknown): value is CountryCode {
  return COUNTRIES.some((c) => c.code === value);
}

export function isPriceArea(value: unknown): value is PriceArea {
  return PRICE_AREAS.some((a) => a.value === value);
}

/** Areas belonging to the given countries, in canonical COUNTRIES order. */
export function areasForCountries(codes: readonly CountryCode[]): PriceArea[] {
  const enabled = new Set(codes);
  return COUNTRIES.filter((c) => enabled.has(c.code)).flatMap((c) => [...c.areas]);
}
