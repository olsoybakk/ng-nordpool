import { MAX_ENTRIES, PriceCacheService } from './price-cache.service';
import { DayPrices } from '../../models/price.model';

const day = (ore: number): DayPrices => ({
  NO1: [{ ore_per_kWh: ore, time_start: '', time_end: '' }],
});

describe('PriceCacheService', () => {
  let service: PriceCacheService;

  beforeEach(() => {
    localStorage.clear();
    service = new PriceCacheService();
  });

  it('returns null for a missing key', () => {
    expect(service.get('2026-05-17')).toBeNull();
  });

  it('stores and retrieves data by key', () => {
    const data: DayPrices = { ...day(100), DK1: day(200)['NO1'] };
    service.set('2026-05-17', data);
    expect(service.get('2026-05-17')).toEqual(data);
  });

  it('updating an existing key replaces data and moves it to the back', () => {
    service.set('key-a', day(1));
    service.set('key-b', day(2));
    service.set('key-a', day(99));
    expect(service.get('key-a')).toEqual(day(99));
  });

  it('evicts the oldest entry when capacity is exceeded', () => {
    for (let i = 0; i < MAX_ENTRIES; i++) {
      service.set(`key-${i}`, day(i));
    }
    expect(service.get('key-0')).not.toBeNull();
    service.set(`key-${MAX_ENTRIES}`, day(MAX_ENTRIES));
    expect(service.get('key-0')).toBeNull();
    expect(service.get(`key-${MAX_ENTRIES}`)).not.toBeNull();
  });

  it('persists data to localStorage so a new instance can read it', () => {
    service.set('2026-05-17', day(50));
    const service2 = new PriceCacheService();
    expect(service2.get('2026-05-17')).toEqual(day(50));
  });

  it('returns null after localStorage is cleared between instances', () => {
    service.set('2026-05-17', day(50));
    localStorage.clear();
    const service2 = new PriceCacheService();
    expect(service2.get('2026-05-17')).toBeNull();
  });

  it('removes the legacy per-area cache on load', () => {
    localStorage.setItem('nordpool_price_cache', JSON.stringify([{ key: '2026-05-17:NO1' }]));
    new PriceCacheService();
    expect(localStorage.getItem('nordpool_price_cache')).toBeNull();
  });

  it('trims an oversized persisted cache on load', () => {
    // Simulates a cache written when the capacity was larger — without trimming on read it would
    // only shed one entry per write.
    const oversized = Array.from({ length: MAX_ENTRIES + 10 }, (_, i) => ({
      key: `key-${i}`,
      data: day(i),
    }));
    localStorage.setItem('nordpool_price_cache_v2', JSON.stringify(oversized));

    const fresh = new PriceCacheService();
    expect(fresh.get('key-0')).toBeNull();
    expect(fresh.get('key-9')).toBeNull();
    expect(fresh.get(`key-${MAX_ENTRIES + 9}`)).not.toBeNull();
  });
});
