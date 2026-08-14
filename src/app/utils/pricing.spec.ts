import {
  applyStromstotte,
  displayOre,
  isNorwegianArea,
  STROMSTOTTE_THRESHOLD,
  TAX_FACTOR,
} from './pricing';
import { PriceArea } from '../models/price.model';

describe('isNorwegianArea', () => {
  it('recognises every Norwegian area', () => {
    for (const area of ['NO1', 'NO2', 'NO3', 'NO4', 'NO5'] as PriceArea[]) {
      expect(isNorwegianArea(area)).toBe(true);
    }
  });

  it('rejects foreign areas', () => {
    for (const area of ['SE3', 'DK1', 'FI', 'EE', 'LV'] as PriceArea[]) {
      expect(isNorwegianArea(area)).toBe(false);
    }
  });
});

describe('applyStromstotte', () => {
  it('leaves prices at the threshold untouched', () => {
    expect(applyStromstotte(STROMSTOTTE_THRESHOLD)).toBe(STROMSTOTTE_THRESHOLD);
  });

  it('leaves prices below the threshold untouched', () => {
    expect(applyStromstotte(50)).toBe(50);
  });

  it('covers 90% of the excess above the threshold', () => {
    // 100 øre → 0.1 × 100 + 0.9 × 77 = 79.3
    expect(applyStromstotte(100)).toBeCloseTo(79.3);
  });

  it('compresses only just above the threshold', () => {
    expect(applyStromstotte(78)).toBeCloseTo(0.1 * 78 + 0.9 * STROMSTOTTE_THRESHOLD);
  });
});

describe('displayOre', () => {
  it('applies VAT to a Norwegian area', () => {
    expect(displayOre('NO1', 100, true)).toBeCloseTo(125);
  });

  it('exempts NO4 from VAT', () => {
    expect(displayOre('NO4', 100, true)).toBe(100);
  });

  it('returns the raw price when tax is off', () => {
    expect(displayOre('NO1', 100, false)).toBe(100);
  });

  it('applies strømstøtte then VAT for a Norwegian area', () => {
    expect(displayOre('NO1', 100, true, true)).toBeCloseTo(79.3 * TAX_FACTOR);
  });

  // VAT, Norgespris and strømstøtte are all Norwegian schemes — 15 of the 20 areas are foreign.
  it.each(['SE1', 'SE2', 'SE3', 'SE4', 'DK1', 'DK2', 'FI', 'EE', 'LT', 'LV'])(
    'leaves %s untouched regardless of the toggles',
    (area) => {
      expect(displayOre(area as PriceArea, 100, false, false)).toBe(100);
      expect(displayOre(area as PriceArea, 100, true, false)).toBe(100);
      expect(displayOre(area as PriceArea, 100, false, true)).toBe(100);
      expect(displayOre(area as PriceArea, 100, true, true)).toBe(100);
    },
  );

  it('does not apply strømstøtte to a foreign area even above the threshold', () => {
    expect(displayOre('DK1', 200, true, true)).toBe(200);
  });

  // SYS is an unadjusted Nordic reference price, so the Norwegian schemes must not touch it.
  it('leaves the SYS system price untouched under every toggle', () => {
    expect(isNorwegianArea('SYS')).toBe(false);
    expect(displayOre('SYS', 200, false, false)).toBe(200);
    expect(displayOre('SYS', 200, true, false)).toBe(200);
    expect(displayOre('SYS', 200, false, true)).toBe(200);
    expect(displayOre('SYS', 200, true, true)).toBe(200);
  });
});
