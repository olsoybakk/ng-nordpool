import { createAction, props } from '@ngrx/store';
import { CountryCode, DayPrices, PriceArea } from '../../models/price.model';

/**
 * Ask for whatever price data the current date range needs. The planPriceFetches$ effect is the
 * only place that turns this into loadAllAreaPrices actions, so the attempt bookkeeping and the
 * `at` timestamp live in exactly one place.
 */
export const requestPriceData = createAction('[Prices] Request Price Data');

/**
 * Fetches every area for one date. `at` is the dispatch time — the reducer records it so a date
 * the API has no data for is not re-requested forever.
 */
export const loadAllAreaPrices = createAction(
  '[Prices] Load All Area Prices',
  props<{ date: string; at: number }>(),
);

export const loadAllAreaPricesSuccess = createAction(
  '[Prices] Load All Area Prices Success',
  props<{ date: string; results: DayPrices }>(),
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
