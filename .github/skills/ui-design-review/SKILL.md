---
name: ui-design-review
description: 'Review a web or mobile UI as a professional product designer. Use when the user asks to critique, review, evaluate, audit, grade, or improve the visual design, layout, spacing, hierarchy, typography, color, accessibility, or user experience of a rendered web page or component. Captures screenshots with Playwright, inspects the DOM, and produces a ranked, actionable critique across multiple viewports. DO NOT USE FOR: backend logic review, code-structure review, performance profiling, unit testing.'
argument-hint: 'URL or route to review (e.g. http://localhost:3000/#/chess) and optionally viewports'
---

# UI Design Review

Act as a senior product designer conducting a professional design critique.
Deliver specific, prioritized, implementation-ready feedback — never vague praise.

## When to Use

- User asks to "review the UI", "critique the design", "how does it look?", "improve the UX", "make it look professional", "design audit", "give me a redesign review".
- User wants a design QA pass after implementing UI changes, before committing.
- Running the loop: implement → **review** → feedback → implement.

## Principles

Score the UI against these axes. Every finding must cite the axis it belongs to.

1. **Hierarchy** — is the primary action obvious in <1 second? Is there ONE clear focal point per screen?
2. **Spacing & Rhythm** — consistent spacing scale (4/8/12/16/24/32)? No cramped or floating elements?
3. **Alignment** — edges line up; no 1–2px drift between panels, headers, inputs.
4. **Typography** — max 3 font sizes per viewport. Labels are uppercase-tracked, bodies readable (13–15px), headings >=16px.
5. **Contrast & Color** — WCAG AA (4.5:1 body / 3:1 large text). Max 1 accent color + 1 semantic color per screen.
6. **Density** — not too airy (wasted real estate) and not too cramped (<8px gaps, <32px tap targets).
7. **State clarity** — hover, focus, disabled, active, loading, empty, error — each is visually distinct.
8. **Touch targets** — interactive elements ≥40×40 px (≥44 on iOS).
9. **Affordance** — clickable things *look* clickable; non-clickable things don't.
10. **Consistency** — same concept styled the same way everywhere (buttons, cards, icons, radii).
11. **Information density fit** — primary info in-rail, secondary in panels, tertiary behind a click.
12. **Delight & polish** — subtle transitions, thoughtful empty states, appropriate iconography.

## Reference Benchmarks

When reviewing chess/game apps, compare against: Lichess, Chess.com, Apple Chess, Listonic, Linear, Notion.
When reviewing dashboards: Vercel, Stripe, Linear.
When reviewing mobile games: App Store featured games.

## Procedure

1. **Capture evidence.** Run [the capture script](./scripts/capture.js) to screenshot the target URL at three viewports: desktop (1440×900), tablet (1024×768), mobile (390×844). If a login/setup modal appears, dismiss it first.
2. **Inspect the DOM.** Use the Playwright script to pull computed styles on key selectors (panels, buttons, headings) so the critique cites real values (e.g. `padding: 14px`, `color: #94a3b8`).
3. **Produce the review.** Use the template in [./references/review-template.md](./references/review-template.md). For each finding: axis, severity (🔴 critical / 🟠 major / 🟡 minor / 💡 polish), what, why, fix (concrete CSS or component change with file references).
4. **Rank top-5 fixes.** Give the user a prioritized list for a single next iteration. Do NOT list everything — quality over quantity.
5. **Offer next steps.** Ask whether to implement the top fixes or refine specific findings.

## Output Format

```
# UI Design Review — <page/route>
Viewport coverage: desktop / tablet / mobile
Overall grade: A/B/C/D (1-line summary)

## Top 5 fixes (ranked)
1. 🔴 [axis] — <one-line fix> → <file>
2. 🟠 [axis] — …
…

## Detailed findings
### <Area 1 e.g. Sidebar>
- 🔴 **[Hierarchy]** <issue> — at <viewport> <selector>. Fix: <diff-level suggestion>.
…

## Kept (working well)
- <short praise only where warranted>
```

## Anti-patterns

- Generic advice ("use more whitespace"). Always cite the specific element and value.
- Listing 30 findings. Rank ruthlessly; top 5–10 actionable items max.
- Only textual review without screenshots. Always capture first.
- Ignoring mobile. Always review at least one small viewport.
- Praising everything. A review's value is in diagnosis.

## References

- [Capture script](./scripts/capture.js) — Playwright screenshots + DOM inspection
- [Review template](./references/review-template.md) — Structured output format
