export interface HourlyPrice {
  NOK_per_kWh: number;
  EUR_per_kWh: number;
  EXR: number;
  time_start: string;
  time_end: string;
}

export interface PricesState {
  prices: HourlyPrice[];
  selectedArea: PriceArea;
  selectedDate: string;
  loading: boolean;
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
