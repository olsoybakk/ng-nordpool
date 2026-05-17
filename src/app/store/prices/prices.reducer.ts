import { createReducer, on } from '@ngrx/store';
import { PriceArea, PricesState } from '../../models/price.model';
import * as PricesActions from './prices.actions';
import { localISODate } from '../../utils/date';

const todayISO = localISODate();
const storedArea = localStorage.getItem('selectedArea') as PriceArea | null;
const storedDays = Math.min(
  14,
  Math.max(1, parseInt(localStorage.getItem('dateRangeDays') ?? '1', 10)),
);

function loadStoredDate(): string {
  try {
    const raw = localStorage.getItem('selectedDate');
    if (!raw) return todayISO;
    const { date, savedAt } = JSON.parse(raw) as { date: string; savedAt: number };
    return Date.now() - savedAt < 3_600_000 ? date : todayISO;
  } catch {
    return todayISO;
  }
}

export const initialState: PricesState = {
  prices: [],
  allAreaPricesByDate: {},
  selectedArea: storedArea ?? 'NO1',
  selectedDate: loadStoredDate(),
  dateRangeDays: isNaN(storedDays) ? 1 : storedDays,
  loading: false,
  allAreasLoadingCount: 0,
  error: null,
  notification: null,
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
  })),

  on(PricesActions.setNotification, (state, { message }) => ({
    ...state,
    notification: message,
  })),

  on(PricesActions.clearNotification, (state) => ({
    ...state,
    notification: null,
  })),
);
