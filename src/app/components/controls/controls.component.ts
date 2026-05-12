import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { PRICE_AREAS, PriceArea } from '../../models/price.model';
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

  readonly areas = PRICE_AREAS;
  readonly maxDate = new Date(Date.now() + 864e5).toISOString().slice(0, 10);

  selectedArea$ = this.store.select(selectSelectedArea);
  selectedDate$ = this.store.select(selectSelectedDate);

  currentArea: PriceArea = 'NO1';
  currentDate = this.maxDate;

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
}
