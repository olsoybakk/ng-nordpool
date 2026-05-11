import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { combineLatest } from 'rxjs';
import { first } from 'rxjs/operators';
import { ControlsComponent } from '../../components/controls/controls.component';
import { StatsBarComponent } from '../../components/stats-bar/stats-bar.component';
import { PriceChartComponent } from '../../components/price-chart/price-chart.component';
import { PriceTableComponent } from '../../components/price-table/price-table.component';
import { selectError, selectLoading, selectSelectedArea, selectSelectedDate } from '../../store';
import { loadPrices } from '../../store/prices/prices.actions';

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
  error$ = this.store.select(selectError);

  ngOnInit(): void {
    combineLatest([
      this.store.select(selectSelectedArea),
      this.store.select(selectSelectedDate),
    ])
      .pipe(first())
      .subscribe(([area, date]) => {
        this.store.dispatch(loadPrices({ area, date }));
      });
  }
}
