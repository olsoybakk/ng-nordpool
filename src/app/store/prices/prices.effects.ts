import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, mergeMap, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { EMPTY, from, of, timer } from 'rxjs';
import { NordpoolService } from '../../services/nordpool.service';
import { LocationService } from '../../services/location.service';
import { LanguageService } from '../../services/language.service';
import { selectSelectedDate, selectDateRangeDays, selectLoadedDates } from './prices.selectors';
import * as PricesActions from './prices.actions';
import { subtractDays } from '../../utils/date';

@Injectable()
export class PricesEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly nordpoolService = inject(NordpoolService);
  private readonly locationService = inject(LocationService);
  private readonly ls = inject(LanguageService);

  persistSelectedArea$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(PricesActions.selectArea),
        tap(({ area }) => localStorage.setItem('selectedArea', area)),
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
              PricesActions.loadAllAreaPrices({ date }),
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
          catchError(() =>
            of(
              PricesActions.loadPricesFailure({
                error: this.ls.t().failedToLoad,
              }),
            ),
          ),
        ),
      ),
    ),
  );

  /** Fetch all areas for a single date — mergeMap so concurrent date fetches all complete. */
  loadAllAreaPrices$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PricesActions.loadAllAreaPrices),
      mergeMap(({ date }) =>
        this.nordpoolService.getAllAreaPrices(date).pipe(
          mergeMap((results) => {
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
          catchError(() =>
            of(
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

  /** When date or range changes, dispatch loadAllAreaPrices only for dates not yet in the store. */
  loadMultiDayPrices$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PricesActions.selectDate, PricesActions.setDateRangeDays),
      withLatestFrom(
        this.store.select(selectSelectedDate),
        this.store.select(selectDateRangeDays),
        this.store.select(selectLoadedDates),
      ),
      mergeMap(([, date, days, loadedDates]) => {
        const loaded = new Set(loadedDates);
        const dates = Array.from({ length: days }, (_, i) => subtractDays(date, i)).filter(
          (d) => !loaded.has(d),
        );
        return from(dates.map((d) => PricesActions.loadAllAreaPrices({ date: d })));
      }),
    ),
  );
}
