export type Lang = 'en' | 'nb';

export interface Translations {
  title: string;
  switchToLight: string;
  switchToDark: string;
  switchToNorwegian: string;
  switchToEnglish: string;
  taxBtn: string;
  taxAriaLabel: string;
  taxTitle: string;
  taxMixedTitle: string;
  norgesprisAriaLabel: string;
  norgesprisTitle: string;
  norgesprisLabel: string;
  stromstotteAriaLabel: string;
  stromstotteTitle: string;
  stromstotteLabel: string;
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
  resetZoom: string;
  noData: string;
  failedToLoad: string;
  dataNotAvailable: string;
  menuAriaLabel: string;
  clearData: string;
  countriesGroupLabel: string;
  onlyNorway: string;
  countryNO: string;
  countrySE: string;
  countryDK: string;
  countryFI: string;
  countryEE: string;
  countryLT: string;
  countryLV: string;
  systemPrice: string;
}

export const translations: Record<Lang, Translations> = {
  en: {
    title: 'Spot Prices',
    switchToLight: 'Switch to light mode',
    switchToDark: 'Switch to dark mode',
    switchToNorwegian: 'Bytt til norsk',
    switchToEnglish: 'Switch to English',
    taxBtn: 'Tax',
    taxAriaLabel: 'Toggle tax (25% VAT)',
    taxTitle: 'Include 25% VAT — Norwegian areas only (NO4 exempt)',
    taxMixedTitle:
      'VAT is unavailable while other areas are shown alongside Norway — it applies to Norwegian areas only, so the comparison would be uneven',
    norgesprisAriaLabel: 'Toggle Norgespris reference line',
    norgesprisTitle: 'Show Norgespris (50 øre/kWh incl. tax)',
    norgesprisLabel: 'Norgespris',
    stromstotteAriaLabel: 'Toggle electricity support (strømstøtte)',
    stromstotteTitle:
      'Show effective prices after strømstøtte — Norwegian areas only (90% above 77 øre/kWh excl. VAT)',
    stromstotteLabel: 'Strømstøtte',
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
    resetZoom: 'Reset zoom',
    noData: 'No data to display',
    failedToLoad: 'Failed to load prices',
    dataNotAvailable: 'Price data is not available for all selected dates.',
    menuAriaLabel: 'Open menu',
    clearData: 'Clear saved data',
    countriesGroupLabel: 'Countries',
    onlyNorway: 'Norway only',
    countryNO: 'Norway',
    countrySE: 'Sweden',
    countryDK: 'Denmark',
    countryFI: 'Finland',
    countryEE: 'Estonia',
    countryLT: 'Lithuania',
    countryLV: 'Latvia',
    systemPrice: 'Nordpool',
  },
  nb: {
    title: 'Spotpriser',
    switchToLight: 'Bytt til lyst tema',
    switchToDark: 'Bytt til mørkt tema',
    switchToNorwegian: 'Bytt til norsk',
    switchToEnglish: 'Switch to English',
    taxBtn: 'MVA',
    taxAriaLabel: 'Slå av/på moms (25% MVA)',
    taxTitle: 'Inkluder 25% MVA — bare norske områder (NO4 er unntatt)',
    taxMixedTitle:
      'MVA er utilgjengelig når andre områder vises sammen med Norge — den gjelder bare norske områder, så sammenligningen ville blitt skjev',
    norgesprisAriaLabel: 'Slå av/på Norgespris-linje',
    norgesprisTitle: 'Vis Norgespris (50 øre/kWh inkl. moms)',
    norgesprisLabel: 'Norgespris',
    stromstotteAriaLabel: 'Slå av/på strømstøtte',
    stromstotteTitle:
      'Vis effektiv pris etter strømstøtte — bare norske områder (90% av beløp over 77 øre/kWh ekskl. moms)',
    stromstotteLabel: 'Strømstøtte',
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
    resetZoom: 'Tilbakestill zoom',
    noData: 'Ingen data å vise',
    failedToLoad: 'Kunne ikke laste priser',
    dataNotAvailable: 'Prisdata er ikke tilgjengelig for alle valgte datoer.',
    menuAriaLabel: 'Åpne meny',
    clearData: 'Slett lagrede data',
    countriesGroupLabel: 'Land',
    onlyNorway: 'Bare Norge',
    countryNO: 'Norge',
    countrySE: 'Sverige',
    countryDK: 'Danmark',
    countryFI: 'Finland',
    countryEE: 'Estland',
    countryLT: 'Litauen',
    countryLV: 'Latvia',
    systemPrice: 'Nordpool',
  },
};
