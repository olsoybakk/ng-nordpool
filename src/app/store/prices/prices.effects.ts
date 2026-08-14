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
import { NordpoolService } from '../../services/nordpool.service';
import { LocationService } from '../../services/location.service';
import { LanguageService } from '../../services/language.service';
import {
  selectSelectedDate,
  selectPricesState,
  selectSelectedArea,
  selectEnabledCountries,
} from './prices.selectors';
import * as PricesActions from './prices.actions';
import { subtractDays } from '../../utils/date';
import { areasForCountries } from '../../models/price.model';
import { planAreaFetches } from './fetch-plan';

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
        tap((area) => localStorage.setItem('selectedArea', area)),
      ),
    { dispatch: false },
  );

  persistEnabledCountries$ = createEffect(
    () =>
      this.store.select(selectEnabledCountries).pipe(
        skip(1),
        distinctUntilChanged(),
        tap((codes) => localStorage.setItem('enabledCountries', JSON.stringify(codes))),
      ),
    { dispatch: false },
  );

  persistSelectedDate$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(PricesActions.selectDate),
        tap(({ date }) =>
          localStorage.setItem('selectedDate', JSON.stringify({ date, savedAt: Date.now() })),
        ),
      ),
    { dispatch: false },
  );

  persistDateRangeDays$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(PricesActions.setDateRangeDays),
        tap(({ days }) => localStorage.setItem('dateRangeDays', String(days))),
      ),
    { dispatch: false },
  );

  detectLocation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PricesActions.detectLocation),
      withLatestFrom(this.store.select(selectSelectedDate)),
      switchMap(([, date]) =>
        this.locationService.detectPriceArea().pipe(
          mergeMap((area) =>
            of(
              PricesActions.selectArea({ area }),
              PricesActions.loadPrices({ area, date }),
              PricesActions.requestPriceData(),
            ),
          ),
          catchError(() => EMPTY),
        ),
      ),
    ),
  );

  loadPrices$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PricesActions.loadPrices),
      switchMap(({ area, date }) =>
        this.nordpoolService.getPrices(date, area).pipe(
          map((prices) => PricesActions.loadPricesSuccess({ prices })),
          catchError((err: Error) =>
            of(
              PricesActions.loadPricesFailure({
                error:
                  err.message === 'not-configured'
                    ? 'API URL is not configured'
                    : this.ls.t().failedToLoad,
              }),
            ),
          ),
        ),
      ),
    ),
  );

  /** Fetch the requested areas for a single date — mergeMap so concurrent date fetches complete. */
  loadAllAreaPrices$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PricesActions.loadAllAreaPrices),
      mergeMap(({ date, areas }) =>
        this.nordpoolService.getAllAreaPrices(date, areas).pipe(
          mergeMap((results) => {
            // Only a total miss warrants a toast. A partial miss just leaves that area without a
            // line, and the attempt record stops it being re-requested.
            const noData = Object.keys(results).length === 0;
            return noData
              ? of(
                  PricesActions.loadAllAreaPricesSuccess({ date, areas, results: {} }),
                  PricesActions.setNotification({
                    message: this.ls.t().dataNotAvailable,
                  }),
                )
              : of(PricesActions.loadAllAreaPricesSuccess({ date, areas, results }));
          }),
          catchError((err: Error) =>
            of(
              PricesActions.loadAllAreaPricesSuccess({ date, areas, results: {} }),
              PricesActions.setNotification({
                message:
                  err.message === 'not-configured'
                    ? 'API URL is not configured.'
                    : 'Price data is not available for all selected dates.',
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
   * can widen the required date+area set funnels through here, so the attempt bookkeeping and the
   * `at` timestamp are constructed once.
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
        PricesActions.toggleCountry,
        PricesActions.setEnabledCountries,
        PricesActions.selectArea,
      ),
      withLatestFrom(this.store.select(selectPricesState)),
      mergeMap(([, state]) => {
        const dates = Array.from({ length: state.dateRangeDays }, (_, i) =>
          subtractDays(state.selectedDate, i),
        );
        const areas = areasForCountries(state.enabledCountries);
        const plan = planAreaFetches(state, dates, areas, Date.now());
        return from(
          plan.map(({ date, areas: missing }) =>
            PricesActions.loadAllAreaPrices({ date, areas: missing, at: Date.now() }),
          ),
        );
      }),
    ),
  );

  /** Toggling a country can reassign selectedArea, so reload the single-area series for it. */
  loadPricesAfterCountryToggle$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PricesActions.toggleCountry, PricesActions.setEnabledCountries),
      withLatestFrom(this.store.select(selectSelectedArea), this.store.select(selectSelectedDate)),
      map(([, area, date]) => PricesActions.loadPrices({ area, date })),
    ),
  );
}
