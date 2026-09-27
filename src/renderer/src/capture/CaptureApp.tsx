import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { clampRegion, REGION_MIN, type PuckRect } from '@shared/puck';

type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
type Gesture =
  | { kind: 'move'; startX: number; startY: number; from: PuckRect }
  | { kind: 'resize'; handle: Handle; startX: number; startY: number; from: PuckRect }
  | { kind: 'draw'; startX: number; startY: number };

const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const CURSOR: Record<Handle, string> = { n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize' };

function resized(from: PuckRect, handle: Handle, dx: number, dy: number): PuckRect {
  let { x, y, width, height } = from;
  if (handle.includes('e')) width = from.width + dx;
  if (handle.includes('s')) height = from.height + dy;
  if (handle.includes('w')) { x = from.x + dx; width = from.width - dx; }
  if (handle.includes('n')) { y = from.y + dy; height = from.height - dy; }
  if (width < REGION_MIN) { if (handle.includes('w')) x = from.x + from.width - REGION_MIN; width = REGION_MIN; }
  if (height < REGION_MIN) { if (handle.includes('n')) y = from.y + from.height - REGION_MIN; height = REGION_MIN; }
  return { x, y, width, height };
}

export function CaptureApp() {
  const { t } = useTranslation();
  const [canvas, setCanvas] = useState<{ width: number; height: number } | null>(null);
  const [region, setRegion] = useState<PuckRect | null>(null);
  const [busy, setBusy] = useState(false);
  const gesture = useRef<Gesture | null>(null);

  useEffect(() => window.cth.onPuckCaptureInit((init) => {
    setCanvas({ width: init.width, height: init.height });
    setRegion(init.region);
  }), []);

  const confirm = useCallback(async () => {
    if (!region || busy) return;
    setBusy(true);
    const r = await window.cth.puckCaptureConfirm(region);
    // Main closes this window on success and on failure alike; if it is
    // still here the call itself failed before main took over.
    if (!r.ok) setBusy(false);
  }, [region, busy]);

  const cancel = useCallback(() => { void window.cth.puckCaptureCancel(); }, []);

  // 0.5.2 (card v052-stapler-capture-buttons-placement): Capture and Cancel
  // sit on the Stapler, not at the edge of the box, so the eye stays where it
  // was. The Stapler asks main, main asks this window, and this window answers
  // with the box it holds. Enter and Escape still work here.
  useEffect(() => window.cth.onPuckCaptureRequest(() => { void confirm(); }), [confirm]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); cancel(); return; }
      if (e.key === 'Enter') { e.preventDefault(); void confirm(); return; }
      if (!region || !canvas) return;
      const step = e.shiftKey ? 10 : 1;
      const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (d[e.key]) {
        e.preventDefault();
        const [dx, dy] = d[e.key];
        setRegion(clampRegion({ ...region, x: region.x + dx, y: region.y + dy }, canvas.width, canvas.height));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [region, canvas, confirm, cancel]);

  const onDown = (e: React.PointerEvent, g: Gesture) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    gesture.current = g;
  };
  const onMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || !canvas) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (g.kind === 'move') setRegion(clampRegion({ ...g.from, x: g.from.x + dx, y: g.from.y + dy }, canvas.width, canvas.height));
    else if (g.kind === 'resize') setRegion(clampRegion(resized(g.from, g.handle, dx, dy), canvas.width, canvas.height));
    else {
      const x = Math.min(g.startX, e.clientX);
      const y = Math.min(g.startY, e.clientY);
      setRegion(clampRegion({ x, y, width: Math.abs(dx), height: Math.abs(dy) }, canvas.width, canvas.height));
    }
  };
  const onUp = () => { gesture.current = null; };

  if (!canvas || !region) return null;

  return (
    <div
      style={{ position: 'absolute', inset: 0, fontFamily: 'var(--cth-font-ui)', cursor: 'crosshair', userSelect: 'none' }}
      onPointerDown={(e) => onDown(e, { kind: 'draw', startX: e.clientX, startY: e.clientY })}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {/* The box. Its shadow paints the dim over everything outside it. */}
      <div
        style={{
          position: 'absolute', left: region.x, top: region.y, width: region.width, height: region.height,
          boxShadow: '0 0 0 100000px rgba(26, 19, 32, 0.38)',
          outline: '1px solid #FFF8E7', outlineOffset: -1,
          cursor: 'move'
        }}
        onPointerDown={(e) => onDown(e, { kind: 'move', startX: e.clientX, startY: e.clientY, from: region })}
      >
        <div style={{ position: 'absolute', inset: 0, border: '1px dashed rgba(26,19,32,0.55)' }} />
        {HANDLES.map((h) => {
          const cx = h.includes('w') ? 0 : h.includes('e') ? region.width : region.width / 2;
          const cy = h.includes('n') ? 0 : h.includes('s') ? region.height : region.height / 2;
          return (
            <div
              key={h}
              role="presentation"
              style={{ position: 'absolute', left: cx - 6, top: cy - 6, width: 12, height: 12, borderRadius: 3, background: '#FFF8E7', border: '1px solid #1A1320', cursor: CURSOR[h] }}
              onPointerDown={(e) => onDown(e, { kind: 'resize', handle: h, startX: e.clientX, startY: e.clientY, from: region })}
            />
          );
        })}
        <div style={{ position: 'absolute', left: 0, top: -24, fontSize: 11, fontVariantNumeric: 'tabular-nums', color: '#FFF8E7', textShadow: '0 1px 2px rgba(26,19,32,0.9)', whiteSpace: 'nowrap' }}>
          {region.width} × {region.height}
        </div>
      </div>

      {/* The instruction, top centre, out of the way. While a capture is being
          taken it says so; the buttons themselves are on the Stapler. */}
      <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', padding: '6px 12px', borderRadius: 999, background: 'rgba(26,19,32,0.82)', color: '#FFF8E7', fontSize: 12, whiteSpace: 'nowrap' }}>
        {busy ? t('pro.puck.capture.capturing') : t('pro.puck.capture.hint')}
      </div>
    </div>
  );
}
