import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Observable, Subject, firstValueFrom, of, throwError } from 'rxjs';
import { take, toArray } from 'rxjs/operators';
import { PricesEffects } from './prices.effects';
import { NordpoolService } from '../../core/services/nordpool.service';
import { LocationService } from '../../core/services/location.service';
import { LanguageService } from '../../core/services/language.service';
import * as PricesActions from './prices.actions';
import { initialState } from './prices.reducer';
import { HourlyPrice, PriceArea, PricesState } from '../../models/price.model';

// take(n) unsubscribes once n values arrive, so a resolved helper never keeps listening for
// (and double-consuming) actions dispatched later in the same test.
function firstEmission<T>(source: Observable<T>): Promise<T> {
  return firstValueFrom(source.pipe(take(1)));
}

function collect<T>(source: Observable<T>, count: number): Promise<T[]> {
  return firstValueFrom(source.pipe(take(count), toArray()));
}

function rootState(overrides: Partial<PricesState> = {}): { prices: PricesState } {
  return { prices: { ...initialState, ...overrides } };
}

describe('PricesEffects', () => {
  let actions$: Subject<unknown>;
  let store: MockStore;
  let effects: PricesEffects;
  let languageService: LanguageService;
  let nordpoolService: {
    getPrices: ReturnType<typeof vi.fn>;
    getAllAreaPrices: ReturnType<typeof vi.fn>;
  };
  let locationService: { detectPriceArea: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.clear();
    // A plain Subject, not a ReplaySubject: every test subscribes to the effect before
    // dispatching, and a ReplaySubject would replay the previous test's/action's last value to
    // a later `.subscribe()` in the same test (e.g. the "stream survives a failure" case below).
    actions$ = new Subject();
    nordpoolService = { getPrices: vi.fn(), getAllAreaPrices: vi.fn() };
    locationService = { detectPriceArea: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        PricesEffects,
        provideMockActions(() => actions$),
        provideMockStore({ initialState: rootState() }),
        { provide: NordpoolService, useValue: nordpoolService },
        { provide: LocationService, useValue: locationService },
        LanguageService,
      ],
    });

    effects = TestBed.inject(PricesEffects);
    store = TestBed.inject(MockStore);
    languageService = TestBed.inject(LanguageService);
  });

  describe('loadPrices$', () => {
    it('dispatches loadPricesSuccess on a successful fetch', async () => {
      const prices: HourlyPrice[] = [
        { ore_per_kWh: 100, time_start: '2026-05-17T00:00:00', time_end: '2026-05-17T00:15:00' },
      ];
      nordpoolService.getPrices.mockReturnValue(of(prices));

      const result = firstEmission(effects.loadPrices$);
      actions$.next(PricesActions.loadPrices({ area: 'NO1', date: '2026-05-17' }));

      expect(await result).toEqual(PricesActions.loadPricesSuccess({ prices }));
    });

    it('dispatches loadPricesFailure with a generic message on a network error', async () => {
      nordpoolService.getPrices.mockReturnValue(throwError(() => new Error('network down')));

      const result = firstEmission(effects.loadPrices$);
      actions$.next(PricesActions.loadPrices({ area: 'NO1', date: '2026-05-17' }));

      const action = (await result) as ReturnType<typeof PricesActions.loadPricesFailure>;
      expect(action.type).toBe(PricesActions.loadPricesFailure.type);
      expect(action.error).toBe(languageService.t().failedToLoad);
    });

    it('dispatches a specific error when the API URL is not configured', async () => {
      nordpoolService.getPrices.mockReturnValue(throwError(() => new Error('not-configured')));

      const result = firstEmission(effects.loadPrices$);
      actions$.next(PricesActions.loadPrices({ area: 'NO1', date: '2026-05-17' }));

      const action = (await result) as ReturnType<typeof PricesActions.loadPricesFailure>;
      expect(action.error).toBe('API URL is not configured');
    });
  });

  describe('loadAllAreaPrices$', () => {
    it('dispatches success only when the API returns data', async () => {
      const results: Partial<Record<PriceArea, HourlyPrice[]>> = {
        NO1: [
          { ore_per_kWh: 100, time_start: '2026-05-17T00:00:00', time_end: '2026-05-17T00:15:00' },
        ],
      };
      nordpoolService.getAllAreaPrices.mockReturnValue(of(results));

      const result = firstEmission(effects.loadAllAreaPrices$);
      actions$.next(PricesActions.loadAllAreaPrices({ date: '2026-05-17', areas: ['NO1'], at: 1 }));

      expect(await result).toEqual(
        PricesActions.loadAllAreaPricesSuccess({ date: '2026-05-17', areas: ['NO1'], results }),
      );
    });

    it('dispatches success with empty results plus a notification on a total miss', async () => {
      nordpoolService.getAllAreaPrices.mockReturnValue(of({}));

      const result = collect(effects.loadAllAreaPrices$, 2);
      actions$.next(PricesActions.loadAllAreaPrices({ date: '2026-05-17', areas: ['NO1'], at: 1 }));

      const [success, notification] = await result;
      expect(success).toEqual(
        PricesActions.loadAllAreaPricesSuccess({ date: '2026-05-17', areas: ['NO1'], results: {} }),
      );
      expect(notification.type).toBe(PricesActions.setNotification.type);
    });

    it('treats an HTTP/null-body error the same as a total miss', async () => {
      nordpoolService.getAllAreaPrices.mockReturnValue(throwError(() => new Error('boom')));

      const result = collect(effects.loadAllAreaPrices$, 2);
      actions$.next(PricesActions.loadAllAreaPrices({ date: '2026-05-17', areas: ['NO1'], at: 1 }));

      const [success, notification] = await result;
      expect(success).toEqual(
        PricesActions.loadAllAreaPricesSuccess({ date: '2026-05-17', areas: ['NO1'], results: {} }),
      );
      expect(notification.type).toBe(PricesActions.setNotification.type);
    });

    it('does not permanently break the effect stream after a failure', async () => {
      nordpoolService.getAllAreaPrices.mockReturnValueOnce(throwError(() => new Error('boom')));
      nordpoolService.getAllAreaPrices.mockReturnValueOnce(
        of({ NO1: [{ ore_per_kWh: 1, time_start: 'a', time_end: 'b' }] }),
      );

      // Drain the two actions from the first (failing) request.
      const first = collect(effects.loadAllAreaPrices$, 2);
      actions$.next(PricesActions.loadAllAreaPrices({ date: '2026-05-17', areas: ['NO1'], at: 1 }));
      await first;

      const second = firstEmission(effects.loadAllAreaPrices$);
      actions$.next(PricesActions.loadAllAreaPrices({ date: '2026-05-18', areas: ['NO1'], at: 2 }));
      const action = (await second) as ReturnType<typeof PricesActions.loadAllAreaPricesSuccess>;
      expect(action.date).toBe('2026-05-18');
      expect(action.results['NO1']).toBeDefined();
    });
  });

  describe('detectLocation$', () => {
    it('dispatches selectArea, loadPrices and requestPriceData on success', async () => {
      store.setState(rootState({ selectedDate: '2026-05-17' }));
      locationService.detectPriceArea.mockReturnValue(of('NO3' as PriceArea));

      const result = collect(effects.detectLocation$, 3);
      actions$.next(PricesActions.detectLocation());

      const [selectArea, loadPrices, requestPriceData] = await result;
      expect(selectArea).toEqual(PricesActions.selectArea({ area: 'NO3' }));
      expect(loadPrices).toEqual(PricesActions.loadPrices({ area: 'NO3', date: '2026-05-17' }));
      expect(requestPriceData).toEqual(PricesActions.requestPriceData());
    });

    it('falls back to silence (no dispatch) when detection fails, without breaking the stream', async () => {
      locationService.detectPriceArea.mockReturnValueOnce(throwError(() => new Error('denied')));
      locationService.detectPriceArea.mockReturnValueOnce(of('NO2' as PriceArea));

      let emitted = 0;
      const sub = effects.detectLocation$.subscribe(() => emitted++);

      actions$.next(PricesActions.detectLocation());
      // Give the failing pipe a tick to resolve to EMPTY.
      await new Promise((r) => setTimeout(r, 0));
      expect(emitted).toBe(0);
      sub.unsubscribe();

      const result = collect(effects.detectLocation$, 3);
      actions$.next(PricesActions.detectLocation());
      const [selectArea] = await result;
      expect(selectArea).toEqual(PricesActions.selectArea({ area: 'NO2' }));
    });
  });

  describe('planPriceFetches$', () => {
    it.each([
      PricesActions.requestPriceData(),
      PricesActions.selectDate({ date: '2026-05-17' }),
      PricesActions.setDateRangeDays({ days: 2 }),
      PricesActions.toggleCountry({ code: 'SE' }),
      PricesActions.setEnabledCountries({ codes: ['NO'] }),
      PricesActions.selectArea({ area: 'NO2' }),
    ])('fires on %o and dispatches loadAllAreaPrices for the missing areas', async (trigger) => {
      store.setState(
        rootState({
          selectedDate: '2026-05-17',
          dateRangeDays: 1,
          enabledCountries: ['NO'],
        }),
      );

      const result = firstEmission(effects.planPriceFetches$);
      actions$.next(trigger);

      const action = (await result) as ReturnType<typeof PricesActions.loadAllAreaPrices>;
      expect(action.type).toBe(PricesActions.loadAllAreaPrices.type);
      expect(action.date).toBe('2026-05-17');
    });

    it('does not re-plan a date/area combination that already has data', async () => {
      store.setState(
        rootState({
          selectedDate: '2026-05-17',
          dateRangeDays: 1,
          enabledCountries: ['NO'],
          allAreaPricesByDate: {
            '2026-05-17': {
              NO1: [{ ore_per_kWh: 1, time_start: 'a', time_end: 'b' }],
              NO2: [{ ore_per_kWh: 1, time_start: 'a', time_end: 'b' }],
              NO3: [{ ore_per_kWh: 1, time_start: 'a', time_end: 'b' }],
              NO4: [{ ore_per_kWh: 1, time_start: 'a', time_end: 'b' }],
              NO5: [{ ore_per_kWh: 1, time_start: 'a', time_end: 'b' }],
            },
          },
        }),
      );

      let emitted = 0;
      effects.planPriceFetches$.subscribe(() => emitted++);
      actions$.next(PricesActions.requestPriceData());
      await new Promise((r) => setTimeout(r, 0));
      expect(emitted).toBe(0);
    });
  });

  describe('persistSelectedArea$', () => {
    it('does not persist the initial (hydrated) value, only subsequent changes', async () => {
      store.setState(rootState({ selectedArea: 'NO1' }));
      effects.persistSelectedArea$.subscribe();
      // Initial emission on subscribe must be skipped.
      expect(localStorage.getItem('selectedArea')).toBeNull();

      store.setState(rootState({ selectedArea: 'NO2' }));
      await new Promise((r) => setTimeout(r, 0));
      expect(localStorage.getItem('selectedArea')).toBe('NO2');
    });
  });

  describe('persistEnabledCountries$', () => {
    it('does not persist the initial (hydrated) value, only subsequent changes', async () => {
      store.setState(rootState({ enabledCountries: ['NO'] }));
      effects.persistEnabledCountries$.subscribe();
      expect(localStorage.getItem('enabledCountries')).toBeNull();

      store.setState(rootState({ enabledCountries: ['NO', 'SE'] }));
      await new Promise((r) => setTimeout(r, 0));
      expect(JSON.parse(localStorage.getItem('enabledCountries')!)).toEqual(['NO', 'SE']);
    });
  });

  describe('persistSelectedDate$', () => {
    it('writes the date and a timestamp on selectDate', async () => {
      effects.persistSelectedDate$.subscribe();
      actions$.next(PricesActions.selectDate({ date: '2026-05-20' }));
      await new Promise((r) => setTimeout(r, 0));

      const stored = JSON.parse(localStorage.getItem('selectedDate')!) as {
        date: string;
        savedAt: number;
      };
      expect(stored.date).toBe('2026-05-20');
      expect(typeof stored.savedAt).toBe('number');
    });
  });

  describe('persistDateRangeDays$', () => {
    it('writes the day count on setDateRangeDays', async () => {
      effects.persistDateRangeDays$.subscribe();
      actions$.next(PricesActions.setDateRangeDays({ days: 5 }));
      await new Promise((r) => setTimeout(r, 0));

      expect(localStorage.getItem('dateRangeDays')).toBe('5');
    });
  });
});
