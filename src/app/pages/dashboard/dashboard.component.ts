import {
  Component,
  computed,
  DestroyRef,
  effect,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { combineLatest } from 'rxjs';
import { first } from 'rxjs/operators';
import { ControlsComponent } from '../../components/controls/controls.component';
import { StatsBarComponent } from '../../components/stats-bar/stats-bar.component';
import { PriceChartComponent, ChartMode } from '../../components/price-chart/price-chart.component';
import { PriceTableComponent } from '../../components/price-table/price-table.component';
import { CountryTogglesComponent } from '../../components/country-toggles/country-toggles.component';
import {
  selectError,
  selectLoading,
  selectAllAreasLoading,
  selectSelectedArea,
  selectSelectedDate,
  selectDateRangeDays,
  selectNotification,
  selectEnabledCountries,
} from '../../store';
import { detectLocation, loadPrices, requestPriceData } from '../../store';
import { LanguageService } from '../../services/language.service';
import { CountryCode } from '../../models/price.model';
import { BUILD_DATE } from '../../../environments/build-info';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ControlsComponent,
    StatsBarComponent,
    PriceChartComponent,
    PriceTableComponent,
    CountryTogglesComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly store = inject(Store);
  readonly ls = inject(LanguageService);
  readonly buildDate = (() => {
    if (!BUILD_DATE) return '';
    const d = new Date(BUILD_DATE);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();

  loading$ = this.store.select(selectLoading);
  allAreasLoading$ = this.store.select(selectAllAreasLoading);
  error$ = this.store.select(selectError);
  dateRangeDays$ = this.store.select(selectDateRangeDays);
  notification = toSignal(this.store.select(selectNotification), { initialValue: null });

  private readonly selectedDate = toSignal(this.store.select(selectSelectedDate), {
    initialValue: new Date().toISOString().slice(0, 10),
  });
  private readonly dateRangeDays = toSignal(this.store.select(selectDateRangeDays), {
    initialValue: 1,
  });

  readonly dateLabel = computed(() => {
    const dateStr = this.selectedDate();
    if (!dateStr) return '';
    const end = new Date(dateStr + 'T12:00:00');
    if (isNaN(end.getTime())) return '';
    const locale = this.ls.lang() === 'nb' ? 'nb-NO' : 'en-GB';
    const days = this.dateRangeDays();
    const fmt = { day: 'numeric', month: 'long', year: 'numeric' } as const;
    if (days <= 1) return new Intl.DateTimeFormat(locale, fmt).format(end);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    return new Intl.DateTimeFormat(locale, fmt).formatRange(start, end);
  });

  private readonly enabledCountries = toSignal(this.store.select(selectEnabledCountries), {
    initialValue: [] as CountryCode[],
  });

  /**
   * VAT, Norgespris and strømstøtte are Norwegian schemes, so with Norway switched off the
   * three toggles would sit there doing nothing. Disabled rather than hidden to avoid a
   * layout jump.
   */
  readonly hasNorway = computed(() => this.enabledCountries().includes('NO'));

  /**
   * VAT is only offered when Norway is the *only* thing on the chart. It applies to Norwegian
   * areas alone, so alongside any other series it would put VAT-inclusive Norwegian prices on
   * the same axis as raw foreign ones — a comparison that looks valid and isn't. SYS counts as
   * "other" here: it is an unadjusted reference price, not a Norwegian market.
   */
  readonly norwayOnly = computed(() => {
    const enabled = this.enabledCountries();
    return enabled.length === 1 && enabled[0] === 'NO';
  });

  menuOpen = signal(false);
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
    // Adding a second country while VAT is on would otherwise leave a mixed chart. Switch it
    // off rather than just greying out the button, so what's drawn always matches the toggle.
    // Converges after one pass: the write only happens while includeTax is still true.
    effect(() => {
      if (!this.norwayOnly() && this.includeTax()) this.includeTax.set(false);
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
    combineLatest([this.store.select(selectSelectedArea), this.store.select(selectSelectedDate)])
      .pipe(first())
      .subscribe(([area, date]) => {
        if (!localStorage.getItem('selectedArea')) {
          this.store.dispatch(detectLocation());
        }
        this.store.dispatch(loadPrices({ area, date }));
        // The planner effect works out which dates and areas are actually missing.
        this.store.dispatch(requestPriceData());
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

  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.menuOpen.update((v) => !v);
  }

  @HostListener('document:click')
  closeMenu(): void {
    this.menuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.menuOpen.set(false);
  }

  clearAllData(): void {
    localStorage.clear();
    location.reload();
  }
}
