const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.WS_PORT || process.env.PORT || 3030;

// Create HTTP server for health checks (required by Render.com)
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'chess-websocket' }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Create WebSocket server attached to HTTP server
const wss = new WebSocket.Server({ server });

console.log(`Server starting on port ${PORT}`);

wss.on('connection', function connection(ws, req) {
  const clientIp = req.socket.remoteAddress;
  console.log(`Client connected from ${clientIp}`);

  ws.on('message', function incoming(data) {
    // Broadcast to all other connected clients
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        try {
          client.send(data);
        } catch (error) {
          console.error('Error sending message to client:', error);
        }
      }
    });
  });

  ws.on('error', function error(err) {
    console.error('WebSocket error:', err);
  });

  ws.on('close', function close() {
    console.log(`Client disconnected from ${clientIp}`);
  });
});

wss.on('error', function error(err) {
  console.error('WebSocket server error:', err);
});

// Start the server
server.listen(PORT, () => {
  console.log(`HTTP + WebSocket server running on port ${PORT}`);
});

// Graceful shutdown
function shutdown() {
  console.log('Shutting down server...');
  wss.clients.forEach(function each(client) {
    client.close(1001, 'Server shutting down');
  });
  server.close(function () {
    console.log('Server closed');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
