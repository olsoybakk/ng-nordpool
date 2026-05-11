import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { forkJoin, of, Observable } from 'rxjs';
import { NordpoolService } from '../../services/nordpool.service';
import { PRICE_AREAS, HourlyPrice, PriceArea } from '../../models/price.model';
import * as PricesActions from './prices.actions';

@Injectable()
export class PricesEffects {
  private readonly actions$ = inject(Actions);
  private readonly nordpoolService = inject(NordpoolService);

  persistSelectedArea$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(PricesActions.selectArea),
        tap(({ area }) => localStorage.setItem('selectedArea', area))
      ),
    { dispatch: false }
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
      switchMap(({ date }) => {
        const requests: Record<string, Observable<HourlyPrice[]>> = {};
        for (const { value } of PRICE_AREAS) {
          requests[value] = this.nordpoolService.getPrices(date, value).pipe(
            catchError(() => of([] as HourlyPrice[]))
          );
        }
        return forkJoin(requests).pipe(
          map((results) =>
            PricesActions.loadAllAreaPricesSuccess({
              results: results as Partial<Record<PriceArea, HourlyPrice[]>>,
            })
          ),
          catchError((error) =>
            of(PricesActions.loadAllAreaPricesFailure({
              error: error?.message ?? 'Failed to load all area prices',
            }))
          )
        );
      })
    )
  );
}
