import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { selectCurrentPriceInRange, selectRangeStats, selectSelectedArea } from '../../store';
import { LanguageService } from '../../services/language.service';
const TAX_FACTOR = 1.25;
const NO_TAX_AREAS = new Set(['NO4']);
const STROMSTOTTE_THRESHOLD = 77; // øre/kWh excl. VAT

@Component({
  selector: 'app-stats-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats-bar.component.html',
  styleUrl: './stats-bar.component.scss',
})
export class StatsBarComponent {
  private readonly store = inject(Store);
  readonly ls = inject(LanguageService);

  includeTax = input(false);
  showStromstotte = input(false);

  currentPrice$ = this.store.select(selectCurrentPriceInRange);
  stats$ = this.store.select(selectRangeStats);
  selectedArea$ = this.store.select(selectSelectedArea);

  effectiveOre(rawOre: number, area: string): number {
    let ore = rawOre;
    if (this.showStromstotte() && ore > STROMSTOTTE_THRESHOLD) {
      ore = 0.1 * ore + 0.9 * STROMSTOTTE_THRESHOLD;
    }
    return this.includeTax() && !NO_TAX_AREAS.has(area) ? ore * TAX_FACTOR : ore;
  }
}
