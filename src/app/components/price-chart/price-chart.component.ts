import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { map } from 'rxjs/operators';
import { combineLatest } from 'rxjs';
import { HourlyPrice } from '../../models/price.model';
import { selectAllPrices, selectCurrentPrice } from '../../store';

export type ChartMode = 'bar' | 'line';

interface BarData {
  hour: number;
  price: HourlyPrice;
  x: number;
  barHeight: number;
  barY: number;
  isCurrent: boolean;
  priceLevel: 'low' | 'mid' | 'high';
}

interface PointData {
  hour: number;
  price: HourlyPrice;
  cx: number;
  cy: number;
  isCurrent: boolean;
}

const CHART_W = 900;
const CHART_H = 260;
const PADDING = { top: 16, right: 16, bottom: 32, left: 60 };

@Component({
  selector: 'app-price-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './price-chart.component.html',
  styleUrl: './price-chart.component.scss',
})
export class PriceChartComponent {
  private readonly store = inject(Store);

  readonly viewBox = `0 0 ${CHART_W} ${CHART_H + PADDING.top + PADDING.bottom}`;
  readonly chartH = CHART_H;
  readonly chartW = CHART_W - PADDING.left - PADDING.right;
  readonly offsetX = PADDING.left;
  readonly offsetY = PADDING.top;
  readonly bottomY = PADDING.top + CHART_H;

  chartMode = signal<ChartMode>('bar');

  vm$ = combineLatest([
    this.store.select(selectAllPrices),
    this.store.select(selectCurrentPrice),
  ]).pipe(
    map(([prices, current]) => this.buildViewModel(prices, current))
  );

  setMode(mode: ChartMode) {
    this.chartMode.set(mode);
  }

  private buildViewModel(prices: HourlyPrice[], current: HourlyPrice | null) {
    if (!prices.length) return null;

    const values = prices.map((p) => p.NOK_per_kWh);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const gap = this.chartW / prices.length;
    const barW = gap * 0.8;
    const yTicks = this.buildYTicks(minVal, maxVal);

    const toY = (v: number) =>
      this.offsetY + CHART_H - ((v - minVal) / range) * CHART_H;

    const bars: BarData[] = prices.map((p, i) => {
      const normalised = (p.NOK_per_kWh - minVal) / range;
      const barH = Math.max(2, normalised * CHART_H);
      const third = range / 3;
      const priceLevel =
        p.NOK_per_kWh <= minVal + third
          ? 'low'
          : p.NOK_per_kWh <= minVal + 2 * third
            ? 'mid'
            : 'high';

      return {
        hour: new Date(p.time_start).getHours(),
        price: p,
        x: this.offsetX + i * gap + gap * 0.1,
        barHeight: barH,
        barY: this.offsetY + CHART_H - barH,
        isCurrent: p === current,
        priceLevel,
      };
    });

    const points: PointData[] = prices.map((p, i) => ({
      hour: new Date(p.time_start).getHours(),
      price: p,
      cx: this.offsetX + i * gap + gap * 0.5,
      cy: toY(p.NOK_per_kWh),
      isCurrent: p === current,
    }));

    const linePoints = points.map((p) => `${p.cx},${p.cy}`).join(' ');
    const areaPoints = [
      `${points[0].cx},${this.bottomY}`,
      ...points.map((p) => `${p.cx},${p.cy}`),
      `${points[points.length - 1].cx},${this.bottomY}`,
    ].join(' ');

    return { bars, barW, points, linePoints, areaPoints, yTicks, minVal, maxVal };
  }

  private buildYTicks(min: number, max: number) {
    const count = 5;
    const step = (max - min) / (count - 1);
    return Array.from({ length: count }, (_, i) => {
      const val = min + i * step;
      const y = this.offsetY + CHART_H - ((val - min) / (max - min || 1)) * CHART_H;
      return { val, y };
    });
  }

  trackByHour(_: number, item: BarData | PointData) {
    return item.hour;
  }
}
