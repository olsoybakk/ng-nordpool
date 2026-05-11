export interface HourlyPrice {
  NOK_per_kWh: number;
  EUR_per_kWh: number;
  EXR: number;
  time_start: string;
  time_end: string;
}

export interface PricesState {
  prices: HourlyPrice[];
  allAreaPrices: Partial<Record<PriceArea, HourlyPrice[]>>;
  selectedArea: PriceArea;
  selectedDate: string;
  loading: boolean;
  allAreasLoading: boolean;
  error: string | null;
}

export type PriceArea =
  | 'NO1' | 'NO2' | 'NO3' | 'NO4' | 'NO5'
  | 'SE1' | 'SE2' | 'SE3' | 'SE4'
  | 'DK1' | 'DK2'
  | 'FI' | 'EE' | 'LT' | 'LV'
  | 'AT' | 'BE' | 'DE-LU' | 'FR' | 'NL';

export const PRICE_AREAS: { value: PriceArea; label: string }[] = [
  { value: 'NO1', label: 'NO1 — Oslo' },
  { value: 'NO2', label: 'NO2 — Kristiansand' },
  { value: 'NO3', label: 'NO3 — Trondheim' },
  { value: 'NO4', label: 'NO4 — Tromsø' },
  { value: 'NO5', label: 'NO5 — Bergen' },
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
  { value: 'AT', label: 'AT — Austria' },
  { value: 'BE', label: 'BE — Belgium' },
  { value: 'DE-LU', label: 'DE-LU — Germany/Luxembourg' },
  { value: 'FR', label: 'FR — France' },
  { value: 'NL', label: 'NL — Netherlands' },
];

// 20 evenly-spaced hues (18° apart) at consistent saturation/lightness
// so every area has a clearly distinct colour at a glance
export const AREA_COLORS: Record<PriceArea, string> = {
  NO1:   'hsl(0,   72%, 62%)',
  NO2:   'hsl(18,  72%, 62%)',
  NO3:   'hsl(36,  72%, 62%)',
  NO4:   'hsl(54,  72%, 62%)',
  NO5:   'hsl(72,  72%, 62%)',
  SE1:   'hsl(90,  72%, 55%)',
  SE2:   'hsl(108, 72%, 55%)',
  SE3:   'hsl(126, 72%, 55%)',
  SE4:   'hsl(144, 72%, 55%)',
  DK1:   'hsl(162, 72%, 58%)',
  DK2:   'hsl(180, 72%, 58%)',
  FI:    'hsl(198, 72%, 62%)',
  EE:    'hsl(216, 72%, 65%)',
  LT:    'hsl(234, 72%, 65%)',
  LV:    'hsl(252, 72%, 65%)',
  AT:    'hsl(270, 72%, 65%)',
  BE:    'hsl(288, 72%, 65%)',
  'DE-LU': 'hsl(306, 72%, 65%)',
  FR:    'hsl(324, 72%, 65%)',
  NL:    'hsl(342, 72%, 65%)',
};
