import { Component, ElementRef, HostListener, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { AREA_COLORS, PRICE_AREAS, PriceArea } from '../../models/price.model';
import {
  selectSelectedArea,
  selectSelectedDate,
  loadPrices,
  loadAllAreaPrices,
  selectArea,
  selectDate,
} from '../../store';

@Component({
  selector: 'app-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './controls.component.html',
  styleUrl: './controls.component.scss',
})
export class ControlsComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly elRef = inject(ElementRef);

  readonly areas = PRICE_AREAS;
  readonly areaColors = AREA_COLORS;
  readonly maxDate = new Date(Date.now() + 864e5).toISOString().slice(0, 10);

  selectedArea$ = this.store.select(selectSelectedArea);
  selectedDate$ = this.store.select(selectSelectedDate);

  currentArea: PriceArea = 'NO1';
  currentDate = this.maxDate;
  dropdownOpen = false;

  get currentAreaLabel(): string {
    return this.areas.find((a) => a.value === this.currentArea)?.label ?? this.currentArea;
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
        '.area-select__option'
      );
      if (options.length) {
        (event.key === 'ArrowDown' ? options[0] : options[options.length - 1]).focus();
      }
    }
  }

  ngOnInit(): void {
    this.selectedArea$.subscribe((area) => (this.currentArea = area));
    this.selectedDate$.subscribe((date) => (this.currentDate = date));
  }

  onAreaChange(area: PriceArea): void {
    this.store.dispatch(selectArea({ area }));
    this.store.dispatch(loadPrices({ area, date: this.currentDate }));
  }

  onDateChange(date: string): void {
    this.store.dispatch(selectDate({ date }));
    this.store.dispatch(loadPrices({ area: this.currentArea, date }));
    this.store.dispatch(loadAllAreaPrices({ date }));
  }

  stepDate(days: number): void {
    const d = new Date(this.currentDate);
    d.setDate(d.getDate() + days);
    const next = d.toISOString().slice(0, 10);
    if (next <= this.maxDate) this.onDateChange(next);
  }
}
