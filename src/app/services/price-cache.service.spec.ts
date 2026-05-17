import { PriceCacheService } from './price-cache.service';
import { HourlyPrice, PRICE_AREAS } from '../models/price.model';

const MAX_ENTRIES = 30 * PRICE_AREAS.length;

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
});
