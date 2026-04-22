# UI Design Review — Output Template

Use this exact structure in the final message to the user.

---

# UI Design Review — <page name/route>

**Viewports:** desktop (1440×900), tablet (1024×768), mobile (390×844)
**Overall grade:** A / B / C / D — <one-line summary of the biggest strength and weakness>

## Top 5 fixes (ranked)

1. 🔴 **[Axis]** — <one-line fix> → [`file.css`](file.css#L123)
2. 🟠 **[Axis]** — …
3. 🟠 **[Axis]** — …
4. 🟡 **[Axis]** — …
5. 💡 **[Axis]** — …

## Detailed findings

### <Area 1, e.g. Sidebar>
- 🔴 **[Hierarchy]** The "New Game" button competes with "Save Game" — both are same weight. At desktop `.settings-panel` shows identical padding/color across 6 buttons. Fix: give primary action (`.btn-primary`) a filled accent, make secondary ghost.
- 🟠 **[Spacing]** `.settings-section` gap 14px breaks the 8/16 rhythm elsewhere. Unify to 16px.

### <Area 2, e.g. Board area>
- ...

### <Area 3, e.g. Analysis panel>
- ...

### Responsive behavior
- **Tablet (1024):** Analysis panel drops below board — good, but max-height 320px clips the last suggestion.
- **Mobile (390):** Status bar shrinks OK but hint button tap target is 36×36 (<44).

## Kept (working well)
- Dark unified surface color keeps focus on the board.
- LED status indicator reads instantly.

## Severity legend
- 🔴 Critical — broken or unprofessional; fix before ship
- 🟠 Major — visible quality issue; fix this iteration
- 🟡 Minor — polish; fix when convenient
- 💡 Polish — nice-to-have refinement
