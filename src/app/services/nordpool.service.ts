import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { HourlyPrice, PriceArea, PRICE_AREAS } from '../models/price.model';
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
    const key = `${date}:${area}`;
    const cached = this.cache.get(key);
    if (cached) return of(cached);

    return this.http
      .get<NordpoolResponse>(this.buildUrl(date, [area]))
      .pipe(
        map((r) => this.toIntervalPrices(r.multiAreaEntries, area)),
        tap((prices) => this.cache.set(key, prices))
      );
  }

  getAllAreaPrices(date: string): Observable<Partial<Record<PriceArea, HourlyPrice[]>>> {
    const areas = PRICE_AREAS.map((a) => a.value);
    const allCached = areas.every((area) => this.cache.get(`${date}:${area}`) !== null);

    if (allCached) {
      const result: Partial<Record<PriceArea, HourlyPrice[]>> = {};
      for (const area of areas) {
        result[area] = this.cache.get(`${date}:${area}`)!;
      }
      return of(result);
    }

    return this.http.get<NordpoolResponse>(this.buildUrl(date, areas)).pipe(
      map((r) => {
        const result: Partial<Record<PriceArea, HourlyPrice[]>> = {};
        for (const area of areas) {
          result[area] = this.toIntervalPrices(r.multiAreaEntries, area);
        }
        return result;
      }),
      tap((result) => {
        for (const area of areas) {
          if (result[area]) this.cache.set(`${date}:${area}`, result[area]!);
        }
      })
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
