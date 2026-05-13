import { afterNextRender, Component, computed, DestroyRef, ElementRef, HostListener, inject, input, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
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
  slot: number;
  hour: number;
  minute: number;
  timeLabel: string;
  price: HourlyPrice;
  x: number;
  barHeight: number;
  barY: number;
  isCurrent: boolean;
  priceLevel: 'low' | 'mid' | 'high';
}

interface PointData {
  slot: number;
  cx: number;
  cy: number;
  isCurrent: boolean;
  ore: number;
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
  label: string;
  ore: number;
  color: string;
  isSelected: boolean;
}

const CHART_W = 1500;
const CHART_H = 380;
const PADDING = { top: 16, right: 48, bottom: 36, left: 60 };
const SLOT_COUNT = 96;
const FULLSCREEN_OUTER = 24; // px — inset from viewport edge to card edge (must match CSS)
const FULLSCREEN_INNER = 12; // px — padding inside the card (0.75rem, must match CSS)
// Horizontal space consumed by dashboard container padding (2×1.5rem) + card padding (2×0.5rem)
const DASHBOARD_H_PAD = 64;
const DASHBOARD_MAX_W = 1100;
// Vertical card padding consumed by .chart-outer (0.75rem top + 0.5rem bottom)
const CARD_PAD_PX = 20;

@Component({
  selector: 'app-price-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './price-chart.component.html',
  styleUrl: './price-chart.component.scss',
})
export class PriceChartComponent {
  private readonly store = inject(Store);
  private readonly elementRef = inject(ElementRef);

  chartMode = input<ChartMode>('line');

  readonly viewBoxW = CHART_W;
  readonly chartW = CHART_W - PADDING.left - PADDING.right;
  readonly offsetX = PADDING.left;
  readonly offsetY = PADDING.top;
  readonly slotW = (CHART_W - PADDING.left - PADDING.right) / SLOT_COUNT;

  isFullscreen = signal(false);

  private readonly windowWidth = signal(window.innerWidth);
  private readonly containerH = signal(0);

  constructor() {
    const destroyRef = inject(DestroyRef);
    const onResize = () => this.windowWidth.set(window.innerWidth);
    window.addEventListener('resize', onResize);
    destroyRef.onDestroy(() => window.removeEventListener('resize', onResize));

    afterNextRender(() => {
      const ro = new ResizeObserver(entries => {
        const h = entries[0]?.contentRect.height ?? 0;
        if (h > 0) this.containerH.set(h);
      });
      ro.observe(this.elementRef.nativeElement);
      destroyRef.onDestroy(() => ro.disconnect());
    });
  }

  readonly dims = computed(() => {
    const ww = this.windowWidth();
    const ch = this.containerH();
    const mode = this.chartMode();
    const fullscreen = this.isFullscreen();
    const edge = 2 * (FULLSCREEN_OUTER + FULLSCREEN_INNER);

    const renderedW = fullscreen
      ? window.innerWidth - edge
      : Math.min(DASHBOARD_MAX_W, ww) - DASHBOARD_H_PAD;

    // Compute font size in SVG user units to render at ~10px on screen
    const labelSize = Math.round(10 * CHART_W / Math.max(renderedW, 100));
    // Bottom padding must fit the x-axis labels
    const padBottom = Math.max(PADDING.bottom, Math.round(labelSize * 1.5));

    let h: number;
    if (fullscreen) {
      h = Math.max(200, Math.round(((window.innerHeight - edge) * CHART_W) / renderedW) - PADDING.top - padBottom);
    } else if (ww < 640) {
      // On narrow screens target ~65% of viewport width as chart height.
      // targetH_px = availW * 0.65; solving for h: h = 0.65*CHART_W - PADDING (availW cancels).
      h = Math.round(0.65 * CHART_W) - PADDING.top - padBottom;
    } else if (ch > 0 && mode === 'line') {
      // Line mode: parent has a viewport-fill height, so containerH is stable.
      // Invert rendered-height formula to fill the container exactly.
      h = Math.max(200, Math.round((ch - CARD_PAD_PX) * CHART_W / renderedW) - PADDING.top - padBottom);
    } else {
      h = CHART_H;
    }

    const chartBottomY = PADDING.top + h;
    return {
      chartH: h,
      viewBox: `0 0 ${CHART_W} ${PADDING.top + h + padBottom}`,
      bottomY: chartBottomY,
      labelSize,
      // Baseline y for x-axis hour labels (below the axis line)
      xAxisY: chartBottomY + Math.round(labelSize * 0.9),
      // Baseline y for "now" label — inside chart top when labelSize > top padding
      nowLabelY: labelSize > PADDING.top ? PADDING.top + Math.round(labelSize * 0.9) : PADDING.top - 3,
      // x-centre for the rotated y-axis title — wide enough to avoid left-edge clipping
      axisTitleX: Math.max(12, Math.ceil(labelSize / 2) + 2),
      // Move y-axis tick labels inside the chart when they're too wide for the left margin
      // Labels fit outside when: labelSize * 6 chars * 0.55em ≤ PADDING.left − 8 ≈ 52 SVG units
      yLabelInside: labelSize > 15,
    };
  });

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isFullscreen()) this.isFullscreen.set(false);
  }

  @HostListener('document:click', ['$event'])
  @HostListener('document:touchstart', ['$event'])
  onDocumentOutsideTap(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.hoveredSlot.set(null);
    }
  }

  toggleFullscreen(): void {
    this.isFullscreen.update(v => !v);
  }

  hoveredSlot = signal<number | null>(null);
  tooltipLeft = signal(0);
  tooltipTop = signal(0);
  tooltipFlip = signal(false);

  vm$ = combineLatest([
    this.store.select(selectAllPrices),
    this.store.select(selectCurrentPrice),
    this.store.select(selectAllAreaPrices),
    this.store.select(selectSelectedArea),
    this.store.select(selectSelectedDate),
    toObservable(this.dims),
  ]).pipe(
    map(([prices, current, allAreaPrices, selectedArea, selectedDate, dims]) =>
      this.buildViewModel(prices, current, allAreaPrices, selectedArea, selectedDate, dims)
    )
  );

  onMouseMove(event: MouseEvent): void {
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const relX = event.clientX - rect.left;
    const relY = event.clientY - rect.top;

    const svgX = relX * (this.viewBoxW / rect.width);
    const slot = Math.floor((svgX - this.offsetX) / this.slotW);

    if (slot >= 0 && slot < SLOT_COUNT) {
      this.hoveredSlot.set(slot);
      this.tooltipLeft.set(relX);
      this.tooltipTop.set(relY);
      this.tooltipFlip.set(relX > rect.width * 0.6);
    } else {
      this.hoveredSlot.set(null);
    }
  }

  onMouseLeave(): void {
    this.hoveredSlot.set(null);
  }

  private buildViewModel(
    prices: HourlyPrice[],
    current: HourlyPrice | null,
    allAreaPrices: Partial<Record<PriceArea, HourlyPrice[]>>,
    selectedArea: PriceArea,
    selectedDate: string,
    { chartH, bottomY, labelSize }: { chartH: number; bottomY: number; labelSize: number }
  ) {
    if (!prices.length) return null;

    const snapFloor25 = (v: number) => { const s = Math.floor(v / 25) * 25; return s < v ? s : s - 25; };
    const snapCeil25  = (v: number) => { const s = Math.ceil(v / 25)  * 25; return s > v ? s : s + 25; };

    const values = prices.map((p) => p.ore_per_kWh);
    const singleMin = snapFloor25(Math.min(...values) - 5);
    const singleMax = snapCeil25(Math.max(...values) + 5);
    const singleRange = singleMax - singleMin || 1;

    const gap = this.chartW / prices.length;
    const barW = gap * 0.8;

    const bars: BarData[] = prices.map((p, i) => {
      const normalised = (p.ore_per_kWh - singleMin) / singleRange;
      const barH = Math.max(2, normalised * chartH);
      const third = singleRange / 3;
      let priceLevel: 'low' | 'mid' | 'high';
      if (p.ore_per_kWh <= singleMin + third) priceLevel = 'low';
      else if (p.ore_per_kWh <= singleMin + 2 * third) priceLevel = 'mid';
      else priceLevel = 'high';

      const d = new Date(p.time_start);
      return {
        slot: i,
        hour: d.getHours(),
        minute: d.getMinutes(),
        timeLabel: d.getHours().toString().padStart(2, '0'),
        price: p,
        x: this.offsetX + i * gap + gap * 0.1,
        barHeight: barH,
        barY: this.offsetY + chartH - barH,
        isCurrent: p === current,
        priceLevel,
      };
    });

    const yTicks = this.buildYTicks(singleMin, singleMax, chartH);

    const areaEntries = PRICE_AREAS.map(({ value }) => ({
      area: value,
      hourlyPrices: allAreaPrices[value] ?? [],
    })).filter((e) => e.hourlyPrices.length > 0);

    let rawMultiMin = Infinity, rawMultiMax = -Infinity;
    for (const { hourlyPrices } of areaEntries) {
      for (const p of hourlyPrices) {
        if (p.ore_per_kWh < rawMultiMin) rawMultiMin = p.ore_per_kWh;
        if (p.ore_per_kWh > rawMultiMax) rawMultiMax = p.ore_per_kWh;
      }
    }
    const multiMin = snapFloor25(rawMultiMin - 5);
    const multiMax = snapCeil25(rawMultiMax + 5);
    const multiRange = multiMax - multiMin || 1;
    const toYMulti = (v: number) =>
      this.offsetY + chartH - ((v - multiMin) / multiRange) * chartH;
    const multiGap = this.chartW / SLOT_COUNT;

    const areaLines: AreaLine[] = areaEntries.map(({ area, hourlyPrices }) => {
      const stepPairs: string[] = [];
      const pts: PointData[] = [];

      hourlyPrices.forEach((p, i) => {
        const x1 = this.offsetX + i * multiGap;
        const x2 = this.offsetX + (i + 1) * multiGap;
        const y = toYMulti(p.ore_per_kWh);
        stepPairs.push(`${x1},${y}`, `${x2},${y}`);
        if (p === current) {
          pts.push({ slot: i, cx: x1, cy: y, isCurrent: true, ore: p.ore_per_kWh });
        }
      });

      const lastPrice = hourlyPrices.at(-1)!;
      // Clamp so the label fits within the right padding regardless of font size
      const rawLabelX = this.offsetX + hourlyPrices.length * multiGap + 4;
      const maxLabelX = CHART_W - Math.round(labelSize * 1.8) - 4;
      return {
        area,
        color: AREA_COLORS[area],
        isSelected: area === selectedArea,
        linePoints: stepPairs.join(' '),
        labelX: Math.min(rawLabelX, maxLabelX),
        labelY: toYMulti(lastPrice.ore_per_kWh) + 4,
        points: pts,
      };
    });

    areaLines.sort((a, b) => (a.isSelected ? 1 : 0) - (b.isSelected ? 1 : 0));

    const multiTicks = this.buildYTicks(multiMin, multiMax, chartH);

    const lowThreshY = toYMulti(multiMin + multiRange / 3);
    const highThreshY = toYMulti(multiMin + (2 * multiRange) / 3);
    const zones: Zone[] = [
      { y: this.offsetY, height: highThreshY - this.offsetY,  level: 'high', label: 'High' },
      { y: highThreshY,  height: lowThreshY - highThreshY,    level: 'mid',  label: 'Mid'  },
      { y: lowThreshY,   height: bottomY - lowThreshY,        level: 'low',  label: 'Low'  },
    ];

    const pricesBySlot: TooltipEntry[][] = Array.from({ length: SLOT_COUNT }, (_, slot) =>
      areaEntries
        .filter(({ hourlyPrices }) => hourlyPrices[slot] != null)
        .map(({ area, hourlyPrices }) => ({
          area,
          label: PRICE_AREAS.find(p => p.value === area)?.label ?? area,
          ore: hourlyPrices[slot].ore_per_kWh,
          color: AREA_COLORS[area],
          isSelected: area === selectedArea,
        }))
        .sort((a, b) => b.ore - a.ore)
    );

    const fmtTime = (s: string) => {
      const d = new Date(s);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };
    const slotTimes = prices.map((p) => ({
      start: fmtTime(p.time_start),
      end: fmtTime(p.time_end),
    }));

    const todayISO = new Date().toISOString().slice(0, 10);
    let nowLineX: number | null = null;
    if (selectedDate === todayISO) {
      const now = new Date();
      nowLineX = this.offsetX + (now.getHours() + now.getMinutes() / 60) * (this.chartW / 24);
    }

    return { bars, barW, yTicks, areaLines, multiTicks, zones, pricesBySlot, slotTimes, nowLineX };
  }

  private buildYTicks(min: number, max: number, chartH: number) {
    const ticks = [];
    const range = max - min || 1;
    for (let val = min; val <= max; val += 50) {
      const y = this.offsetY + chartH - ((val - min) / range) * chartH;
      ticks.push({ val, y });
    }
    return ticks;
  }

  trackByArea(_: number, line: AreaLine) { return line.area; }
  trackBySlot(_: number, bar: BarData) { return bar.slot; }
  trackByAreaEntry(_: number, entry: TooltipEntry) { return entry.area; }
}
