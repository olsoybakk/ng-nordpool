import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { DayPrices, HourlyPrice, PRICE_AREAS, PriceArea } from '../../models/price.model';
import { environment } from '../../../environments/environment';
import { PriceCacheService } from './price-cache.service';

interface NordpoolEntry {
  localDeliveryStart: string;
  localDeliveryEnd: string;
  entryPerArea: Partial<Record<string, number>>;
}

interface NordpoolResponse {
  multiAreaEntries: NordpoolEntry[];
}

const ALL_AREAS: PriceArea[] = PRICE_AREAS.map((a) => a.value);

@Injectable({ providedIn: 'root' })
export class NordpoolService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(PriceCacheService);
  private readonly baseUrl = environment.nordpoolApiUrl;

  /**
   * Fetches every area for one date in a single request, regardless of which countries are
   * enabled — toggling a country or switching area then never needs the network. Areas the API
   * returned nothing for are left out, so an unpublished date yields `{}`.
   */
  getDayPrices(date: string): Observable<DayPrices> {
    if (!this.baseUrl) return throwError(() => new Error('not-configured'));
    const cached = this.cache.get(date);
    if (cached) return of(cached);

    return this.http.get<NordpoolResponse>(this.buildUrl(date)).pipe(
      map((r) => {
        const result: DayPrices = {};
        if (r?.multiAreaEntries) {
          for (const area of ALL_AREAS) {
            const prices = this.toIntervalPrices(r.multiAreaEntries, area);
            if (prices.length) result[area] = prices;
          }
        }
        return result;
      }),
      // An empty day is not cached, so an unpublished tomorrow is retried later.
      tap((result) => {
        if (Object.keys(result).length) this.cache.set(date, result);
      }),
    );
  }

  private buildUrl(date: string): string {
    return `${this.baseUrl}?date=${date}&market=DayAhead&deliveryArea=${ALL_AREAS.join(',')}&currency=NOK`;
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
