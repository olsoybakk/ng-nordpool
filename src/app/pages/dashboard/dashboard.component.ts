import { Component, DestroyRef, effect, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
  selectNotification,
} from '../../store';
import { detectLocation, loadPrices, loadAllAreaPrices } from '../../store/prices/prices.actions';
import { LanguageService } from '../../services/language.service';
import { subtractDays } from '../../utils/date';

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
  readonly ls = inject(LanguageService);

  loading$ = this.store.select(selectLoading);
  allAreasLoading$ = this.store.select(selectAllAreasLoading);
  error$ = this.store.select(selectError);
  dateRangeDays$ = this.store.select(selectDateRangeDays);
  notification = toSignal(this.store.select(selectNotification), { initialValue: null });

  chartMode = signal<ChartMode>((localStorage.getItem('chartMode') as ChartMode | null) ?? 'line');
  includeTax = signal(localStorage.getItem('includeTax') === 'true');
  showNorgespris = signal(localStorage.getItem('showNorgespris') === 'true');
  showStromstotte = signal(localStorage.getItem('showStromstotte') === 'true');
  theme = signal<'dark' | 'light'>(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  );

  constructor() {
    effect(() => {
      document.documentElement.setAttribute('data-theme', this.theme());
    });
    effect(() => {
      localStorage.setItem('chartMode', this.chartMode());
    });
    effect(() => {
      localStorage.setItem('includeTax', String(this.includeTax()));
    });
    effect(() => {
      localStorage.setItem('showNorgespris', String(this.showNorgespris()));
    });
    effect(() => {
      localStorage.setItem('showStromstotte', String(this.showStromstotte()));
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
      this.store.select(selectDateRangeDays),
    ])
      .pipe(first())
      .subscribe(([area, date, days]) => {
        if (!localStorage.getItem('selectedArea')) {
          this.store.dispatch(detectLocation());
        }
        this.store.dispatch(loadPrices({ area, date }));
        for (let i = 0; i < days; i++) {
          this.store.dispatch(loadAllAreaPrices({ date: subtractDays(date, i) }));
        }
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

  toggleStromstotte(): void {
    this.showStromstotte.update((v) => !v);
  }
}
