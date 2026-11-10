import { Injectable } from '@angular/core';
import { DayPrices } from '../../models/price.model';

export interface CacheEntry {
  key: string;
  data: DayPrices;
}

const STORAGE_KEY = 'nordpool_price_cache_v2';

/** The pre-v2 cache held one entry per date+area; it is removed on load rather than migrated. */
const LEGACY_STORAGE_KEY = 'nordpool_price_cache';

/**
 * Days of history to keep. Each entry holds every area for one date (~16 areas × ~8.5 KB of
 * quarter-hour records), so this bounds the cache at roughly 2.2 MB — comfortably inside a typical
 * 5 MB localStorage quota, while still exceeding one full 14-day range.
 */
export const MAX_ENTRIES = 16;

@Injectable({ providedIn: 'root' })
export class PriceCacheService {
  private entries: CacheEntry[] = this.load();

  get(key: string): DayPrices | null {
    return this.entries.find((e) => e.key === key)?.data ?? null;
  }

  /** Inserts or moves an entry to the back of the FIFO queue, then persists. */
  set(key: string, data: DayPrices): void {
    const idx = this.entries.findIndex((e) => e.key === key);
    if (idx !== -1) this.entries.splice(idx, 1);
    this.entries.push({ key, data });
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(-MAX_ENTRIES);
    }
    this.save();
  }

  private load(): CacheEntry[] {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
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
