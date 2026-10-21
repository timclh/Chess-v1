/**
 * CoachSheet: the full-screen coach as a bottom sheet with three heights.
 *
 *   peek  the best move and win chance at a glance, the board stays fully visible
 *   half  the candidate moves, the top of the board stays visible
 *   full  everything
 *
 * Drag the handle up or down to change height, tap it to cycle, press Escape to close.
 * It replaces the old side panel, which covered most of a phone-sized board.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

export const SNAPS = ['peek', 'half', 'full'];
const DRAG_THRESHOLD = 40; // px of vertical drag that changes the height
const TAP_SLOP = 6; // px of movement that still counts as a tap

/** The height after the handle was dragged by `dy` px (negative = up = taller). */
export function snapAfterDrag(current, dy, threshold = DRAG_THRESHOLD) {
  const i = Math.max(0, SNAPS.indexOf(current));
  if (dy <= -threshold) return SNAPS[Math.min(SNAPS.length - 1, i + 1)];
  if (dy >= threshold) return SNAPS[Math.max(0, i - 1)];
  return SNAPS[i];
}

/** Tapping the handle steps through the heights and wraps around. */
export function snapAfterTap(current) {
  return SNAPS[(Math.max(0, SNAPS.indexOf(current)) + 1) % SNAPS.length];
}

export default function CoachSheet({ title, summary, onClose, initialSnap = 'peek', children }) {
  const [snap, setSnap] = useState(SNAPS.includes(initialSnap) ? initialSnap : 'peek');
  const drag = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onPointerDown = useCallback((e) => {
    drag.current = { y: e.clientY, moved: false };
    if (e.currentTarget.setPointerCapture && e.pointerId !== undefined) {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) { /* not capturable */ }
    }
  }, []);

  const onPointerMove = useCallback((e) => {
    const d = drag.current;
    if (d && Math.abs(e.clientY - d.y) > TAP_SLOP) d.moved = true;
  }, []);

  const onPointerUp = useCallback((e) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const dy = e.clientY - d.y;
    setSnap((current) => (d.moved ? snapAfterDrag(current, dy) : snapAfterTap(current)));
  }, []);

  // Keyboard: Enter/Space cycle, arrows go taller/shorter
  const onKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSnap((c) => snapAfterTap(c));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSnap((c) => snapAfterDrag(c, -DRAG_THRESHOLD));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSnap((c) => snapAfterDrag(c, DRAG_THRESHOLD));
    }
  }, []);

  return (
    <section className={`coach-sheet snap-${snap}`} role="dialog" aria-label={title}>
      <button
        type="button"
        className="coach-sheet-grab"
        aria-label="Resize coach panel"
        aria-expanded={snap !== 'peek'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { drag.current = null; }}
        onKeyDown={onKeyDown}
      />
      <header className="coach-sheet-head">
        <span className="coach-sheet-title"><Icon name="hint" size={16} /> {title}</span>
        <span className="coach-sheet-summary">{summary}</span>
        <button type="button" className="coach-close-btn" onClick={onClose} aria-label="Close coach">
          <Icon name="close" size={18} />
        </button>
      </header>
      <div className="coach-sheet-body fullscreen-coach-body" aria-hidden={snap === 'peek'}>
        {children}
      </div>
    </section>
  );
}
