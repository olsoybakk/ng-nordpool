import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { map } from 'rxjs/operators';
import { combineLatest } from 'rxjs';
import { HourlyPrice, PriceArea } from '../../models/price.model';
import { selectAllPrices, selectCurrentPrice, selectSelectedArea } from '../../store';
import { LanguageService } from '../../services/language.service';

interface TableRow extends HourlyPrice {
  time: string;
  isCurrent: boolean;
  displayOre: number;
}

function toHHMM(isoLocal: string): string {
  const d = new Date(isoLocal);
  return (
    d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0')
  );
}

const TAX_FACTOR = 1.25;
const NO_TAX_AREAS = new Set<PriceArea>(['NO4']);
const STROMSTOTTE_THRESHOLD = 77;

function applyStromstotte(rawOre: number): number {
  if (rawOre <= STROMSTOTTE_THRESHOLD) return rawOre;
  return 0.1 * rawOre + 0.9 * STROMSTOTTE_THRESHOLD;
}

function displayOre(area: PriceArea, rawOre: number, includeTax: boolean, showStromstotte: boolean): number {
  const ore = showStromstotte ? applyStromstotte(rawOre) : rawOre;
  return includeTax && !NO_TAX_AREAS.has(area) ? ore * TAX_FACTOR : ore;
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
  readonly ls = inject(LanguageService);

  includeTax = input(false);
  showStromstotte = input(false);

  rows$ = combineLatest([
    this.store.select(selectAllPrices),
    this.store.select(selectCurrentPrice),
    this.store.select(selectSelectedArea),
    toObservable(this.includeTax),
    toObservable(this.showStromstotte),
  ]).pipe(
    map(([prices, current, area, includeTax, showStromstotte]) => {
      return prices.map(
        (p): TableRow => ({
          ...p,
          time: toHHMM(p.time_start),
          isCurrent: p === current,
          displayOre: displayOre(area, p.ore_per_kWh, includeTax, showStromstotte),
        }),
      );
    }),
  );
}
