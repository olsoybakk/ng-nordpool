import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap, map } from 'rxjs';
import { PriceArea } from '../models/price.model';

interface NominatimReverse {
  address: { country_code: string };
}

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly http = inject(HttpClient);

  detectPriceArea(): Observable<PriceArea> {
    return this.browserPosition().pipe(
      switchMap(({ lat, lon }) =>
        this.http
          .get<NominatimReverse>(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
            { headers: { 'Accept-Language': 'en' } },
          )
          .pipe(map((r) => this.mapToArea(r.address.country_code, lat, lon))),
      ),
    );
  }

  private browserPosition(): Observable<{ lat: number; lon: number }> {
    return new Observable((observer) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          observer.next({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          observer.complete();
        },
        (err) => observer.error(err),
        { timeout: 10_000 },
      );
    });
  }

  private mapToArea(countryCode: string, lat: number, lon: number): PriceArea {
    switch (countryCode.toLowerCase()) {
      case 'no':
        return this.mapNorway(lat, lon);
      // case 'se': return this.mapSweden(lat);
      // case 'dk': return lon < 10 ? 'DK1' : 'DK2';
      // case 'fi': return 'FI';
      // case 'ee': return 'EE';
      // case 'lv': return 'LV';
      // case 'lt': return 'LT';
      // case 'at': return 'AT';
      // case 'be': return 'BE';
      // case 'de':
      // case 'lu': return 'DE-LU';
      // case 'fr': return 'FR';
      // case 'nl': return 'NL';
      default:
        return 'NO1';
    }
  }

  // Approximate Norwegian bidding-zone boundaries
  private mapNorway(lat: number, lon: number): PriceArea {
    if (lat > 65) return 'NO4'; // North
    if (lon < 7) return 'NO5'; // Bergen / West
    if (lat < 59.5 && lon < 9) return 'NO2'; // Kristiansand / South
    if (lat > 62) return 'NO3'; // Trondheim / Central
    return 'NO1'; // Oslo / East
  }

  // Approximate Swedish bidding-zone boundaries
  // private mapSweden(lat: number): PriceArea {
  //   if (lat > 64) return 'SE1';
  //   if (lat > 60) return 'SE2';
  //   if (lat > 57) return 'SE3';
  //   return 'SE4';
  // }
}
