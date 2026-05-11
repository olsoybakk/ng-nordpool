import { Component, HostListener, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { map } from 'rxjs/operators';
import { combineLatest } from 'rxjs';
import { AREA_COLORS, HourlyPrice, PRICE_AREAS, PriceArea } from '../../models/price.model';
import {
  selectAllPrices,
  selectCurrentPrice,
  selectAllAreaPrices,
  selectSelectedArea,
  selectSelectedDate,
} from '../../store';

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
  cx: number;
  cy: number;
  isCurrent: boolean;
  nok: number;
}

interface AreaLine {
  area: PriceArea;
  color: string;
  isSelected: boolean;
  linePoints: string;
  labelX: number;
  labelY: number;
  points: PointData[];
}

interface Zone {
  y: number;
  height: number;
  level: 'low' | 'mid' | 'high';
  label: string;
}

export interface TooltipEntry {
  area: PriceArea;
  nok: number;
  color: string;
  isSelected: boolean;
}

const CHART_W = 900;
const CHART_H = 260;
const PADDING = { top: 16, right: 48, bottom: 32, left: 60 };

@Component({
  selector: 'app-price-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './price-chart.component.html',
  styleUrl: './price-chart.component.scss',
})
export class PriceChartComponent {
  private readonly store = inject(Store);

  chartMode = input<ChartMode>('line');

  readonly viewBoxW = CHART_W;
  readonly viewBox = `0 0 ${CHART_W} ${CHART_H + PADDING.top + PADDING.bottom}`;
  readonly chartH = CHART_H;
  readonly chartW = CHART_W - PADDING.left - PADDING.right;
  readonly offsetX = PADDING.left;
  readonly offsetY = PADDING.top;
  readonly bottomY = PADDING.top + CHART_H;
  readonly hourW = (CHART_W - PADDING.left - PADDING.right) / 24;

  isFullscreen = signal(false);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isFullscreen()) this.isFullscreen.set(false);
  }

  toggleFullscreen(): void {
    this.isFullscreen.update(v => !v);
  }

  // Hover / tooltip state
  hoveredHour = signal<number | null>(null);
  tooltipLeft = signal(0);
  tooltipTop = signal(0);
  tooltipFlip = signal(false);

  vm$ = combineLatest([
    this.store.select(selectAllPrices),
    this.store.select(selectCurrentPrice),
    this.store.select(selectAllAreaPrices),
    this.store.select(selectSelectedArea),
    this.store.select(selectSelectedDate),
  ]).pipe(
    map(([prices, current, allAreaPrices, selectedArea, selectedDate]) =>
      this.buildViewModel(prices, current, allAreaPrices, selectedArea, selectedDate)
    )
  );

  onMouseMove(event: MouseEvent): void {
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const relX = event.clientX - rect.left;
    const relY = event.clientY - rect.top;

    // Convert rendered pixels → viewBox coordinates
    const svgX = relX * (this.viewBoxW / rect.width);
    const hour = Math.floor((svgX - this.offsetX) / this.hourW);

    if (hour >= 0 && hour < 24) {
      this.hoveredHour.set(hour);
      this.tooltipLeft.set(relX);
      this.tooltipTop.set(relY);
      this.tooltipFlip.set(relX > rect.width * 0.6);
    } else {
      this.hoveredHour.set(null);
    }
  }

  onMouseLeave(): void {
    this.hoveredHour.set(null);
  }

  private buildViewModel(
    prices: HourlyPrice[],
    current: HourlyPrice | null,
    allAreaPrices: Partial<Record<PriceArea, HourlyPrice[]>>,
    selectedArea: PriceArea,
    selectedDate: string
  ) {
    if (!prices.length) return null;

    const values = prices.map((p) => p.NOK_per_kWh);
    const singleMin = Math.min(...values);
    const singleMax = Math.max(...values);
    const singleRange = singleMax - singleMin || 1;

    const gap = this.chartW / prices.length;
    const barW = gap * 0.8;

    // Bar chart data
    const bars: BarData[] = prices.map((p, i) => {
      const normalised = (p.NOK_per_kWh - singleMin) / singleRange;
      const barH = Math.max(2, normalised * CHART_H);
      const third = singleRange / 3;
      const priceLevel =
        p.NOK_per_kWh <= singleMin + third ? 'low'
        : p.NOK_per_kWh <= singleMin + 2 * third ? 'mid'
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

    const yTicks = this.buildYTicks(singleMin, singleMax);

    // Multi-area line data
    const areaEntries = PRICE_AREAS.map(({ value }) => ({
      area: value,
      hourlyPrices: allAreaPrices[value] ?? [],
    })).filter((e) => e.hourlyPrices.length > 0);

    let multiMin = Infinity, multiMax = -Infinity;
    for (const { hourlyPrices } of areaEntries) {
      for (const p of hourlyPrices) {
        if (p.NOK_per_kWh < multiMin) multiMin = p.NOK_per_kWh;
        if (p.NOK_per_kWh > multiMax) multiMax = p.NOK_per_kWh;
      }
    }
    const multiRange = multiMax - multiMin || 1;
    const toYMulti = (v: number) =>
      this.offsetY + CHART_H - ((v - multiMin) / multiRange) * CHART_H;
    const multiGap = this.chartW / 24;

    const areaLines: AreaLine[] = areaEntries.map(({ area, hourlyPrices }) => {
      const stepPairs: string[] = [];
      const pts: PointData[] = [];

      hourlyPrices.forEach((p, i) => {
        const x1 = this.offsetX + i * multiGap;
        const x2 = this.offsetX + (i + 1) * multiGap;
        const y = toYMulti(p.NOK_per_kWh);
        stepPairs.push(`${x1},${y}`, `${x2},${y}`);
        pts.push({ hour: new Date(p.time_start).getHours(), cx: x1, cy: y, isCurrent: p === current, nok: p.NOK_per_kWh });
      });

      const lastPrice = hourlyPrices[hourlyPrices.length - 1];
      return {
        area,
        color: AREA_COLORS[area],
        isSelected: area === selectedArea,
        linePoints: stepPairs.join(' '),
        labelX: this.offsetX + hourlyPrices.length * multiGap + 4,
        labelY: toYMulti(lastPrice.NOK_per_kWh) + 4,
        points: pts,
      };
    });

    areaLines.sort((a, b) => (a.isSelected ? 1 : 0) - (b.isSelected ? 1 : 0));

    const multiTicks = this.buildYTicks(multiMin, multiMax);

    const lowThreshY = toYMulti(multiMin + multiRange / 3);
    const highThreshY = toYMulti(multiMin + (2 * multiRange) / 3);
    const zones: Zone[] = [
      { y: this.offsetY, height: highThreshY - this.offsetY,  level: 'high', label: 'High' },
      { y: highThreshY,  height: lowThreshY - highThreshY,    level: 'mid',  label: 'Mid'  },
      { y: lowThreshY,   height: this.bottomY - lowThreshY,   level: 'low',  label: 'Low'  },
    ];

    // Per-hour tooltip data: all areas sorted cheapest → most expensive
    const pricesByHour: TooltipEntry[][] = Array.from({ length: 24 }, (_, hour) =>
      areaEntries
        .filter(({ hourlyPrices }) => hourlyPrices[hour] != null)
        .map(({ area, hourlyPrices }) => ({
          area,
          nok: hourlyPrices[hour].NOK_per_kWh,
          color: AREA_COLORS[area],
          isSelected: area === selectedArea,
        }))
        .sort((a, b) => a.nok - b.nok)
    );

    const todayISO = new Date().toISOString().slice(0, 10);
    let nowLineX: number | null = null;
    if (selectedDate === todayISO) {
      const now = new Date();
      nowLineX = this.offsetX + (now.getHours() + now.getMinutes() / 60) * (this.chartW / 24);
    }

    return { bars, barW, yTicks, areaLines, multiTicks, zones, pricesByHour, nowLineX };
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

  trackByArea(_: number, line: AreaLine) { return line.area; }
  trackByHour(_: number, bar: BarData) { return bar.hour; }
  trackByAreaEntry(_: number, entry: TooltipEntry) { return entry.area; }
}
