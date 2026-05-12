import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, mergeMap, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { EMPTY, of } from 'rxjs';
import { NordpoolService } from '../../services/nordpool.service';
import { LocationService } from '../../services/location.service';
import { selectSelectedDate } from './prices.selectors';
import * as PricesActions from './prices.actions';

@Injectable()
export class PricesEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly nordpoolService = inject(NordpoolService);
  private readonly locationService = inject(LocationService);

  persistSelectedArea$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(PricesActions.selectArea),
        tap(({ area }) => localStorage.setItem('selectedArea', area))
      ),
    { dispatch: false }
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
              PricesActions.loadAllAreaPrices({ date })
            )
          ),
          catchError(() => EMPTY)
        )
      )
    )
  );

  loadPrices$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PricesActions.loadPrices),
      switchMap(({ area, date }) =>
        this.nordpoolService.getPrices(date, area).pipe(
          map((prices) => PricesActions.loadPricesSuccess({ prices })),
          catchError((error) =>
            of(PricesActions.loadPricesFailure({
              error: error?.message ?? 'Failed to load prices',
            }))
          )
        )
      )
    )
  );

  loadAllAreaPrices$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PricesActions.loadAllAreaPrices),
      switchMap(({ date }) =>
        this.nordpoolService.getAllAreaPrices(date).pipe(
          map((results) => PricesActions.loadAllAreaPricesSuccess({ results })),
          catchError((error) =>
            of(PricesActions.loadAllAreaPricesFailure({
              error: error?.message ?? 'Failed to load all area prices',
            }))
          )
        )
      )
    )
  );
}
