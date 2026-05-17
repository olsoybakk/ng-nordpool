import { localISODate, subtractDays } from './date';

describe('localISODate', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(localISODate(new Date(2026, 4, 17))).toBe('2026-05-17');
  });

  it('pads single-digit month and day with zeros', () => {
    expect(localISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('subtractDays', () => {
  it('subtracts days correctly', () => {
    expect(subtractDays('2026-05-17', 1)).toBe('2026-05-16');
    expect(subtractDays('2026-05-17', 7)).toBe('2026-05-10');
  });

  it('handles month boundary', () => {
    expect(subtractDays('2026-05-01', 1)).toBe('2026-04-30');
  });

  it('handles year boundary', () => {
    expect(subtractDays('2026-01-01', 1)).toBe('2025-12-31');
  });

  it('subtracting 0 returns the same date', () => {
    expect(subtractDays('2026-05-17', 0)).toBe('2026-05-17');
  });
});
