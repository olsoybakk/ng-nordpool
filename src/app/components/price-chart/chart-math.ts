/**
 * Shared by scroll-zoom and pinch-zoom. Given the fractional slot under the cursor/pinch-center
 * before the zoom step and the new visible slot count, returns the new [start, end] range.
 *
 * The floor-based formula (rather than Math.round) provably keeps floor(anchorSlot) fixed under
 * the cursor after the step: since anchorFrac * visibleCount lands in [k, k+1) for some integer
 * k, the resulting start always places floor(anchorSlot) at the same on-screen position.
 */
export function clampZoomRange(
  anchorSlot: number,
  anchorFrac: number,
  visibleCount: number,
  total: number,
): [number, number] {
  let start = Math.floor(anchorSlot) - Math.floor(anchorFrac * visibleCount);
  let end = start + visibleCount - 1;
  if (start < 0) {
    start = 0;
    end = Math.min(visibleCount - 1, total - 1);
  }
  if (end >= total) {
    end = total - 1;
    start = Math.max(0, end - visibleCount + 1);
  }
  return [start, end];
}

export interface YTick {
  val: number;
  y: number;
  labelY: number;
}

/** Y-axis gridline ticks every 50 units. labelY is clamped so the top tick's centered text
 * never extends above the SVG viewport (y < 0) and gets clipped. */
export function buildYTicks(
  min: number,
  max: number,
  chartH: number,
  offsetY: number,
  labelSize: number,
): YTick[] {
  const ticks: YTick[] = [];
  const range = max - min || 1;
  const minLabelY = Math.ceil(labelSize * 0.6);
  for (let val = min; val <= max; val += 50) {
    const y = offsetY + chartH - ((val - min) / range) * chartH;
    ticks.push({ val, y, labelY: Math.max(y, minLabelY) });
  }
  return ticks;
}
