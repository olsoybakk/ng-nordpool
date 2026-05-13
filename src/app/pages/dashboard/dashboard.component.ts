import { Component, DestroyRef, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { combineLatest } from 'rxjs';
import { first } from 'rxjs/operators';
import { ControlsComponent } from '../../components/controls/controls.component';
import { StatsBarComponent } from '../../components/stats-bar/stats-bar.component';
import { PriceChartComponent, ChartMode } from '../../components/price-chart/price-chart.component';
import { PriceTableComponent } from '../../components/price-table/price-table.component';
import {
  selectError,
  selectLoading,
  selectAllAreasLoading,
  selectSelectedArea,
  selectSelectedDate,
  selectDateRangeDays,
} from '../../store';
import { detectLocation, loadPrices, loadAllAreaPrices } from '../../store/prices/prices.actions';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ControlsComponent,
    StatsBarComponent,
    PriceChartComponent,
    PriceTableComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly store = inject(Store);

  loading$ = this.store.select(selectLoading);
  allAreasLoading$ = this.store.select(selectAllAreasLoading);
  error$ = this.store.select(selectError);
  dateRangeDays$ = this.store.select(selectDateRangeDays);

  chartMode = signal<ChartMode>('line');
  includeTax = signal(false);
  showNorgespris = signal(false);
  theme = signal<'dark' | 'light'>(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  );

  constructor() {
    effect(() => {
      document.documentElement.setAttribute('data-theme', this.theme());
    });

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = (e: MediaQueryListEvent) => this.theme.set(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', onSystemChange);
    inject(DestroyRef).onDestroy(() => mq.removeEventListener('change', onSystemChange));
  }

  ngOnInit(): void {
    combineLatest([
      this.store.select(selectSelectedArea),
      this.store.select(selectSelectedDate),
    ])
      .pipe(first())
      .subscribe(([area, date]) => {
        if (!localStorage.getItem('selectedArea')) {
          this.store.dispatch(detectLocation());
        }
        this.store.dispatch(loadPrices({ area, date }));
        this.store.dispatch(loadAllAreaPrices({ date }));
      });
  }

  setChartMode(mode: ChartMode): void {
    this.chartMode.set(mode);
  }

  toggleTheme(): void {
    this.theme.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  toggleTax(): void {
    this.includeTax.update((v) => !v);
  }

  toggleNorgespris(): void {
    this.showNorgespris.update((v) => !v);
  }
}
