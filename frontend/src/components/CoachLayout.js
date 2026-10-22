/**
 * Pieces that keep the coach panel from shaking the page.
 *
 * The coach panel sits below the board on narrow screens. Its content changes with every
 * move (analyzing, results, the opponent's explanation, advice), and when the page is
 * scrolled to the bottom a panel that gets shorter makes the browser clamp the scroll
 * position, so the whole page - board included - jumps. Two parts:
 *
 *   SuggestionSkeleton  placeholder cards with the size of the real ones, shown instead
 *                       of a one-line "analyzing…"
 *   StableHeight        a panel that never gets shorter during a game
 */

import React, { useEffect, useLayoutEffect, useRef } from 'react';

/** Placeholder suggestion cards, the same size as the real ones (the text is invisible). */
export function SuggestionSkeleton({ count = 2, label }) {
  return (
    <div className="suggested-moves-list suggestion-skeleton" role="status" aria-label={label}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="suggestion skeleton">
          <div className="suggestion-move">
            <span className="rank">#{i + 1}</span>
            <span className="san skeleton-text">XXXXXXXX</span>
            <span className="win-prob skeleton-text">00%</span>
          </div>
          <div className="suggestion-reason"><span className="skeleton-text">Strong move</span></div>
        </div>
      ))}
    </div>
  );
}

/**
 * A container that keeps the tallest height it has had until `resetKey` changes (a new
 * game) or the window gets a different width. It does nothing for a sticky panel, which
 * scrolls on its own, and never grows past the panel's own max-height.
 */
export function StableHeight({ resetKey, children, ...props }) {
  const ref = useRef(null);
  const tallest = useRef({ key: resetKey, height: 0, width: typeof window !== 'undefined' ? window.innerWidth : 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const memo = tallest.current;
    if (memo.key !== resetKey) {
      memo.key = resetKey;
      memo.height = 0;
      el.style.minHeight = '';
    }
    const style = window.getComputedStyle(el);
    if (style.position === 'sticky') return;
    const max = parseFloat(style.maxHeight); // NaN for "none"
    memo.height = Math.max(memo.height, el.offsetHeight);
    el.style.minHeight = `${Number.isFinite(max) ? Math.min(memo.height, max) : memo.height}px`;
  });

  // A different width reflows the content, so start measuring again. (Not on height: phones
  // fire resize when the address bar hides, which would undo this on every scroll.)
  useEffect(() => {
    const onResize = () => {
      const memo = tallest.current;
      if (window.innerWidth === memo.width) return;
      memo.width = window.innerWidth;
      memo.height = 0;
      if (ref.current) ref.current.style.minHeight = '';
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return <div ref={ref} {...props}>{children}</div>;
}
