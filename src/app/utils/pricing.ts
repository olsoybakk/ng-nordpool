import { AREA_COUNTRY, PriceArea } from '../models/price.model';

export const TAX_FACTOR = 1.25;
export const STROMSTOTTE_THRESHOLD = 77; // øre/kWh excl. VAT
export const NORGESPRIS_ORE_INCL_TAX = 50;

/** Norwegian areas exempt from the 25% VAT. */
export const NO_VAT_EXEMPT_AREAS = new Set<PriceArea>(['NO4']);

export function isNorwegianArea(area: PriceArea): boolean {
  return AREA_COUNTRY[area] === 'NO';
}

/** Prices at or below the threshold are untouched; above it, 90% of the excess is covered. */
export function applyStromstotte(rawOre: number): number {
  if (rawOre <= STROMSTOTTE_THRESHOLD) return rawOre;
  return 0.1 * rawOre + 0.9 * STROMSTOTTE_THRESHOLD;
}

/**
 * Raw spot price → the price to display, applying strømstøtte then VAT.
 *
 * VAT, Norgespris and strømstøtte are all Norwegian schemes, so foreign areas are returned
 * untouched no matter how the toggles are set — 15 of the 20 areas are outside Norway.
 */
export function displayOre(
  area: PriceArea,
  rawOre: number,
  includeTax: boolean,
  showStromstotte = false,
): number {
  if (!isNorwegianArea(area)) return rawOre;
  const ore = showStromstotte ? applyStromstotte(rawOre) : rawOre;
  return includeTax && !NO_VAT_EXEMPT_AREAS.has(area) ? ore * TAX_FACTOR : ore;
}
