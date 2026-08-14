import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NordpoolService } from './nordpool.service';
import { PriceCacheService } from './price-cache.service';
import { HourlyPrice, PriceArea } from '../models/price.model';

function entry(area: string, value: number) {
  return {
    localDeliveryStart: '2026-05-17T00:00:00',
    localDeliveryEnd: '2026-05-17T00:15:00',
    entryPerArea: { [area]: value },
  };
}

describe('NordpoolService.getAllAreaPrices', () => {
  let service: NordpoolService;
  let httpMock: HttpTestingController;
  let cache: PriceCacheService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [NordpoolService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NordpoolService);
    httpMock = TestBed.inject(HttpTestingController);
    cache = TestBed.inject(PriceCacheService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('requests only the areas it was asked for', () => {
    service.getAllAreaPrices('2026-05-17', ['DK1', 'DK2']).subscribe();

    const req = httpMock.expectOne((r) => r.url.includes('deliveryArea=DK1,DK2'));
    expect(req.request.url).not.toContain('NO1');
    req.flush({ multiAreaEntries: [entry('DK1', 500)] });
  });

  it('omits cached areas from the URL but returns them in the result', () => {
    const cached: HourlyPrice[] = [
      { ore_per_kWh: 40, time_start: '2026-05-17T00:00:00', time_end: '2026-05-17T00:15:00' },
    ];
    cache.set('2026-05-17:NO1', cached);

    let result: Partial<Record<PriceArea, HourlyPrice[]>> | undefined;
    service.getAllAreaPrices('2026-05-17', ['NO1', 'DK1']).subscribe((r) => (result = r));

    // Only the uncached area is requested — this is what makes enabling one more
    // country cheap when the others are already cached.
    const req = httpMock.expectOne((r) => r.url.includes('deliveryArea=DK1'));
    expect(req.request.url).not.toContain('NO1');
    req.flush({ multiAreaEntries: [entry('DK1', 500)] });

    expect(result!['NO1']).toEqual(cached);
    expect(result!['DK1']?.[0].ore_per_kWh).toBe(50);
  });

  it('makes no request when every area is cached', () => {
    const cached: HourlyPrice[] = [
      { ore_per_kWh: 40, time_start: '2026-05-17T00:00:00', time_end: '2026-05-17T00:15:00' },
    ];
    cache.set('2026-05-17:NO1', cached);

    let result: Partial<Record<PriceArea, HourlyPrice[]>> | undefined;
    service.getAllAreaPrices('2026-05-17', ['NO1']).subscribe((r) => (result = r));

    httpMock.expectNone(() => true);
    expect(result).toEqual({ NO1: cached });
  });

  it('makes no request for an empty area list', () => {
    let result: Partial<Record<PriceArea, HourlyPrice[]>> | undefined;
    service.getAllAreaPrices('2026-05-17', []).subscribe((r) => (result = r));

    httpMock.expectNone(() => true);
    expect(result).toEqual({});
  });

  it('omits areas the API returned no data for', () => {
    let result: Partial<Record<PriceArea, HourlyPrice[]>> | undefined;
    service.getAllAreaPrices('2026-05-17', ['NO1', 'DK1']).subscribe((r) => (result = r));

    httpMock
      .expectOne((r) => r.url.includes('deliveryArea=NO1,DK1'))
      .flush({ multiAreaEntries: [entry('NO1', 400)] });

    expect(result!['NO1']).toBeDefined();
    expect(result!['DK1']).toBeUndefined();
  });

  it('returns an empty result for a null response body', () => {
    let result: Partial<Record<PriceArea, HourlyPrice[]>> | undefined;
    service.getAllAreaPrices('2026-05-17', ['NO1']).subscribe((r) => (result = r));

    httpMock.expectOne(() => true).flush(null);

    expect(result).toEqual({});
  });

  it('caches fetched areas so a later call skips the network', () => {
    service.getAllAreaPrices('2026-05-17', ['NO1']).subscribe();
    httpMock.expectOne(() => true).flush({ multiAreaEntries: [entry('NO1', 400)] });

    let second: Partial<Record<PriceArea, HourlyPrice[]>> | undefined;
    service.getAllAreaPrices('2026-05-17', ['NO1']).subscribe((r) => (second = r));

    httpMock.expectNone(() => true);
    expect(second!['NO1']?.[0].ore_per_kWh).toBe(40);
  });
});
