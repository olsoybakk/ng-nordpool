import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { map } from 'rxjs/operators';
import { combineLatest } from 'rxjs';
import { HourlyPrice } from '../../models/price.model';
import { selectAllPrices, selectCurrentPrice } from '../../store';

interface TableRow extends HourlyPrice {
  hour: string;
  isCurrent: boolean;
}

@Component({
  selector: 'app-price-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './price-table.component.html',
  styleUrl: './price-table.component.scss',
})
export class PriceTableComponent {
  private readonly store = inject(Store);

  rows$ = combineLatest([
    this.store.select(selectAllPrices),
    this.store.select(selectCurrentPrice),
  ]).pipe(
    map(([prices, current]) =>
      prices.map((p): TableRow => ({
        ...p,
        hour: new Date(p.time_start).getHours().toString().padStart(2, '0') + ':00',
        isCurrent: p === current,
      }))
    )
  );
}
