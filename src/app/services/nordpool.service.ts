import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { HourlyPrice, PriceArea } from '../models/price.model';
import { environment } from '../../environments/environment';
import { PriceCacheService } from './price-cache.service';

interface NordpoolEntry {
  localDeliveryStart: string;
  localDeliveryEnd: string;
  entryPerArea: Partial<Record<string, number>>;
}

interface NordpoolResponse {
  multiAreaEntries: NordpoolEntry[];
}

@Injectable({ providedIn: 'root' })
export class NordpoolService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(PriceCacheService);
  private readonly baseUrl = environment.nordpoolApiUrl;

  getPrices(date: string, area: PriceArea): Observable<HourlyPrice[]> {
    if (!this.baseUrl) return throwError(() => new Error('not-configured'));
    const key = `${date}:${area}`;
    const cached = this.cache.get(key);
    if (cached) return of(cached);

    return this.http.get<NordpoolResponse>(this.buildUrl(date, [area])).pipe(
      map((r) => (r?.multiAreaEntries ? this.toIntervalPrices(r.multiAreaEntries, area) : [])),
      tap((prices) => {
        if (prices.length) this.cache.set(key, prices);
      }),
    );
  }

  /**
   * Fetches the given areas for one date, requesting only the ones not already cached. Splitting
   * cached from uncached matters because areas arrive a country at a time: with Norway already
   * cached, enabling Sweden must fetch 4 areas rather than all 20.
   */
  getAllAreaPrices(
    date: string,
    areas: PriceArea[],
  ): Observable<Partial<Record<PriceArea, HourlyPrice[]>>> {
    if (!this.baseUrl) return throwError(() => new Error('not-configured'));
    if (!areas.length) return of({});

    const cached: Partial<Record<PriceArea, HourlyPrice[]>> = {};
    const uncached: PriceArea[] = [];
    for (const area of areas) {
      const hit = this.cache.get(`${date}:${area}`);
      if (hit) cached[area] = hit;
      else uncached.push(area);
    }

    if (!uncached.length) return of(cached);

    return this.http.get<NordpoolResponse>(this.buildUrl(date, uncached)).pipe(
      map((r) => {
        const result: Partial<Record<PriceArea, HourlyPrice[]>> = { ...cached };
        if (r?.multiAreaEntries) {
          for (const area of uncached) {
            const prices = this.toIntervalPrices(r.multiAreaEntries, area);
            if (prices.length) result[area] = prices;
          }
        }
        return result;
      }),
      tap((result) => {
        this.cache.setMany(
          uncached
            .filter((area) => result[area]?.length)
            .map((area) => ({ key: `${date}:${area}`, data: result[area]! })),
        );
      }),
    );
  }

  private buildUrl(date: string, areas: PriceArea[]): string {
    return `${this.baseUrl}?date=${date}&market=DayAhead&deliveryArea=${areas.join(',')}&currency=NOK`;
  }

  // Converts 15-min entries to HourlyPrice[], dividing NOK/MWh → NOK/kWh.
  private toIntervalPrices(entries: NordpoolEntry[], area: PriceArea): HourlyPrice[] {
    return entries
      .filter((e) => e.entryPerArea[area] != null)
      .map((e) => ({
        ore_per_kWh: e.entryPerArea[area]! / 10,
        time_start: e.localDeliveryStart,
        time_end: e.localDeliveryEnd,
      }));
  }
}
