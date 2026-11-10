import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NordpoolService } from './nordpool.service';
import { PriceCacheService } from './price-cache.service';
import { DayPrices, HourlyPrice, PRICE_AREAS } from '../../models/price.model';
import { environment } from '../../../environments/environment';

// CI has no NORDPOOL_API_URL (.env ships it empty; the real value lives in gitignored
// .env.local), and the service short-circuits to 'not-configured' on an empty base URL.
// Pin a URL for the duration of the suite so these tests exercise the HTTP path everywhere.
const TEST_API_URL = 'https://test.invalid/api/DayAheadPrices';

function entry(area: string, value: number) {
  return {
    localDeliveryStart: '2026-05-17T00:00:00',
    localDeliveryEnd: '2026-05-17T00:15:00',
    entryPerArea: { [area]: value },
  };
}

describe('NordpoolService.getDayPrices', () => {
  let service: NordpoolService;
  let httpMock: HttpTestingController;
  let cache: PriceCacheService;
  const realApiUrl = environment.nordpoolApiUrl;

  beforeEach(() => {
    // The service reads environment.nordpoolApiUrl once at construction, so this has to be
    // set before TestBed instantiates it.
    environment.nordpoolApiUrl = TEST_API_URL;
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
    environment.nordpoolApiUrl = realApiUrl;
  });

  it('requests every area in a single call', () => {
    service.getDayPrices('2026-05-17').subscribe();

    const all = PRICE_AREAS.map((a) => a.value).join(',');
    const req = httpMock.expectOne((r) => r.url.includes(`deliveryArea=${all}&`));
    expect(req.request.url).toContain('date=2026-05-17');
    req.flush({ multiAreaEntries: [entry('DK1', 500)] });
  });

  it('maps each area and converts NOK/MWh to øre/kWh', () => {
    let result: DayPrices | undefined;
    service.getDayPrices('2026-05-17').subscribe((r) => (result = r));

    httpMock
      .expectOne(() => true)
      .flush({
        multiAreaEntries: [
          {
            localDeliveryStart: '2026-05-17T00:00:00',
            localDeliveryEnd: '2026-05-17T00:15:00',
            entryPerArea: { NO1: 400, DK1: 500 },
          },
        ],
      });

    expect(result!['NO1']?.[0].ore_per_kWh).toBe(40);
    expect(result!['DK1']?.[0].ore_per_kWh).toBe(50);
  });

  it('makes no request when the date is cached', () => {
    const cached: HourlyPrice[] = [
      { ore_per_kWh: 40, time_start: '2026-05-17T00:00:00', time_end: '2026-05-17T00:15:00' },
    ];
    cache.set('2026-05-17', { NO1: cached });

    let result: DayPrices | undefined;
    service.getDayPrices('2026-05-17').subscribe((r) => (result = r));

    httpMock.expectNone(() => true);
    expect(result).toEqual({ NO1: cached });
  });

  it('omits areas the API returned no data for', () => {
    let result: DayPrices | undefined;
    service.getDayPrices('2026-05-17').subscribe((r) => (result = r));

    httpMock.expectOne(() => true).flush({ multiAreaEntries: [entry('NO1', 400)] });

    expect(Object.keys(result!)).toEqual(['NO1']);
  });

  it('returns an empty result for a null response body', () => {
    let result: DayPrices | undefined;
    service.getDayPrices('2026-05-17').subscribe((r) => (result = r));

    httpMock.expectOne(() => true).flush(null);

    expect(result).toEqual({});
  });

  it('does not cache an empty day, so an unpublished date is retried', () => {
    service.getDayPrices('2026-05-18').subscribe();
    httpMock.expectOne(() => true).flush({ multiAreaEntries: [] });

    expect(cache.get('2026-05-18')).toBeNull();
  });

  it('caches the fetched day so a later call skips the network', () => {
    service.getDayPrices('2026-05-17').subscribe();
    httpMock.expectOne(() => true).flush({ multiAreaEntries: [entry('NO1', 400)] });

    let second: DayPrices | undefined;
    service.getDayPrices('2026-05-17').subscribe((r) => (second = r));

    httpMock.expectNone(() => true);
    expect(second!['NO1']?.[0].ore_per_kWh).toBe(40);
  });
});
