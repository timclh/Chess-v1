const WebSocket = require('ws');

const PORT = process.env.WS_PORT || 3030;

const wss = new WebSocket.Server({ port: PORT });

console.log(`WebSocket server started on port ${PORT}`);

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

// Graceful shutdown
function shutdown() {
  console.log('Shutting down WebSocket server...');
  wss.clients.forEach(function each(client) {
    client.close(1001, 'Server shutting down');
  });
  wss.close(function () {
    console.log('WebSocket server closed');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
