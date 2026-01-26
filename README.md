# Chess Game With Chat Room

A chess game with real-time chat room, built with React, Node.js, WebSocket, and Stockfish chess engine.

## Features

- Play chess against Stockfish AI
- Real-time chat with other players
- WebSocket-based communication

## Local Development

### Backend
```bash
cd backend
npm install
npm start
# Server runs on http://localhost:3030
```

### Frontend
```bash
cd frontend
npm install
npm start
# App runs on http://localhost:3000
```

## Docker Deployment

```bash
docker-compose up --build
# Frontend: http://localhost:3000
# Backend: ws://localhost:3030
```

## Deploy to Render.com (Free)

### Quick Deploy

1. Fork this repository to your GitHub account

2. Go to [Render Dashboard](https://dashboard.render.com/)

3. Click **New** → **Blueprint**

4. Connect your GitHub repo and select it

5. Render will detect `render.yaml` and create both services

6. **Important**: After backend deploys, copy its URL (e.g., `chess-backend-xxxx.onrender.com`)

7. Go to your frontend service → **Environment** → Add:
   ```
   REACT_APP_WS_URL=wss://chess-backend-xxxx.onrender.com
   ```

8. Trigger a manual deploy on frontend

### Manual Deploy

#### Backend (Web Service)
- **Root Directory**: `backend`
- **Build Command**: `npm install`
- **Start Command**: `node app.js`
- **Environment**: `NODE_ENV=production`

#### Frontend (Static Site)
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `build`
- **Environment**: `REACT_APP_WS_URL=wss://your-backend-url.onrender.com`

## Tech Stack

- **Frontend**: React, chess.js, chessboardjsx
- **Backend**: Node.js, WebSocket (ws)
- **AI**: Stockfish chess engine
