import { createReducer, on } from '@ngrx/store';
import { PricesState } from '../../models/price.model';
import * as PricesActions from './prices.actions';

const todayISO = new Date().toISOString().slice(0, 10);

export const initialState: PricesState = {
  prices: [],
  selectedArea: 'NO1',
  selectedDate: todayISO,
  loading: false,
  error: null,
};

export const pricesReducer = createReducer(
  initialState,

  on(PricesActions.loadPrices, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(PricesActions.loadPricesSuccess, (state, { prices }) => ({
    ...state,
    prices,
    loading: false,
  })),

  on(PricesActions.loadPricesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  on(PricesActions.selectArea, (state, { area }) => ({
    ...state,
    selectedArea: area,
  })),

  on(PricesActions.selectDate, (state, { date }) => ({
    ...state,
    selectedDate: date,
  }))
);
