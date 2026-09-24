import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LocationService } from './location.service';
import { PriceArea } from '../../models/price.model';

type GeoSuccess = (pos: GeolocationPosition) => void;
type GeoError = (err: GeolocationPositionError) => void;

function position(lat: number, lon: number): GeolocationPosition {
  return { coords: { latitude: lat, longitude: lon } } as GeolocationPosition;
}

describe('LocationService', () => {
  let service: LocationService;
  let httpMock: HttpTestingController;
  let getCurrentPosition: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getCurrentPosition = vi.fn();
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });

    TestBed.configureTestingModule({
      providers: [LocationService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LocationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function resolveWith(lat: number, lon: number, countryCode: string): Promise<PriceArea> {
    getCurrentPosition.mockImplementation((success: GeoSuccess) => success(position(lat, lon)));
    const result = new Promise<PriceArea>((resolve) => {
      service.detectPriceArea().subscribe(resolve);
    });
    httpMock
      .expectOne((r) => r.url.startsWith('https://nominatim.openstreetmap.org/reverse'))
      .flush({ address: { country_code: countryCode } });
    return result;
  }

  describe('Norwegian bidding zones', () => {
    it.each<[string, number, number, PriceArea]>([
      ['far north -> NO4', 66, 15, 'NO4'],
      ['west coast -> NO5', 60, 5, 'NO5'],
      ['south, west of 9E -> NO2', 58, 8, 'NO2'],
      ['central, north of 62N -> NO3', 63, 10, 'NO3'],
      ['default (Oslo area) -> NO1', 59.9, 10.7, 'NO1'],
    ])('%s', async (_label, lat, lon, expected) => {
      await expect(resolveWith(lat, lon, 'no')).resolves.toBe(expected);
    });
  });

  describe('Swedish bidding zones', () => {
    it.each<[string, number, PriceArea]>([
      ['north of 64N -> SE1', 65, 'SE1'],
      ['60-64N -> SE2', 61, 'SE2'],
      ['57-60N -> SE3', 58, 'SE3'],
      ['south of 57N -> SE4', 56, 'SE4'],
    ])('%s', async (_label, lat, expected) => {
      await expect(resolveWith(lat, 15, 'se')).resolves.toBe(expected);
    });
  });

  it('splits Denmark into DK1/DK2 at 10E', async () => {
    await expect(resolveWith(56, 9, 'dk')).resolves.toBe('DK1');
    await expect(resolveWith(56, 11, 'dk')).resolves.toBe('DK2');
  });

  it.each<[string, PriceArea]>([
    ['fi', 'FI'],
    ['ee', 'EE'],
    ['lt', 'LT'],
    ['lv', 'LV'],
  ])('maps %s to its single area', async (code, expected) => {
    await expect(resolveWith(50, 20, code)).resolves.toBe(expected);
  });

  it('falls back to NO1 for an unmodelled country', async () => {
    await expect(resolveWith(48, 2, 'fr')).resolves.toBe('NO1');
  });

  it('country-code matching is case-insensitive', async () => {
    await expect(resolveWith(59.9, 10.7, 'NO')).resolves.toBe('NO1');
  });

  it('propagates a geolocation error (e.g. permission denied) to the caller', async () => {
    getCurrentPosition.mockImplementation((_success: GeoSuccess, error: GeoError) =>
      error({ code: 1, message: 'denied' } as GeolocationPositionError),
    );

    const result = new Promise<unknown>((resolve, reject) => {
      service.detectPriceArea().subscribe({ error: reject, next: resolve });
    });

    await expect(result).rejects.toBeTruthy();
  });
});
