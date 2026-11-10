import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  catchError,
  distinctUntilChanged,
  map,
  mergeMap,
  skip,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { EMPTY, from, of, timer } from 'rxjs';
import { NordpoolService } from '../../core/services/nordpool.service';
import { LocationService } from '../../core/services/location.service';
import { LanguageService } from '../../core/services/language.service';
import { selectPricesState, selectSelectedArea, selectEnabledCountries } from './prices.selectors';
import * as PricesActions from './prices.actions';
import { subtractDays } from '../../utils/date';
import { safeLocalStorageSet } from '../../utils/local-storage';
import { planDateFetches } from './fetch-plan';

@Injectable()
export class PricesEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly nordpoolService = inject(NordpoolService);
  private readonly locationService = inject(LocationService);
  private readonly ls = inject(LanguageService);

  /**
   * State-driven, not payload-driven: the reducer can now correct selectedArea when its country
   * is switched off, so persisting the action payload would leave a disabled area in storage.
   *
   * skip(1) is load-bearing. store.select emits immediately on subscribe, and effects are
   * registered at bootstrap — without it the hydrated default would be written before
   * DashboardComponent.ngOnInit runs, and geolocation detection (gated on selectedArea being
   * absent from localStorage) would never fire for a first-time visitor.
   */
  persistSelectedArea$ = createEffect(
    () =>
      this.store.select(selectSelectedArea).pipe(
        skip(1),
        distinctUntilChanged(),
        tap((area) => safeLocalStorageSet('selectedArea', area)),
      ),
    { dispatch: false },
  );

  persistEnabledCountries$ = createEffect(
    () =>
      this.store.select(selectEnabledCountries).pipe(
        skip(1),
        distinctUntilChanged(),
        tap((codes) => safeLocalStorageSet('enabledCountries', JSON.stringify(codes))),
      ),
    { dispatch: false },
  );

  persistSelectedDate$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(PricesActions.selectDate),
        tap(({ date }) =>
          safeLocalStorageSet('selectedDate', JSON.stringify({ date, savedAt: Date.now() })),
        ),
      ),
    { dispatch: false },
  );

  persistDateRangeDays$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(PricesActions.setDateRangeDays),
        tap(({ days }) => safeLocalStorageSet('dateRangeDays', String(days))),
      ),
    { dispatch: false },
  );

  detectLocation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PricesActions.detectLocation),
      switchMap(() =>
        this.locationService.detectPriceArea().pipe(
          map((area) => PricesActions.selectArea({ area })),
          catchError(() => EMPTY),
        ),
      ),
    ),
  );

  /** Fetch every area for a single date — mergeMap so concurrent date fetches complete. */
  loadAllAreaPrices$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PricesActions.loadAllAreaPrices),
      mergeMap(({ date }) =>
        this.nordpoolService.getDayPrices(date).pipe(
          mergeMap((results) => {
            // Only a total miss warrants a toast. A partial miss just leaves that area without a
            // line, and the attempt record stops the date being re-requested.
            const noData = Object.keys(results).length === 0;
            return noData
              ? of(
                  PricesActions.loadAllAreaPricesSuccess({ date, results: {} }),
                  PricesActions.setNotification({
                    message: this.ls.t().dataNotAvailable,
                  }),
                )
              : of(PricesActions.loadAllAreaPricesSuccess({ date, results }));
          }),
          catchError((err: Error) =>
            err.message === 'not-configured'
              ? of(PricesActions.loadAllAreaPricesFailure({ error: 'API URL is not configured' }))
              : of(
                  PricesActions.loadAllAreaPricesSuccess({ date, results: {} }),
                  PricesActions.setNotification({
                    message: 'Price data is not available for all selected dates.',
                  }),
                ),
          ),
        ),
      ),
    ),
  );

  /** Auto-dismiss the notification after 5 s; resets the timer if a new one arrives. */
  clearNotificationAfterDelay$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PricesActions.setNotification),
      switchMap(() => timer(5000).pipe(map(() => PricesActions.clearNotification()))),
    ),
  );

  /**
   * The single place that turns "we might need data" into concrete fetches. Every trigger that
   * can widen the required date set funnels through here, so the attempt bookkeeping and the
   * `at` timestamp are constructed once. Country and area changes are not triggers: every fetch
   * already covers all areas.
   *
   * Deliberately keyed on actions, never on loadAllAreaPricesSuccess — keying it on the success
   * action would close the loop and let it re-plan itself indefinitely.
   */
  planPriceFetches$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        PricesActions.requestPriceData,
        PricesActions.selectDate,
        PricesActions.setDateRangeDays,
      ),
      withLatestFrom(this.store.select(selectPricesState)),
      mergeMap(([, state]) => {
        const dates = Array.from({ length: state.dateRangeDays }, (_, i) =>
          subtractDays(state.selectedDate, i),
        );
        const now = Date.now();
        return from(
          planDateFetches(state, dates, now).map((date) =>
            PricesActions.loadAllAreaPrices({ date, at: now }),
          ),
        );
      }),
    ),
  );
}
