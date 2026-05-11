import { createAction, props } from '@ngrx/store';
import { HourlyPrice, PriceArea } from '../../models/price.model';

export const loadPrices = createAction(
  '[Prices] Load Prices',
  props<{ area: PriceArea; date: string }>()
);

export const loadPricesSuccess = createAction(
  '[Prices] Load Prices Success',
  props<{ prices: HourlyPrice[] }>()
);

export const loadPricesFailure = createAction(
  '[Prices] Load Prices Failure',
  props<{ error: string }>()
);

export const loadAllAreaPrices = createAction(
  '[Prices] Load All Area Prices',
  props<{ date: string }>()
);

export const loadAllAreaPricesSuccess = createAction(
  '[Prices] Load All Area Prices Success',
  props<{ results: Partial<Record<PriceArea, HourlyPrice[]>> }>()
);

export const loadAllAreaPricesFailure = createAction(
  '[Prices] Load All Area Prices Failure',
  props<{ error: string }>()
);

export const detectLocation = createAction('[Prices] Detect Location');

export const selectArea = createAction(
  '[Prices] Select Area',
  props<{ area: PriceArea }>()
);

export const selectDate = createAction(
  '[Prices] Select Date',
  props<{ date: string }>()
);
