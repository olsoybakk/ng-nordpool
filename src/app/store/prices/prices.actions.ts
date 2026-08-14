import { createAction, props } from '@ngrx/store';
import { CountryCode, HourlyPrice, PriceArea } from '../../models/price.model';

export const loadPrices = createAction(
  '[Prices] Load Prices',
  props<{ area: PriceArea; date: string }>(),
);

export const loadPricesSuccess = createAction(
  '[Prices] Load Prices Success',
  props<{ prices: HourlyPrice[] }>(),
);

export const loadPricesFailure = createAction(
  '[Prices] Load Prices Failure',
  props<{ error: string }>(),
);

/**
 * Ask for whatever price data the current date range and enabled countries need. The
 * planPriceFetches$ effect is the only place that turns this into loadAllAreaPrices actions,
 * so the attempt bookkeeping and the `at` timestamp live in exactly one place.
 */
export const requestPriceData = createAction('[Prices] Request Price Data');

/**
 * `areas` is the requested set (not the set that came back) and `at` is the dispatch time —
 * the reducer records both so an area the API has no data for is not re-requested forever.
 */
export const loadAllAreaPrices = createAction(
  '[Prices] Load All Area Prices',
  props<{ date: string; areas: PriceArea[]; at: number }>(),
);

export const loadAllAreaPricesSuccess = createAction(
  '[Prices] Load All Area Prices Success',
  props<{
    date: string;
    areas: PriceArea[];
    results: Partial<Record<PriceArea, HourlyPrice[]>>;
  }>(),
);

export const loadAllAreaPricesFailure = createAction(
  '[Prices] Load All Area Prices Failure',
  props<{ error: string }>(),
);

export const toggleCountry = createAction(
  '[Prices] Toggle Country',
  props<{ code: CountryCode }>(),
);

export const setEnabledCountries = createAction(
  '[Prices] Set Enabled Countries',
  props<{ codes: CountryCode[] }>(),
);

export const detectLocation = createAction('[Prices] Detect Location');

export const selectArea = createAction('[Prices] Select Area', props<{ area: PriceArea }>());

export const selectDate = createAction('[Prices] Select Date', props<{ date: string }>());

export const setDateRangeDays = createAction(
  '[Prices] Set Date Range Days',
  props<{ days: number }>(),
);

export const setNotification = createAction(
  '[Prices] Set Notification',
  props<{ message: string }>(),
);

export const clearNotification = createAction('[Prices] Clear Notification');
