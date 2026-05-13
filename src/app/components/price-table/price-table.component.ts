import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { map } from 'rxjs/operators';
import { combineLatest } from 'rxjs';
import { HourlyPrice } from '../../models/price.model';
import { selectAllPrices, selectCurrentPrice, selectSelectedArea } from '../../store';

interface TableRow extends HourlyPrice {
  time: string;
  isCurrent: boolean;
  displayOre: number;
}

function toHHMM(isoLocal: string): string {
  const d = new Date(isoLocal);
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}

const TAX_FACTOR = 1.25;
const NO_TAX_AREAS = new Set(['NO4']);

@Component({
  selector: 'app-price-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './price-table.component.html',
  styleUrl: './price-table.component.scss',
})
export class PriceTableComponent {
  private readonly store = inject(Store);

  includeTax = input(false);

  rows$ = combineLatest([
    this.store.select(selectAllPrices),
    this.store.select(selectCurrentPrice),
    this.store.select(selectSelectedArea),
  ]).pipe(
    map(([prices, current, area]) => {
      const tf = this.includeTax() && !NO_TAX_AREAS.has(area) ? TAX_FACTOR : 1;
      return prices.map((p): TableRow => ({
        ...p,
        time: toHHMM(p.time_start),
        isCurrent: p === current,
        displayOre: p.ore_per_kWh * tf,
      }));
    })
  );
}
