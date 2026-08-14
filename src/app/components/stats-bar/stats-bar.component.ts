import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { selectCurrentPriceInRange, selectRangeStats, selectSelectedArea } from '../../store';
import { LanguageService } from '../../services/language.service';
import { PriceArea } from '../../models/price.model';
import { displayOre } from '../../utils/pricing';

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

  /** Area comes second to match the existing template call sites. */
  effectiveOre(rawOre: number, area: PriceArea): number {
    return displayOre(area, rawOre, this.includeTax(), this.showStromstotte());
  }
}
