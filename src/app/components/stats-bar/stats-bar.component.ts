import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { selectCurrentPrice, selectDailyStats } from '../../store';

@Component({
  selector: 'app-stats-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats-bar.component.html',
  styleUrl: './stats-bar.component.scss',
})
export class StatsBarComponent {
  private readonly store = inject(Store);

  currentPrice$ = this.store.select(selectCurrentPrice);
  stats$ = this.store.select(selectDailyStats);
}
