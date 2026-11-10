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
import { DayPrices, PriceArea, PricesState } from '../../models/price.model';

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
  let nordpoolService: { getDayPrices: ReturnType<typeof vi.fn> };
  let locationService: { detectPriceArea: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.clear();
    // A plain Subject, not a ReplaySubject: every test subscribes to the effect before
    // dispatching, and a ReplaySubject would replay the previous test's/action's last value to
    // a later `.subscribe()` in the same test (e.g. the "stream survives a failure" case below).
    actions$ = new Subject();
    nordpoolService = { getDayPrices: vi.fn() };
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
  });

  describe('loadAllAreaPrices$', () => {
    it('dispatches success only when the API returns data', async () => {
      const results: DayPrices = {
        NO1: [
          { ore_per_kWh: 100, time_start: '2026-05-17T00:00:00', time_end: '2026-05-17T00:15:00' },
        ],
      };
      nordpoolService.getDayPrices.mockReturnValue(of(results));

      const result = firstEmission(effects.loadAllAreaPrices$);
      actions$.next(PricesActions.loadAllAreaPrices({ date: '2026-05-17', at: 1 }));

      expect(await result).toEqual(
        PricesActions.loadAllAreaPricesSuccess({ date: '2026-05-17', results }),
      );
    });

    it('dispatches loadAllAreaPricesFailure when the API URL is not configured', async () => {
      nordpoolService.getDayPrices.mockReturnValue(throwError(() => new Error('not-configured')));

      const result = firstEmission(effects.loadAllAreaPrices$);
      actions$.next(PricesActions.loadAllAreaPrices({ date: '2026-05-17', at: 1 }));

      expect(await result).toEqual(
        PricesActions.loadAllAreaPricesFailure({ error: 'API URL is not configured' }),
      );
    });

    it('dispatches success with empty results plus a notification on a total miss', async () => {
      nordpoolService.getDayPrices.mockReturnValue(of({}));

      const result = collect(effects.loadAllAreaPrices$, 2);
      actions$.next(PricesActions.loadAllAreaPrices({ date: '2026-05-17', at: 1 }));

      const [success, notification] = await result;
      expect(success).toEqual(
        PricesActions.loadAllAreaPricesSuccess({ date: '2026-05-17', results: {} }),
      );
      expect(notification.type).toBe(PricesActions.setNotification.type);
    });

    it('treats an HTTP/null-body error the same as a total miss', async () => {
      nordpoolService.getDayPrices.mockReturnValue(throwError(() => new Error('boom')));

      const result = collect(effects.loadAllAreaPrices$, 2);
      actions$.next(PricesActions.loadAllAreaPrices({ date: '2026-05-17', at: 1 }));

      const [success, notification] = await result;
      expect(success).toEqual(
        PricesActions.loadAllAreaPricesSuccess({ date: '2026-05-17', results: {} }),
      );
      expect(notification.type).toBe(PricesActions.setNotification.type);
    });

    it('does not permanently break the effect stream after a failure', async () => {
      nordpoolService.getDayPrices.mockReturnValueOnce(throwError(() => new Error('boom')));
      nordpoolService.getDayPrices.mockReturnValueOnce(
        of({ NO1: [{ ore_per_kWh: 1, time_start: 'a', time_end: 'b' }] }),
      );

      // Drain the two actions from the first (failing) request.
      const first = collect(effects.loadAllAreaPrices$, 2);
      actions$.next(PricesActions.loadAllAreaPrices({ date: '2026-05-17', at: 1 }));
      await first;

      const second = firstEmission(effects.loadAllAreaPrices$);
      actions$.next(PricesActions.loadAllAreaPrices({ date: '2026-05-18', at: 2 }));
      const action = (await second) as ReturnType<typeof PricesActions.loadAllAreaPricesSuccess>;
      expect(action.date).toBe('2026-05-18');
      expect(action.results['NO1']).toBeDefined();
    });
  });

  describe('detectLocation$', () => {
    it('dispatches selectArea on success — every area is already loaded', async () => {
      locationService.detectPriceArea.mockReturnValue(of('NO3' as PriceArea));

      const result = firstEmission(effects.detectLocation$);
      actions$.next(PricesActions.detectLocation());

      expect(await result).toEqual(PricesActions.selectArea({ area: 'NO3' }));
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

      const result = firstEmission(effects.detectLocation$);
      actions$.next(PricesActions.detectLocation());
      expect(await result).toEqual(PricesActions.selectArea({ area: 'NO2' }));
    });
  });

  describe('planPriceFetches$', () => {
    it.each([
      PricesActions.requestPriceData(),
      PricesActions.selectDate({ date: '2026-05-17' }),
      PricesActions.setDateRangeDays({ days: 2 }),
    ])('fires on %o and dispatches loadAllAreaPrices for the missing date', async (trigger) => {
      store.setState(rootState({ selectedDate: '2026-05-17', dateRangeDays: 1 }));

      const result = firstEmission(effects.planPriceFetches$);
      actions$.next(trigger);

      const action = (await result) as ReturnType<typeof PricesActions.loadAllAreaPrices>;
      expect(action.type).toBe(PricesActions.loadAllAreaPrices.type);
      expect(action.date).toBe('2026-05-17');
    });

    it.each([
      PricesActions.toggleCountry({ code: 'SE' }),
      PricesActions.setEnabledCountries({ codes: ['NO', 'DK'] }),
      PricesActions.selectArea({ area: 'SE3' }),
    ])('does not fetch on %o — every area is already loaded', async (trigger) => {
      store.setState(rootState({ selectedDate: '2026-05-17', dateRangeDays: 1 }));

      let emitted = 0;
      effects.planPriceFetches$.subscribe(() => emitted++);
      actions$.next(trigger);
      await new Promise((r) => setTimeout(r, 0));
      expect(emitted).toBe(0);
    });

    it('dispatches one loadAllAreaPrices per missing date of the range', async () => {
      store.setState(
        rootState({
          selectedDate: '2026-05-17',
          dateRangeDays: 3,
          allAreaPricesByDate: {
            '2026-05-16': { NO1: [{ ore_per_kWh: 1, time_start: 'a', time_end: 'b' }] },
          },
        }),
      );

      const result = collect(effects.planPriceFetches$, 2);
      actions$.next(PricesActions.requestPriceData());

      const dates = (await result).map(
        (a) => (a as ReturnType<typeof PricesActions.loadAllAreaPrices>).date,
      );
      expect(dates).toEqual(['2026-05-17', '2026-05-15']);
    });

    it('does not re-plan a date that already has data', async () => {
      store.setState(
        rootState({
          selectedDate: '2026-05-17',
          dateRangeDays: 1,
          allAreaPricesByDate: {
            '2026-05-17': { NO1: [{ ore_per_kWh: 1, time_start: 'a', time_end: 'b' }] },
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
