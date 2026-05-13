import { Injectable } from '@angular/core';
import { HourlyPrice, PRICE_AREAS } from '../models/price.model';

interface CacheEntry {
  key: string;
  data: HourlyPrice[];
}

const STORAGE_KEY = 'nordpool_price_cache';
const MAX_ENTRIES = 30 * PRICE_AREAS.length;

@Injectable({ providedIn: 'root' })
export class PriceCacheService {
  private entries: CacheEntry[] = this.load();

  get(key: string): HourlyPrice[] | null {
    return this.entries.find((e) => e.key === key)?.data ?? null;
  }

  set(key: string, data: HourlyPrice[]): void {
    const idx = this.entries.findIndex((e) => e.key === key);
    if (idx !== -1) this.entries.splice(idx, 1);
    this.entries.push({ key, data });
    if (this.entries.length > MAX_ENTRIES) this.entries.shift();
    this.save();
  }

  private load(): CacheEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CacheEntry[]) : [];
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
