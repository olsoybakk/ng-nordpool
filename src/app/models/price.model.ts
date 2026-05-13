export interface HourlyPrice {
  ore_per_kWh: number;
  time_start: string;
  time_end: string;
}

export interface PricesState {
  prices: HourlyPrice[];
  allAreaPricesByDate: Record<string, Partial<Record<PriceArea, HourlyPrice[]>>>;
  selectedArea: PriceArea;
  selectedDate: string;
  dateRangeDays: number;
  loading: boolean;
  allAreasLoadingCount: number;
  error: string | null;
  notification: string | null;
}

export type PriceArea = 'NO1' | 'NO2' | 'NO3' | 'NO4' | 'NO5';
// | 'SE1'
// | 'SE2'
// | 'SE3'
// | 'SE4'
// | 'DK1'
// | 'DK2'
// | 'FI'
// | 'EE'
// | 'LT'
// | 'LV'
// | 'AT'
// | 'BE'
// | 'DE-LU'
// | 'FR'
// | 'NL';

export const PRICE_AREAS: { value: PriceArea; label: string }[] = [
  { value: 'NO1', label: 'NO1 — Sørøst-Norge' },
  { value: 'NO2', label: 'NO2 — Sørvest-Norge' },
  { value: 'NO3', label: 'NO3 — Midt-Norge' },
  { value: 'NO4', label: 'NO4 — Nord-Norge' },
  { value: 'NO5', label: 'NO5 — Vest-Norge' },
  // { value: 'SE1', label: 'SE1 — Luleå' },
  // { value: 'SE2', label: 'SE2 — Sundsvall' },
  // { value: 'SE3', label: 'SE3 — Stockholm' },
  // { value: 'SE4', label: 'SE4 — Malmö' },
  // { value: 'DK1', label: 'DK1 — West Denmark' },
  // { value: 'DK2', label: 'DK2 — East Denmark' },
  // { value: 'FI', label: 'FI — Finland' },
  // { value: 'EE', label: 'EE — Estonia' },
  // { value: 'LT', label: 'LT — Lithuania' },
  // { value: 'LV', label: 'LV — Latvia' },
  // { value: 'AT', label: 'AT — Austria' },
  // { value: 'BE', label: 'BE — Belgium' },
  // { value: 'DE-LU', label: 'DE-LU — Germany/Luxembourg' },
  // { value: 'FR', label: 'FR — France' },
  // { value: 'NL', label: 'NL — Netherlands' },
];

export const AREA_COLORS: Record<PriceArea, string> = {
  NO1: 'hsl(204, 70%, 68%)',
  NO2: 'hsl(46,  90%, 62%)',
  NO3: 'hsl(27,  85%, 62%)',
  NO4: 'hsl(0,   72%, 65%)',
  NO5: 'hsl(140, 50%, 54%)',
  // SE1:   'hsl(90,  72%, 55%)',
  // SE2:   'hsl(108, 72%, 55%)',
  // SE3:   'hsl(126, 72%, 55%)',
  // SE4:   'hsl(144, 72%, 55%)',
  // DK1:   'hsl(162, 72%, 58%)',
  // DK2:   'hsl(180, 72%, 58%)',
  // FI:    'hsl(198, 72%, 62%)',
  // EE:    'hsl(216, 72%, 65%)',
  // LT:    'hsl(234, 72%, 65%)',
  // LV:    'hsl(252, 72%, 65%)',
  // AT:    'hsl(270, 72%, 65%)',
  // BE:    'hsl(288, 72%, 65%)',
  // 'DE-LU': 'hsl(306, 72%, 65%)',
  // FR:    'hsl(324, 72%, 65%)',
  // NL:    'hsl(342, 72%, 65%)',
};
