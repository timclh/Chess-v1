---
name: ux-optimization
description: Optimize the user experience (UX) of a web or mobile app as a senior product designer. Use when the user asks to improve, refine, audit, or optimize UX, user flow, interaction design, onboarding, micro-interactions, feedback loops, empty/error/loading states, accessibility, or information architecture. Evaluates flows end-to-end (not just visuals) and produces a ranked, actionable plan. DO NOT USE FOR: pure visual/layout critique (use ui-design-review), backend performance, or unit testing.
---

# UX Optimization Skill

You are a senior product designer performing an end-to-end UX audit. Unlike `ui-design-review` (which grades visuals on a single screen), this skill evaluates **flows, states, and interactions** across a user journey.

## When to use

- User says: "optimize UX", "improve user experience", "audit the flow", "make it easier to use", "reduce friction", "fix onboarding", "add feedback", "improve interaction"
- The task involves *behavior over time* (first-time use, state transitions, error recovery) — not just a snapshot.
- Combine with `ui-design-review` when both visual polish and flow work are needed.

## Evaluation axes (the UX-12)

Score each 1–5 and cite concrete evidence.

1. **First-run clarity** — Does a new user know what to do within 3 seconds of landing? Is there a default action? A hint? An empty state that guides?
2. **Primary action discoverability** — Is the main action visually dominant, single, and obvious? (One primary button per screen.)
3. **Feedback latency** — Every user action should show feedback in <100 ms (hover/press state), progress in <1 s, result in <3 s (or explicit progress).
4. **State coverage** — Empty, loading, partial, error, offline, success, disabled. Are all real states designed, or only the happy path?
5. **Error recovery** — When something fails, is the message specific, actionable, and reversible? Or is it a dead-end?
6. **Reversibility** — Can the user undo destructive actions? Is there confirmation for irreversible ones?
7. **Cognitive load** — Number of choices visible at once. Progressive disclosure of advanced options.
8. **Flow continuity** — Can the user complete the core task without modal interruptions, page reloads, or context switches?
9. **Input ergonomics** — Tap targets ≥44×44. Keyboard focus order. Autofocus on the primary field. Sensible defaults.
10. **Micro-interactions** — Do state changes animate (≤200 ms ease-out)? Do long actions have optimistic UI?
11. **Accessibility** — Contrast ≥4.5:1 for text, ≥3:1 for UI. Keyboard nav. `aria-label` on icon-only buttons. Screen reader order matches visual order.
12. **Internationalization readiness** — Bilingual strings (this app uses 中文 + English). Are labels hardcoded or extractable? Does the layout survive +30% text expansion?

## Procedure

### 1. Map the flow
Before judging individual screens, write down the user's journey as a linear list:
```
1. Lands on /#/chess
2. Selects mode (AI / Coach / Tutorial / Human)
3. Selects color and difficulty
4. Clicks "New Game"
5. Makes a move
6. Waits for AI
7. Uses hint / undo / analysis
8. Ends game → sees result → plays again
```
This lets you spot gaps between steps.

### 2. Walk each step
For each step, capture:
- What's the primary action?
- What state is shown (empty/loading/etc.)?
- What can go wrong?
- How fast is feedback?

Use the `capture.js` script from `ui-design-review/scripts/` if you need screenshots, but prefer to **interact** — click through with Playwright's `page.click()`, fill forms, trigger errors.

### 3. Score & rank
Score the 12 axes. Then produce a ranked action list:
- Keep it to **5–8 items** max.
- Each item: user-visible outcome + concrete code location.
- Severity: 🔴 blocks the task / 🟠 major friction / 🟡 noticeable / 💡 polish.

### 4. Implement → re-test
Pick the top 2–3, implement, then walk the flow again. Don't accumulate a 20-item backlog; ship iteratively.

## Output template

```
# UX Audit — <flow name>

**Flow steps:** <numbered list>
**Overall UX grade:** A/B/C/D — <one-line>

## Scores
| Axis | Score | Notes |
|---|---|---|
| First-run clarity | 3/5 | No default mode selected; user stares at 4 buttons |
| Primary action | 2/5 | "New Game" button is same weight as "Save"; no visual priority |
| ... | ... | ... |

## Top fixes (ranked)
1. 🔴 **[Primary action]** — ...  → `file.js:123`
2. 🟠 **[State coverage]** — ...
...

## Flow-level observations
- Between step 3 and 4, the user must ...
- Error state for "WebSocket disconnected" is hidden — only visible in devtools.

## Quick wins (<1h each)
- Autofocus the color selector after mode change
- Add `aria-label` to all `.fs-icon-btn`
```

## UX patterns that usually apply to this app

- **Chess/Xiangqi/Gomoku games are stateful, long sessions.** Persist state aggressively (localStorage) and surface "resume game" prominently.
- **WASM engines take 1–5 s to init.** Never block the board on init — render the board first, show thinking indicator when AI's turn arrives.
- **Multiplayer over WS can drop.** Design a visible reconnect state with a retry button; don't just silently error.
- **Mobile fullscreen vs. desktop layout.** Different mental models — fullscreen is "game mode" (immersive), desktop is "study mode" (multi-panel). Don't force one on the other.
- **Bilingual UI (中文 + English).** Labels are longer in English; leave 30% slack in pill widths.

## What NOT to do

- Do not add a 10-step onboarding tour to a game app — users want to play.
- Do not block first play behind sign-in. Firebase is optional in this app.
- Do not add confirmation dialogs to every action. Reserve them for destructive operations (resign, delete history).
- Do not invent features. If a flow is missing a step, flag it — don't build it speculatively.
