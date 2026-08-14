import { Injectable } from '@angular/core';
import { HourlyPrice, PRICE_AREAS } from '../models/price.model';

export interface CacheEntry {
  key: string;
  data: HourlyPrice[];
}

const STORAGE_KEY = 'nordpool_price_cache';

/**
 * Days of history to keep, per area. At 20 areas and ~8.5 KB per date+area entry (96 quarter-hour
 * records) this bounds the cache at roughly 2.7 MB — comfortably inside a typical 5 MB
 * localStorage quota, while still exceeding one full 14-day range across every area.
 */
const MAX_DAYS = 16;
export const MAX_ENTRIES = MAX_DAYS * PRICE_AREAS.length;

@Injectable({ providedIn: 'root' })
export class PriceCacheService {
  private entries: CacheEntry[] = this.load();

  get(key: string): HourlyPrice[] | null {
    return this.entries.find((e) => e.key === key)?.data ?? null;
  }

  set(key: string, data: HourlyPrice[]): void {
    this.stage(key, data);
    this.evict();
    this.save();
  }

  /**
   * Writes several entries with a single serialization pass. A multi-area fetch would otherwise
   * re-stringify the whole (multi-megabyte) array once per area.
   */
  setMany(entries: readonly CacheEntry[]): void {
    if (!entries.length) return;
    for (const { key, data } of entries) this.stage(key, data);
    this.evict();
    this.save();
  }

  /** Inserts or moves an entry to the back of the FIFO queue, without persisting. */
  private stage(key: string, data: HourlyPrice[]): void {
    const idx = this.entries.findIndex((e) => e.key === key);
    if (idx !== -1) this.entries.splice(idx, 1);
    this.entries.push({ key, data });
  }

  private evict(): void {
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(-MAX_ENTRIES);
    }
  }

  private load(): CacheEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as CacheEntry[]) : [];
      // Trim on read: a cache persisted when MAX_ENTRIES was larger would otherwise only
      // converge one entry per write.
      return parsed.length > MAX_ENTRIES ? parsed.slice(-MAX_ENTRIES) : parsed;
    } catch {
      return [];
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
    } catch {
      // localStorage full or unavailable — cache operates in-memory only
    }
  }
}
