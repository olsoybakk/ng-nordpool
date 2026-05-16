import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  input,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { map, tap } from 'rxjs/operators';
import { combineLatest } from 'rxjs';
import { AREA_COLORS, HourlyPrice, PRICE_AREAS, PriceArea } from '../../models/price.model';
import { localISODate } from '../../utils/date';
import {
  selectCurrentPrice,
  selectMergedAreaPrices,
  selectSelectedArea,
  selectSelectedDate,
  selectDateRangeDays,
} from '../../store';
import { LanguageService } from '../../services/language.service';

export type ChartMode = 'bar' | 'line';

const TAX_FACTOR = 1.25;
const NO_TAX_AREAS = new Set<PriceArea>(['NO4']);

function displayOre(area: PriceArea, ore: number, includeTax: boolean): number {
  return includeTax && !NO_TAX_AREAS.has(area) ? ore * TAX_FACTOR : ore;
}

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
  isDayBoundary: boolean;
  dayLabel: string;
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
  area: string;
  label: string;
  ore: number;
  color: string;
  isSelected: boolean;
  isNorgespris?: boolean;
}

const CHART_W = 1500;
const CHART_H = 380;
const PADDING = { top: 16, right: 48, bottom: 36, left: 60 };
const SLOT_COUNT = 96; // slots per day
const FULLSCREEN_OUTER = 24;
const FULLSCREEN_INNER = 12;
const DASHBOARD_H_PAD = 64;
const DASHBOARD_MAX_W = 1100;
const CARD_PAD_PX = 20;
const NORGESPRIS_ORE_INCL_TAX = 50;

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
  readonly ls = inject(LanguageService);

  chartMode = input<ChartMode>('line');
  includeTax = input(false);
  showNorgespris = input(false);

  readonly viewBoxW = CHART_W;
  readonly chartW = CHART_W - PADDING.left - PADDING.right;
  readonly offsetX = PADDING.left;
  readonly offsetY = PADDING.top;

  isFullscreen = signal(false);

  private readonly windowWidth = signal(window.innerWidth);
  private readonly windowHeight = signal(window.innerHeight);
  private readonly containerH = signal(0);
  private readonly dateRangeDays = toSignal(this.store.select(selectDateRangeDays), { initialValue: 1 });

  /** Updated from the view model so updateTooltip always reads the correct slot width. */
  private readonly _slotCount = signal(SLOT_COUNT);
  readonly slotW = computed(() => this.chartW / this._slotCount());

  constructor() {
    const destroyRef = inject(DestroyRef);
    const onResize = () => {
      this.windowWidth.set(window.innerWidth);
      this.windowHeight.set(window.innerHeight);
    };
    window.addEventListener('resize', onResize);
    destroyRef.onDestroy(() => window.removeEventListener('resize', onResize));

    afterNextRender(() => {
      const ro = new ResizeObserver((entries) => {
        const h = entries[0]?.contentRect.height ?? 0;
        if (h > 0) this.containerH.set(h);
      });
      ro.observe(this.elementRef.nativeElement);
      destroyRef.onDestroy(() => ro.disconnect());
    });
  }

  readonly dims = computed(() => {
    const ww = this.windowWidth();
    const wh = this.windowHeight();
    const ch = this.containerH();
    const mode = this.chartMode();
    const fullscreen = this.isFullscreen();
    const edge = 2 * (FULLSCREEN_OUTER + FULLSCREEN_INNER);

    const renderedW = fullscreen
      ? window.innerWidth - edge
      : Math.min(DASHBOARD_MAX_W, ww) - DASHBOARD_H_PAD;

    const labelSize = Math.round(10 * CHART_W / Math.max(renderedW, 100));
    const padBottom = Math.max(PADDING.bottom, Math.round(labelSize * 1.5));

    let h: number;
    if (fullscreen) {
      h = Math.max(200, Math.round(((window.innerHeight - edge) * CHART_W) / renderedW) - PADDING.top - padBottom);
    } else if (ww < 640) {
      h = Math.max(200, Math.round(wh * 0.45 * CHART_W / renderedW) - PADDING.top - padBottom);
    } else if (ch > 0 && mode === 'line') {
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
      xAxisY: chartBottomY + Math.round(labelSize * 0.9),
      nowLabelY: labelSize > PADDING.top ? PADDING.top + Math.round(labelSize * 0.9) : PADDING.top - 3,
      axisTitleX: Math.max(12, Math.ceil(labelSize / 2) + 2),
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
    this.isFullscreen.update((v) => !v);
  }

  hoveredSlot = signal<number | null>(null);
  tooltipLeft = signal(0);
  tooltipTop = signal(0);
  tooltipFlip = signal(false);
  tooltipAnchor = signal<'center' | 'above' | 'below'>('center');
  zoomRange = signal<[number, number] | null>(null);

  private _totalSlotCount = signal(SLOT_COUNT);
  private _pinchState: { dist: number; range: [number, number]; centerSlot: number } | null = null;
  private _scrollDragState: { startX: number; startRange: [number, number]; trackW: number } | null = null;

  readonly scrollThumbLeft = computed(() => {
    const zoom = this.zoomRange();
    return zoom ? (zoom[0] / this._totalSlotCount()) * 100 : 0;
  });

  readonly scrollThumbWidth = computed(() => {
    const zoom = this.zoomRange();
    return zoom ? ((zoom[1] - zoom[0] + 1) / this._totalSlotCount()) * 100 : 100;
  });

  vm$ = combineLatest([
    this.store.select(selectCurrentPrice),
    this.store.select(selectMergedAreaPrices),
    this.store.select(selectSelectedArea),
    this.store.select(selectSelectedDate),
    this.store.select(selectDateRangeDays),
    toObservable(this.dims),
    toObservable(this.includeTax),
    toObservable(this.showNorgespris),
    toObservable(this.zoomRange),
  ]).pipe(
    map(([current, mergedAreaPrices, selectedArea, selectedDate, dateRangeDays, dims, includeTax, showNorgespris, zoom]) =>
      this.buildViewModel(
        current,
        mergedAreaPrices,
        selectedArea,
        selectedDate,
        dateRangeDays,
        dims,
        includeTax,
        showNorgespris,
        zoom as [number, number] | null
      )
    ),
    tap((vm) => {
      if (vm) {
        this._slotCount.set(vm.slotCount);
        this._totalSlotCount.set(vm.totalSlotCount);
      }
    })
  );

  onMouseMove(event: MouseEvent): void {
    this.updateTooltip(event.currentTarget as SVGSVGElement, event.clientX, event.clientY, false);
  }

  onTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 2) return;
    event.preventDefault();
    const dist = this.pinchDist(event.touches);
    const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
    const centerClientX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
    const svgX = (centerClientX - rect.left) * (CHART_W / rect.width);
    const zoom = this.zoomRange();
    const total = this._totalSlotCount();
    const [zs, ze] = zoom ?? [0, total - 1];
    const visGap = this.chartW / (ze - zs + 1);
    const centerSlot = zs + (svgX - this.offsetX) / visGap;
    this._pinchState = { dist, range: zoom ?? [0, total - 1], centerSlot };
  }

  onTouchMove(event: TouchEvent): void {
    if (event.touches.length === 2) {
      event.preventDefault();
      if (!this._pinchState) return;
      const dist = this.pinchDist(event.touches);
      const scale = dist / this._pinchState.dist;
      const total = this._totalSlotCount();
      const initVisible = this._pinchState.range[1] - this._pinchState.range[0] + 1;
      const newVisible = Math.round(initVisible / scale);
      const clamped = Math.min(total, Math.max(8, newVisible));
      if (clamped >= total) {
        this.zoomRange.set(null);
      } else {
        const center = this._pinchState.centerSlot;
        let start = Math.round(center - clamped / 2);
        let end = start + clamped - 1;
        if (start < 0) { start = 0; end = Math.min(clamped - 1, total - 1); }
        if (end >= total) { end = total - 1; start = Math.max(0, end - clamped + 1); }
        this.zoomRange.set([start, end]);
      }
      return;
    }
    const touch = event.touches[0];
    if (!touch) return;
    event.preventDefault();
    this.updateTooltip(event.currentTarget as SVGSVGElement, touch.clientX, touch.clientY, true);
  }

  onTouchEnd(event: TouchEvent): void {
    if (event.touches.length < 2) this._pinchState = null;
    if (event.touches.length === 0) this.hoveredSlot.set(null);
  }

  resetZoom(): void {
    this.zoomRange.set(null);
  }

  onScrollThumbDown(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const track = (event.currentTarget as HTMLElement).parentElement!;
    this._scrollDragState = {
      startX: event.clientX,
      startRange: this.zoomRange()!,
      trackW: track.getBoundingClientRect().width,
    };
    const onMove = (e: MouseEvent) => {
      if (!this._scrollDragState) return;
      const { startX, startRange, trackW } = this._scrollDragState;
      const total = this._totalSlotCount();
      const visible = startRange[1] - startRange[0] + 1;
      const slotDelta = Math.round(((e.clientX - startX) / trackW) * total);
      let start = startRange[0] + slotDelta;
      let end = start + visible - 1;
      if (start < 0) { start = 0; end = visible - 1; }
      if (end >= total) { end = total - 1; start = total - visible; }
      this.zoomRange.set([start, end]);
    };
    const onUp = () => {
      this._scrollDragState = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  onScrollTrackDown(event: MouseEvent): void {
    const track = event.currentTarget as HTMLElement;
    const rect = track.getBoundingClientRect();
    const clickFrac = (event.clientX - rect.left) / rect.width;
    const total = this._totalSlotCount();
    const zoom = this.zoomRange();
    if (!zoom) return;
    const [zs, ze] = zoom;
    const visible = ze - zs + 1;
    const clickSlot = clickFrac * total;
    let start: number;
    if (clickSlot < zs) {
      start = Math.max(0, zs - visible);
    } else {
      start = Math.min(total - visible, ze + 1);
    }
    this.zoomRange.set([start, start + visible - 1]);
  }

  private pinchDist(touches: TouchList): number {
    return Math.hypot(
      touches[1].clientX - touches[0].clientX,
      touches[1].clientY - touches[0].clientY
    );
  }

  private updateTooltip(svg: SVGSVGElement, clientX: number, clientY: number, isTouch: boolean): void {
    const rect = svg.getBoundingClientRect();
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;

    const svgX = relX * (this.viewBoxW / rect.width);
    const slot = Math.floor((svgX - this.offsetX) / this.slotW());

    const slotCount = this._slotCount();
    if (slot >= 0 && slot < slotCount) {
      this.hoveredSlot.set(slot);

      // Tooltip is position:fixed so coordinates are viewport-relative.
      // relX/relY are only used for slot detection and flip threshold.
      const TOOLTIP_W = 300;
      const flip = clientX > window.innerWidth - TOOLTIP_W;
      this.tooltipFlip.set(flip);
      this.tooltipLeft.set(
        flip ? Math.max(TOOLTIP_W, clientX) : Math.min(clientX, window.innerWidth - TOOLTIP_W)
      );

      const HALF_H = this.chartMode() === 'bar' ? 35 : 110;
      const tooltipH = HALF_H * 2;
      if (isTouch) {
        // Anchor based on viewport space (clientY), not SVG-relative position.
        // Prefer 'above' (user said overlapping content above the chart is fine);
        // fall back to 'below' only when too close to the top of the viewport.
        // Clamp 'below' so the tooltip never exits the viewport bottom.
        const hasSpaceAbove = clientY >= tooltipH + 44;
        const anchor = hasSpaceAbove ? 'above' : 'below';
        this.tooltipAnchor.set(anchor);
        const top = anchor === 'below'
          ? Math.min(clientY, window.innerHeight - tooltipH - 44)
          : clientY;
        this.tooltipTop.set(top);
      } else {
        this.tooltipAnchor.set('center');
        this.tooltipTop.set(Math.max(HALF_H, Math.min(clientY, window.innerHeight - HALF_H)));
      }
    } else {
      this.hoveredSlot.set(null);
    }
  }

  onMouseLeave(): void {
    this.hoveredSlot.set(null);
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const svgX = (event.clientX - rect.left) * (CHART_W / rect.width);

    const total = this._totalSlotCount();
    const zoom = this.zoomRange();
    const [zs, ze] = zoom ?? [0, total - 1];
    const visible = ze - zs + 1;

    // Scale zoom by delta magnitude so trackpad feels smooth and mouse wheel snaps.
    const factor = Math.pow(1.003, event.deltaY);
    const newVisible = Math.round(visible * factor);
    const clamped = Math.min(total, Math.max(8, newVisible));

    if (clamped >= total) {
      this.zoomRange.set(null);
      return;
    }

    const visGap = this.chartW / visible;
    const cursorSlot = zs + (svgX - this.offsetX) / visGap;
    const cursorFrac = (cursorSlot - zs) / visible;
    // floor-based formula guarantees floor(cursorSlot) stays under cursor after zoom
    let start = Math.floor(cursorSlot) - Math.floor(cursorFrac * clamped);
    let end = start + clamped - 1;
    if (start < 0) { start = 0; end = Math.min(clamped - 1, total - 1); }
    if (end >= total) { end = total - 1; start = Math.max(0, end - clamped + 1); }
    this.zoomRange.set([start, end]);
  }

  private buildViewModel(
    current: HourlyPrice | null,
    allAreaPrices: Partial<Record<PriceArea, HourlyPrice[]>>,
    selectedArea: PriceArea,
    selectedDate: string,
    dateRangeDays: number,
    { chartH, bottomY, labelSize }: { chartH: number; bottomY: number; labelSize: number },
    includeTax: boolean,
    showNorgespris: boolean,
    zoom: [number, number] | null
  ) {
    const allBarPrices = allAreaPrices[selectedArea] ?? [];
    if (!allBarPrices.length) return null;

    const snapFloor25 = (v: number) => { const s = Math.floor(v / 25) * 25; return s < v ? s : s - 25; };
    const snapCeil25  = (v: number) => { const s = Math.ceil(v / 25)  * 25; return s > v ? s : s + 25; };

    const totalSlotCount = allBarPrices.length;
    const zStart = Math.max(0, zoom ? zoom[0] : 0);
    const zEnd = Math.min(totalSlotCount - 1, zoom ? zoom[1] : totalSlotCount - 1);
    const barPrices = allBarPrices.slice(zStart, zEnd + 1);
    const slotCount = barPrices.length;
    if (!slotCount) return null;

    const gap = this.chartW / slotCount;
    const barW = gap * 0.8;

    // Norgespris value in the display unit (computed early so scale can include it)
    const norgesprisDisplayOre = showNorgespris
      ? (includeTax ? NORGESPRIS_ORE_INCL_TAX : NORGESPRIS_ORE_INCL_TAX / TAX_FACTOR)
      : null;

    // Bar chart: single area, visible slots
    const singleValues = barPrices.map((p) => displayOre(selectedArea, p.ore_per_kWh, includeTax));
    const singleMin = snapFloor25(Math.min(...singleValues) - 5);
    const singleMax = snapCeil25(Math.max(...singleValues) + 5);
    const singleRange = singleMax - singleMin || 1;

    const visibleHours = slotCount / 4;
    const baseHourStep = dateRangeDays === 1 ? 3 : dateRangeDays <= 3 ? 6 : dateRangeDays <= 7 ? 12 : 24;
    const hourStep = visibleHours <= 6 ? 1 : visibleHours <= 12 ? 2 : baseHourStep;
    const showDayLabels = dateRangeDays > 1;
    const slotsPerDay = SLOT_COUNT; // 96

    const bars: BarData[] = barPrices.map((p, i) => {
      const ore = displayOre(selectedArea, p.ore_per_kWh, includeTax);
      const normalised = (ore - singleMin) / singleRange;
      const barH = Math.max(2, normalised * chartH);
      const third = singleRange / 3;
      let priceLevel: 'low' | 'mid' | 'high';
      if (ore <= singleMin + third) priceLevel = 'low';
      else if (ore <= singleMin + 2 * third) priceLevel = 'mid';
      else priceLevel = 'high';

      const d = new Date(p.time_start);
      const absoluteSlot = zStart + i;
      const isDayBoundary = absoluteSlot % slotsPerDay === 0;
      const dayLabel = isDayBoundary
        ? d.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric' })
        : '';

      return {
        slot: i,
        hour: d.getHours(),
        minute: d.getMinutes(),
        timeLabel: d.getHours().toString().padStart(2, '0'),
        price: p,
        x: this.offsetX + i * gap + gap * 0.1,
        barHeight: barH,
        barY: this.offsetY + chartH - barH,
        isCurrent: current != null && p.time_start === current.time_start,
        priceLevel,
        isDayBoundary,
        dayLabel,
      };
    });

    const yTicks = this.buildYTicks(singleMin, singleMax, chartH);

    // Line chart: all areas, visible slots
    const areaEntries = PRICE_AREAS.map(({ value }) => ({
      area: value,
      hourlyPrices: (allAreaPrices[value] ?? []).slice(zStart, zEnd + 1),
    })).filter((e) => e.hourlyPrices.length > 0);

    let rawMultiMin = Infinity, rawMultiMax = -Infinity;
    for (const { area, hourlyPrices } of areaEntries) {
      for (const p of hourlyPrices) {
        const v = displayOre(area, p.ore_per_kWh, includeTax);
        if (v < rawMultiMin) rawMultiMin = v;
        if (v > rawMultiMax) rawMultiMax = v;
      }
    }
    const multiMin = snapFloor25(rawMultiMin - 5);
    const multiMax = snapCeil25(rawMultiMax + 5);
    const multiRange = multiMax - multiMin || 1;
    const toYMulti = (v: number) =>
      this.offsetY + chartH - ((v - multiMin) / multiRange) * chartH;

    const areaLines: AreaLine[] = areaEntries.map(({ area, hourlyPrices }) => {
      const stepPairs: string[] = [];
      const pts: PointData[] = [];

      hourlyPrices.forEach((p, i) => {
        const ore = displayOre(area, p.ore_per_kWh, includeTax);
        const x1 = this.offsetX + i * gap;
        const x2 = this.offsetX + (i + 1) * gap;
        const y = toYMulti(ore);
        stepPairs.push(`${x1},${y}`, `${x2},${y}`);
        if (current != null && p.time_start === current.time_start) {
          pts.push({ slot: i, cx: x1, cy: y, isCurrent: true, ore });
        }
      });

      const lastOre = displayOre(area, hourlyPrices.at(-1)!.ore_per_kWh, includeTax);
      const rawLabelX = this.offsetX + hourlyPrices.length * gap + 4;
      const maxLabelX = CHART_W - Math.round(labelSize * 1.8) - 4;
      return {
        area,
        color: AREA_COLORS[area],
        isSelected: area === selectedArea,
        linePoints: stepPairs.join(' '),
        labelX: Math.min(rawLabelX, maxLabelX),
        labelY: toYMulti(lastOre) + 4,
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

    const pricesBySlot: TooltipEntry[][] = Array.from({ length: slotCount }, (_, slot) => {
      const entries: TooltipEntry[] = areaEntries
        .filter(({ hourlyPrices }) => hourlyPrices[slot] != null)
        .map(({ area, hourlyPrices }) => ({
          area,
          label: PRICE_AREAS.find((p) => p.value === area)?.label ?? area,
          ore: displayOre(area, hourlyPrices[slot].ore_per_kWh, includeTax),
          color: AREA_COLORS[area],
          isSelected: area === selectedArea,
        }))
        .sort((a, b) => b.ore - a.ore);

      if (norgesprisDisplayOre !== null) {
        const nEntry: TooltipEntry = {
          area: 'norgespris',
          label: 'Norgespris',
          ore: norgesprisDisplayOre,
          color: 'var(--color-norgespris)',
          isSelected: false,
          isNorgespris: true,
        };
        const idx = entries.findIndex((e) => e.ore < norgesprisDisplayOre!);
        if (idx === -1) entries.push(nEntry);
        else entries.splice(idx, 0, nEntry);
      }

      return entries;
    });

    const fmtTime = (s: string) => {
      const d = new Date(s);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };
    const slotTimes = barPrices.map((p) => {
      const d = new Date(p.time_start);
      return {
        start: fmtTime(p.time_start),
        end: fmtTime(p.time_end),
        date: dateRangeDays > 1
          ? d.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' })
          : null,
      };
    });

    // "Now" line: compute absolute slot fraction, then map to visible x
    const todayISO = localISODate();
    let nowAbsoluteSlotFrac: number | null = null;
    if (dateRangeDays === 1 && selectedDate === todayISO) {
      const now = new Date();
      nowAbsoluteSlotFrac = (now.getHours() + now.getMinutes() / 60) * 4;
    } else if (dateRangeDays > 1) {
      const oldestDate = new Date(selectedDate + 'T12:00:00');
      oldestDate.setDate(oldestDate.getDate() - (dateRangeDays - 1));
      const oldest = oldestDate.toISOString().slice(0, 10);
      if (oldest <= todayISO && todayISO <= selectedDate) {
        const dayOffset = Math.round(
          (new Date(todayISO + 'T12:00:00').getTime() - new Date(oldest + 'T12:00:00').getTime()) /
          86400000
        );
        const now = new Date();
        nowAbsoluteSlotFrac = dayOffset * slotsPerDay + (now.getHours() + now.getMinutes() / 60) * 4;
      }
    }

    let nowLineX: number | null = null;
    if (nowAbsoluteSlotFrac !== null &&
        nowAbsoluteSlotFrac >= zStart && nowAbsoluteSlotFrac <= zEnd + 1) {
      nowLineX = this.offsetX + (nowAbsoluteSlotFrac - zStart) * gap;
    }

    const clampY = (y: number) => Math.max(this.offsetY, Math.min(bottomY, y));
    const norgesprisBarY = norgesprisDisplayOre !== null
      ? clampY(this.offsetY + chartH - ((norgesprisDisplayOre - singleMin) / singleRange) * chartH)
      : null;
    const norgesprisLineY = norgesprisDisplayOre !== null
      ? clampY(toYMulti(norgesprisDisplayOre))
      : null;

    return {
      bars,
      barW,
      yTicks,
      areaLines,
      multiTicks,
      zones,
      pricesBySlot,
      slotTimes,
      nowLineX,
      slotCount,
      totalSlotCount,
      hourStep,
      showDayLabels,
      norgesprisBarY,
      norgesprisLineY,
      norgesprisOre: norgesprisDisplayOre,
    };
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
