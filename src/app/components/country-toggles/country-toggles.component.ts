import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { COUNTRIES, CountryCode, DEFAULT_COUNTRIES } from '../../models/price.model';
import { selectEnabledCountries, setEnabledCountries, toggleCountry } from '../../store';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-country-toggles',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './country-toggles.component.html',
  styleUrl: './country-toggles.component.scss',
})
export class CountryTogglesComponent {
  private readonly store = inject(Store);
  readonly ls = inject(LanguageService);

  readonly countries = COUNTRIES;

  private readonly enabled = toSignal(this.store.select(selectEnabledCountries), {
    initialValue: [...DEFAULT_COUNTRIES],
  });

  readonly enabledSet = computed(() => new Set(this.enabled()));

  /** Mirrors the reducer's last-country guard so the button visibly can't be clicked. */
  readonly isLastEnabled = computed(() => this.enabled().length === 1);

  isEnabled(code: CountryCode): boolean {
    return this.enabledSet().has(code);
  }

  toggle(code: CountryCode): void {
    this.store.dispatch(toggleCountry({ code }));
  }

  /** Turning eleven countries off one at a time is tedious. */
  resetToNorway(): void {
    this.store.dispatch(setEnabledCountries({ codes: [...DEFAULT_COUNTRIES] }));
  }
}
