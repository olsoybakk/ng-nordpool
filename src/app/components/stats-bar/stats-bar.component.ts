import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { selectCurrentPrice, selectDailyStats, selectSelectedArea } from '../../store';

const TAX_FACTOR = 1.25;
const NO_TAX_AREAS = new Set(['NO4']);

@Component({
  selector: 'app-stats-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats-bar.component.html',
  styleUrl: './stats-bar.component.scss',
})
export class StatsBarComponent {
  private readonly store = inject(Store);

  includeTax = input(false);

  currentPrice$ = this.store.select(selectCurrentPrice);
  stats$ = this.store.select(selectDailyStats);
  selectedArea$ = this.store.select(selectSelectedArea);

  taxFactor(area: string): number {
    return this.includeTax() && !NO_TAX_AREAS.has(area) ? TAX_FACTOR : 1;
  }
}
