import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { NordpoolService } from '../../services/nordpool.service';
import * as PricesActions from './prices.actions';

@Injectable()
export class PricesEffects {
  private readonly actions$ = inject(Actions);
  private readonly nordpoolService = inject(NordpoolService);

  loadPrices$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PricesActions.loadPrices),
      switchMap(({ area, date }) =>
        this.nordpoolService.getPrices(date, area).pipe(
          map((prices) => PricesActions.loadPricesSuccess({ prices })),
          catchError((error) =>
            of(
              PricesActions.loadPricesFailure({
                error: error?.message ?? 'Failed to load prices',
              })
            )
          )
        )
      )
    )
  );
}
