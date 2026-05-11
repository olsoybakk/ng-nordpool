import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HourlyPrice, PriceArea } from '../models/price.model';

@Injectable({ providedIn: 'root' })
export class NordpoolService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://www.hvakosterstrommen.no/api/v1/prices';

  getPrices(date: string, area: PriceArea): Observable<HourlyPrice[]> {
    // date is ISO string YYYY-MM-DD → API expects YYYY/MM-DD_AREA.json
    const [year, month, day] = date.split('-');
    const url = `${this.baseUrl}/${year}/${month}-${day}_${area}.json`;
    return this.http.get<HourlyPrice[]>(url);
  }
}
