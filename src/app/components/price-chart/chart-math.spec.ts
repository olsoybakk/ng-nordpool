import { buildYTicks, clampZoomRange } from './chart-math';

describe('clampZoomRange', () => {
  // Simulates repeated zoom-in steps and checks the invariant the formula is built to
  // guarantee: floor(anchorSlot) — the slot under the cursor/pinch-center — stays inside the
  // visible range after every step, i.e. never "runs away" from the cursor as you keep zooming.
  function zoomSteps(anchorSlot: number, total: number, steps: number, shrinkFactor: number) {
    let range: [number, number] = [0, total - 1];
    for (let i = 0; i < steps; i++) {
      const visible = range[1] - range[0] + 1;
      const anchorFrac = (anchorSlot - range[0]) / visible;
      const nextVisible = Math.max(8, Math.round(visible * shrinkFactor));
      range = clampZoomRange(anchorSlot, anchorFrac, nextVisible, total);
      expect(anchorSlot).toBeGreaterThanOrEqual(Math.floor(range[0]));
      expect(Math.floor(anchorSlot)).toBeLessThanOrEqual(range[1]);
    }
    return range;
  }

  it('keeps the anchor slot within the visible range across repeated zoom-in steps', () => {
    zoomSteps(500, 960, 6, 0.5);
  });

  it('keeps a near-start anchor within range across repeated zoom-in steps', () => {
    zoomSteps(2, 960, 4, 0.5);
  });

  it('keeps a near-end anchor within range across repeated zoom-in steps', () => {
    zoomSteps(958, 960, 4, 0.5);
  });

  it('returns the full range width when nothing needs clamping', () => {
    // Anchor in the middle, zooming from a 96-slot window down to 48.
    const [start, end] = clampZoomRange(48, 0.5, 48, 96);
    expect(end - start + 1).toBe(48);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeLessThan(96);
  });

  it('clamps start to 0 when the requested window would go negative', () => {
    const [start, end] = clampZoomRange(1, 0.9, 48, 96);
    expect(start).toBe(0);
    expect(end).toBe(47);
  });

  it('clamps end to total-1 when the requested window would overflow', () => {
    const [start, end] = clampZoomRange(94, 0.9, 48, 96);
    expect(end).toBe(95);
    expect(start).toBe(48);
  });
});

describe('buildYTicks', () => {
  it('produces ticks every 50 units from min to max inclusive', () => {
    const ticks = buildYTicks(0, 150, 300, 20, 12);
    expect(ticks.map((t) => t.val)).toEqual([0, 50, 100, 150]);
  });

  it('maps the min value to the bottom of the chart and max to the top', () => {
    const ticks = buildYTicks(0, 100, 300, 20, 12);
    const bottom = ticks.find((t) => t.val === 0)!;
    const top = ticks.find((t) => t.val === 100)!;
    expect(bottom.y).toBe(20 + 300); // offsetY + chartH
    expect(top.y).toBe(20); // offsetY
  });

  it('clamps labelY so the top tick label never renders above the SVG viewport (y < 0)', () => {
    // A tall chart with a large label size can otherwise push the top tick's centered text
    // (which extends ~labelSize/2 above its y) above y=0.
    const ticks = buildYTicks(0, 500, 1000, 0, 40);
    const top = ticks.find((t) => t.val === 500)!;
    expect(top.y).toBe(0);
    expect(top.labelY).toBeGreaterThanOrEqual(Math.ceil(40 * 0.6));
  });

  it('does not clamp labelY when it is already comfortably inside the viewport', () => {
    const ticks = buildYTicks(0, 100, 300, 20, 12);
    const bottom = ticks.find((t) => t.val === 0)!;
    expect(bottom.labelY).toBe(bottom.y);
  });

  it('falls back to a range of 1 when min equals max, avoiding division by zero', () => {
    const ticks = buildYTicks(100, 100, 300, 20, 12);
    expect(ticks).toEqual([{ val: 100, y: 20 + 300, labelY: 20 + 300 }]);
  });
});
