import { createReducer, on } from '@ngrx/store';
import { PriceArea, PricesState } from '../../models/price.model';
import * as PricesActions from './prices.actions';

const todayISO = new Date().toISOString().slice(0, 10);
const storedArea = localStorage.getItem('selectedArea') as PriceArea | null;

export const initialState: PricesState = {
  prices: [],
  allAreaPricesByDate: {},
  selectedArea: storedArea ?? 'NO1',
  selectedDate: todayISO,
  dateRangeDays: 1,
  loading: false,
  allAreasLoadingCount: 0,
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
    allAreasLoadingCount: state.allAreasLoadingCount + 1,
  })),

  on(PricesActions.loadAllAreaPricesSuccess, (state, { date, results }) => ({
    ...state,
    allAreaPricesByDate: { ...state.allAreaPricesByDate, [date]: results },
    allAreasLoadingCount: Math.max(0, state.allAreasLoadingCount - 1),
  })),

  on(PricesActions.loadAllAreaPricesFailure, (state, { error }) => ({
    ...state,
    allAreasLoadingCount: Math.max(0, state.allAreasLoadingCount - 1),
    error,
  })),

  on(PricesActions.selectArea, (state, { area }) => ({
    ...state,
    selectedArea: area,
  })),

  on(PricesActions.selectDate, (state, { date }) => ({
    ...state,
    selectedDate: date,
  })),

  on(PricesActions.setDateRangeDays, (state, { days }) => ({
    ...state,
    dateRangeDays: days,
  }))
);
