import { MAX_ENTRIES, PriceCacheService } from './price-cache.service';
import { HourlyPrice } from '../models/price.model';

const p = (ore: number): HourlyPrice => ({ ore_per_kWh: ore, time_start: '', time_end: '' });

describe('PriceCacheService', () => {
  let service: PriceCacheService;

  beforeEach(() => {
    localStorage.clear();
    service = new PriceCacheService();
  });

  it('returns null for a missing key', () => {
    expect(service.get('2026-05-17:NO1')).toBeNull();
  });

  it('stores and retrieves data by key', () => {
    const data = [p(100), p(200)];
    service.set('2026-05-17:NO1', data);
    expect(service.get('2026-05-17:NO1')).toEqual(data);
  });

  it('updating an existing key replaces data and moves it to the back', () => {
    service.set('key-a', [p(1)]);
    service.set('key-b', [p(2)]);
    service.set('key-a', [p(99)]);
    expect(service.get('key-a')).toEqual([p(99)]);
  });

  it('evicts the oldest entry when capacity is exceeded', () => {
    for (let i = 0; i < MAX_ENTRIES; i++) {
      service.set(`key-${i}`, [p(i)]);
    }
    expect(service.get('key-0')).not.toBeNull();
    service.set(`key-${MAX_ENTRIES}`, [p(MAX_ENTRIES)]);
    expect(service.get('key-0')).toBeNull();
    expect(service.get(`key-${MAX_ENTRIES}`)).not.toBeNull();
  });

  it('persists data to localStorage so a new instance can read it', () => {
    service.set('2026-05-17:NO1', [p(50)]);
    const service2 = new PriceCacheService();
    expect(service2.get('2026-05-17:NO1')).toEqual([p(50)]);
  });

  it('returns null after localStorage is cleared between instances', () => {
    service.set('2026-05-17:NO1', [p(50)]);
    localStorage.clear();
    const service2 = new PriceCacheService();
    expect(service2.get('2026-05-17:NO1')).toBeNull();
  });

  describe('setMany', () => {
    it('stores every entry', () => {
      service.setMany([
        { key: '2026-05-17:DK1', data: [p(10)] },
        { key: '2026-05-17:DK2', data: [p(20)] },
      ]);
      expect(service.get('2026-05-17:DK1')).toEqual([p(10)]);
      expect(service.get('2026-05-17:DK2')).toEqual([p(20)]);
    });

    it('persists with a single write', () => {
      const spy = vi.spyOn(localStorage, 'setItem');
      service.setMany([
        { key: 'a', data: [p(1)] },
        { key: 'b', data: [p(2)] },
        { key: 'c', data: [p(3)] },
      ]);
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockRestore();
    });

    it('does nothing for an empty list', () => {
      const spy = vi.spyOn(localStorage, 'setItem');
      service.setMany([]);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('respects the capacity limit', () => {
      service.setMany(
        Array.from({ length: MAX_ENTRIES + 5 }, (_, i) => ({ key: `key-${i}`, data: [p(i)] })),
      );
      expect(service.get('key-0')).toBeNull();
      expect(service.get('key-4')).toBeNull();
      expect(service.get(`key-${MAX_ENTRIES + 4}`)).not.toBeNull();
    });
  });

  it('trims an oversized persisted cache on load', () => {
    // Simulates a cache written when the capacity was larger — without trimming on read it would
    // only shed one entry per write.
    const oversized = Array.from({ length: MAX_ENTRIES + 10 }, (_, i) => ({
      key: `key-${i}`,
      data: [p(i)],
    }));
    localStorage.setItem('nordpool_price_cache', JSON.stringify(oversized));

    const fresh = new PriceCacheService();
    expect(fresh.get('key-0')).toBeNull();
    expect(fresh.get('key-9')).toBeNull();
    expect(fresh.get(`key-${MAX_ENTRIES + 9}`)).not.toBeNull();
  });
});
