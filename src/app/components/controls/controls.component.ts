import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { AREA_COLORS, PRICE_AREAS, PriceArea } from '../../models/price.model';
import { LanguageService } from '../../services/language.service';
import { localISODate } from '../../utils/date';
import {
  selectSelectedArea,
  selectSelectedDate,
  selectDateRangeDays,
  selectEnabledAreas,
  loadPrices,
  selectArea,
  selectDate,
  setDateRangeDays,
} from '../../store';

@Component({
  selector: 'app-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './controls.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './controls.component.scss',
})
export class ControlsComponent {
  private readonly store = inject(Store);
  private readonly elRef = inject(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly ls = inject(LanguageService);

  /** Only the areas of the enabled countries — kept in sync by the constructor below. */
  areas = PRICE_AREAS;
  readonly areaColors = AREA_COLORS;
  readonly maxDate = localISODate(new Date(Date.now() + 864e5));
  readonly rangeOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  readonly maxRangeDays = 14;

  currentArea: PriceArea = 'NO1';
  currentDate = this.maxDate;
  currentRangeDays = 1;
  dropdownOpen = false;

  constructor() {
    this.store
      .select(selectSelectedArea)
      .pipe(takeUntilDestroyed())
      .subscribe((area) => (this.currentArea = area));
    this.store
      .select(selectSelectedDate)
      .pipe(takeUntilDestroyed())
      .subscribe((date) => (this.currentDate = date));
    this.store
      .select(selectDateRangeDays)
      .pipe(takeUntilDestroyed())
      .subscribe((days) => (this.currentRangeDays = days));
    this.store
      .select(selectEnabledAreas)
      .pipe(takeUntilDestroyed())
      .subscribe((enabled) => {
        const visible = new Set(enabled);
        this.areas = PRICE_AREAS.filter((a) => visible.has(a.value));
      });
  }

  get currentAreaLabel(): string {
    // Looks up the full list, not the filtered one, so the trigger never falls back to a
    // bare area code during the transient between a country toggle and the area correction.
    return PRICE_AREAS.find((a) => a.value === this.currentArea)?.label ?? this.currentArea;
  }

  @HostListener('document:click', ['$event.target'])
  onDocumentClick(target: EventTarget | null): void {
    if (!this.elRef.nativeElement.contains(target)) this.dropdownOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.dropdownOpen = false;
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  selectAreaOption(area: PriceArea): void {
    this.dropdownOpen = false;
    if (area !== this.currentArea) this.onAreaChange(area);
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.dropdownOpen = true;
      const options = (this.elRef.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        '.area-select__option',
      );
      if (options.length) {
        (event.key === 'ArrowDown' ? options[0] : options[options.length - 1]).focus();
      }
    }
  }

  onAreaChange(area: PriceArea): void {
    this.store.dispatch(selectArea({ area }));
    this.store.dispatch(loadPrices({ area, date: this.currentDate }));
  }

  onDateChange(date: string): void {
    if (!date) {
      date = localISODate();
      this.currentDate = '';
      this.cdr.detectChanges(); // flush '' so Angular tracks it as the current binding value
      this.currentDate = date; // next CD (after this handler) sees '' → today and writes to DOM
    }
    this.store.dispatch(selectDate({ date }));
    this.store.dispatch(loadPrices({ area: this.currentArea, date }));
    // loadAllAreaPrices for the full range is handled by the loadMultiDayPrices$ effect
  }

  stepDate(days: number): void {
    const d = new Date(this.currentDate);
    d.setDate(d.getDate() + days);
    const next = d.toISOString().slice(0, 10);
    if (next <= this.maxDate) this.onDateChange(next);
  }

  setRangeDays(days: number): void {
    if (days !== this.currentRangeDays) {
      this.store.dispatch(setDateRangeDays({ days }));
    }
  }

  stepRange(delta: number): void {
    const next = Math.min(this.maxRangeDays, Math.max(1, this.currentRangeDays + delta));
    this.setRangeDays(next);
  }
}
