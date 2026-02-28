# 棋 Arena — Copilot Instructions

## Architecture Overview

Tri-game platform (Chess + Xiangqi + Gomoku) with a React frontend and a minimal Node.js WebSocket backend. AI runs **client-side via WASM** (Stockfish for chess, Fairy-Stockfish for Xiangqi) — the server only handles multiplayer and chat.

```
frontend/src/           ← React app (CRA, no router library)
  App.js                ← Hash-based routing, nav, error boundary
  ChessGame.js          ← Chess game (class component, ~1950 lines)
  XiangqiGame.js        ← Xiangqi game (class component, ~1625 lines)
  WuziQiGame.js         ← Gomoku game
  services/             ← Singletons & static helpers (Elo, WASM wrappers, ratings)
  config/index.js       ← Runtime config (reads REACT_APP_* env vars)
  constants/index.js    ← Enums: GAME_TYPE, DIFFICULTY, RESULT, RANK_THRESHOLDS
  firebase.js           ← Firebase facade (optional — app works without it)
  AuthContext.js         ← React context for auth (functional component + hooks)
backend/
  app.js                ← Entry point: raw http.createServer + ws WebSocket server
  config/index.js       ← Frozen config object (all env vars read here, nowhere else)
  handlers/             ← WS message handlers: (ws, message, roomManager) => void
  models/               ← Plain data classes (GameRoom, Player)
  services/             ← RoomManager (Map-based), EloService (static methods)
  routes/health.js      ← HTTP request handler factory
```

## Critical Conventions

### Frontend

- **Class components** throughout (except `AuthContext.js` and `GameResultDialog.js` which use hooks). Use `state = {}` class property syntax, arrow-function handlers. Do NOT refactor to hooks unless asked.
- **No React Router.** Navigation is hash-based: `ROUTES` map in `App.js` maps `#/chess` → `'game'`. Pages render via `{currentPage === "game" && <ChessGame />}`. Navigate with `this.navigateTo('pageKey')`.
- **Bilingual UI** — all user-facing strings use Chinese first, English second: `'将杀 Checkmate'`, `'好棋 / Good Move'`.
- **CSS** — single `App.css` (5400+ lines) + per-component CSS files. Class names are `kebab-case`. No CSS modules, no Tailwind.
- **State persistence** — `localStorage` is primary. Key names are in `config.storage.*`. Firebase Firestore is optional cloud sync.
- **Services** use three patterns:
  - Singleton instance: `FairyStockfishService` (default export of `new Class()`)
  - Lazy singleton factory: `ChessAnalysisService` → `getAnalysisService()`
  - Static methods: `EloService.calculateNewRating()`
  - Plain exported functions: `UserRatingService` → `{ getRating, recordResult }`

### Backend

- **No Express.** Raw `http.createServer()` with one dependency: `ws`. Don't add Express.
- **Config-first.** All env vars are read in `config/index.js` and nowhere else. Add new tunables there.
- **Handler signature:** `function handleX(ws, message, roomManager)` — stateless, all deps as args.
- **WebSocket metadata** is stored directly on the `ws` object (`ws.roomId`, `ws.playerColor`, `ws.playerName`).
- **Game state is client-authoritative.** Server stores FEN/history from client `move` messages. Checkmate detection is client-side.
- **ELO is server-side.** `endGameWithRating()` calculates and sends personalized `game_over` to each player.

### WASM Engine Integration

- **Stockfish** (chess): loaded as `new Worker('/stockfish.js')`, UCI protocol via `postMessage`.
- **Fairy-Stockfish** (Xiangqi): WASM binary fetched, worker JS converted to **blob URL** for COEP/CORS bypass. 30s init timeout via `Promise.race`.
- **FEN translation** between app notation and engine notation. The app uses culturally meaningful piece letters; the engine uses standard chess-variant letters:
  ```
  App:      r h e a k c s  (chariot, horse, elephant, advisor, king, cannon, soldier)
  Engine:   r n b a k c p  (rook,    knight, bishop,   advisor, king, cannon, pawn)
  ```
  Translation maps: `TO_FAIRY = { h→n, e→b, s→p }`, `FROM_FAIRY = { n→h, b→e, p→s }` (case-sensitive for red/black).
- **Rank indexing:** engine uses 1-based ranks (1–10), app uses 0-based (0–9). See `parseUCIMove`/`toUCIMove` in `FairyStockfishService.js`.

### Xiangqi Game Logic (`xiangqi.js`)

- Custom Xiangqi engine (~700 lines) — **not** chess.js. Implements all piece movement rules including river crossing, palace confinement, and "flying general" (将帅对面) check.
- **Stalemate = loss** in Xiangqi (called 困毙 kùn bì). `in_stalemate()` returns true when no legal moves exist, and it counts as a **loss**, not a draw. This differs from international chess.
- Board is a 10×9 grid (ranks 0–9, files a–i). Red moves first (equivalent to white in chess).
- FEN format uses forward slashes between ranks, same as chess but with 10 ranks.

### Capacitor / Mobile

- **Single codebase** → Web + iOS + Android via Capacitor 8. Config in `frontend/capacitor.config.ts`.
- **CapacitorService.js** — lazy-loaded facade over `@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/keyboard`. Every method is **safe to call on web** (no-ops gracefully).
  - `hapticTap()` — light (piece select), `hapticImpact()` — medium (capture), `hapticNotification()` — strong (checkmate)
  - `isNative()` / `getPlatform()` — platform detection
  - `hideSplash()` / `setStatusBarStyle()` — native UI
- **COEP/COOP headers** required for SharedArrayBuffer (WASM threading). Set in `capacitor.config.ts` server headers and `setupProxy.js` for dev.
- **`androidScheme: 'https'`** in config — required for WASM loading on Android WebView.
- iOS uses `iosScheme: 'capacitor'` for local asset loading.

## Dev Workflow

```bash
# Backend (port 3030)
cd backend && npm install && npm start

# Frontend (port 3000, proxies WS to backend)
cd frontend && npm install && npm start

# Docker (both services)
docker-compose up --build

# Capacitor (iOS/Android)
cd frontend && npm run build && npx cap sync
```

- Frontend uses CRA with `setupProxy.js` for COEP/COOP headers in dev.
- WASM files (`stockfish.js`, `stockfish.wasm`, `fairy-stockfish.js`, `fairy-stockfish.wasm`) live in `frontend/public/`.
- Firebase config is via `REACT_APP_FIREBASE_*` env vars — app gracefully degrades without them.

## Key Constants & Config

- `GAME_TYPE`: `{ CHESS: 'chess', XIANGQI: 'xiangqi', WUZIQI: 'wuziqi' }`
- `DIFFICULTY`: `{ EASY: 1, MEDIUM: 2, HARD: 3, MASTER: 4 }`
- `RESULT`: `{ WIN: 'win', LOSS: 'loss', DRAW: 'draw' }`
- ELO floor: 100, starting rating: 1200, K-factors: 40 (new) / 20 (default) / 10 (≥2400)

## WebSocket Message Types

Client→Server: `create_room`, `join_room`, `move`, `chat`, `resign`, `draw_offer`, `draw_response`, `rematch`  
Server→Client: `room_created`, `room_joined`, `opponent_joined`, `game_start`, `opponent_move`, `game_over`, `chat`, `draw_offered`, `draw_declined`, `rematch_start`, `opponent_disconnected`, `error`

## File Naming

- Components: `PascalCase.js` (`ChessGame.js`, `GameResultDialog.js`)
- Services: `PascalCase.js` (`EloService.js`, `UserRatingService.js`)
- Game logic modules: `camelCase.js` (`xiangqi.js`, `firebase.js`)
- Constants/config: `index.js` inside named folders
- CSS: matches component name (`AICoach.css`, `ProfilePage.css`)

## Known Patterns to Preserve

- Game components are intentionally monolithic (~2000 lines) — they contain game logic, UI, AI, tutorial, and review in one file. Don't split unless asked.
- `App.js` owns its own auth listener via `onAuthChange()` despite `AuthProvider` wrapping it (class component can't use hooks).
- The `ROUTES` map exists in both `App.js` and `constants/index.js` — update both when adding routes.
- Legal pages (`/privacy`, `/terms`) are in `LegalPages.js` and routed via hash like all other pages.
- `ProfilePage` receives `user` prop from `App.js` for account management features.
