export type Lang = 'en' | 'nb';

export interface Translations {
  title: string;
  subtitle: string;
  switchToLight: string;
  switchToDark: string;
  switchToNorwegian: string;
  switchToEnglish: string;
  taxBtn: string;
  taxAriaLabel: string;
  taxTitle: string;
  norgesprisAriaLabel: string;
  norgesprisTitle: string;
  norgesprisLabel: string;
  chartTypeLabel: string;
  lineBtn: string;
  lineAriaLabel: string;
  barBtn: string;
  barAriaLabel: string;
  barChartAriaLabel: string;
  lineChartAriaLabel: string;
  errorPrefix: string;
  hourlyPrices: string;
  allHours: string;
  priceArea: string;
  date: string;
  previousDay: string;
  nextDay: string;
  days: string;
  fewerDays: string;
  moreDays: string;
  dateRangeLabel: string;
  day: string;
  daysPlural: string;
  now: string;
  nowMarker: string;
  min: string;
  avg: string;
  max: string;
  time: string;
  enterFullscreen: string;
  exitFullscreen: string;
  noData: string;
  failedToLoad: string;
  dataNotAvailable: string;
}

export const translations: Record<Lang, Translations> = {
  en: {
    title: 'Nordpool Spot Prices',
    subtitle: 'Day-ahead electricity prices',
    switchToLight: 'Switch to light mode',
    switchToDark: 'Switch to dark mode',
    switchToNorwegian: 'Bytt til norsk',
    switchToEnglish: 'Switch to English',
    taxBtn: 'Tax',
    taxAriaLabel: 'Toggle tax (25% VAT)',
    taxTitle: 'Include 25% VAT (NO4 exempt)',
    norgesprisAriaLabel: 'Toggle Norgespris reference line',
    norgesprisTitle: 'Show Norgespris (50 øre/kWh incl. tax)',
    norgesprisLabel: 'Norgespris',
    chartTypeLabel: 'Chart type',
    lineBtn: 'Line',
    lineAriaLabel: 'Line chart',
    barBtn: 'Bar',
    barAriaLabel: 'Bar chart',
    barChartAriaLabel: 'Bar chart of electricity prices in 15-minute intervals',
    lineChartAriaLabel: 'Line chart of electricity prices in 15-minute intervals',
    errorPrefix: 'Error:',
    hourlyPrices: 'Hourly prices',
    allHours: 'All hours',
    priceArea: 'Price area',
    date: 'Date',
    previousDay: 'Previous day',
    nextDay: 'Next day',
    days: 'Days',
    fewerDays: 'Fewer days',
    moreDays: 'More days',
    dateRangeLabel: 'Date range in days',
    day: 'day',
    daysPlural: 'days',
    now: 'Now',
    nowMarker: 'now',
    min: 'Min',
    avg: 'Avg',
    max: 'Max',
    time: 'Time',
    enterFullscreen: 'Enter fullscreen',
    exitFullscreen: 'Exit fullscreen',
    noData: 'No data to display',
    failedToLoad: 'Failed to load prices',
    dataNotAvailable: 'Price data is not available for all selected dates.',
  },
  nb: {
    title: 'Nordpool Spotpriser',
    subtitle: 'Strømpriser for neste dag',
    switchToLight: 'Bytt til lyst tema',
    switchToDark: 'Bytt til mørkt tema',
    switchToNorwegian: 'Bytt til norsk',
    switchToEnglish: 'Switch to English',
    taxBtn: 'MVA',
    taxAriaLabel: 'Slå av/på moms (25% MVA)',
    taxTitle: 'Inkluder 25% MVA (NO4 er unntatt)',
    norgesprisAriaLabel: 'Slå av/på Norgespris-linje',
    norgesprisTitle: 'Vis Norgespris (50 øre/kWh inkl. moms)',
    norgesprisLabel: 'Norgespris',
    chartTypeLabel: 'Diagramtype',
    lineBtn: 'Linje',
    lineAriaLabel: 'Linjediagram',
    barBtn: 'Søyle',
    barAriaLabel: 'Søylediagram',
    barChartAriaLabel: 'Søylediagram over strømpriser i 15-minutters intervaller',
    lineChartAriaLabel: 'Linjediagram over strømpriser i 15-minutters intervaller',
    errorPrefix: 'Feil:',
    hourlyPrices: 'Timepriser',
    allHours: 'Alle timer',
    priceArea: 'Prisområde',
    date: 'Dato',
    previousDay: 'Forrige dag',
    nextDay: 'Neste dag',
    days: 'Dager',
    fewerDays: 'Færre dager',
    moreDays: 'Flere dager',
    dateRangeLabel: 'Datoperiode i dager',
    day: 'dag',
    daysPlural: 'dager',
    now: 'Nå',
    nowMarker: 'nå',
    min: 'Min',
    avg: 'Snitt',
    max: 'Maks',
    time: 'Tid',
    enterFullscreen: 'Åpne fullskjerm',
    exitFullscreen: 'Lukk fullskjerm',
    noData: 'Ingen data å vise',
    failedToLoad: 'Kunne ikke laste priser',
    dataNotAvailable: 'Prisdata er ikke tilgjengelig for alle valgte datoer.',
  },
};
