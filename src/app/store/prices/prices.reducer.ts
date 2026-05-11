import { createReducer, on } from '@ngrx/store';
import { PriceArea, PricesState } from '../../models/price.model';
import * as PricesActions from './prices.actions';

const todayISO = new Date().toISOString().slice(0, 10);
const storedArea = localStorage.getItem('selectedArea') as PriceArea | null;

export const initialState: PricesState = {
  prices: [],
  allAreaPrices: {},
  selectedArea: storedArea ?? 'NO1',
  selectedDate: todayISO,
  loading: false,
  allAreasLoading: false,
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

  on(PricesActions.loadAllAreaPrices, (state) => ({
    ...state,
    allAreaPrices: {},
    allAreasLoading: true,
  })),

  on(PricesActions.loadAllAreaPricesSuccess, (state, { results }) => ({
    ...state,
    allAreaPrices: results,
    allAreasLoading: false,
  })),

  on(PricesActions.loadAllAreaPricesFailure, (state, { error }) => ({
    ...state,
    allAreasLoading: false,
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
