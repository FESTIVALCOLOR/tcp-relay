const WebSocket = require('ws');
const net = require('net');
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('OK');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const host = url.searchParams.get('h');
  const port = parseInt(url.searchParams.get('p') || '443');

  if (!host) { ws.close(1008, 'Missing host'); return; }

  const socket = net.createConnection({ host, port });

  ws.on('message', (data) => {
    if (socket.writable) socket.write(data);
  });

  socket.on('data', (data) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  });

  ws.on('close', () => socket.destroy());
  socket.on('close', () => { try { ws.close(); } catch (e) {} });
  socket.on('error', (e) => { try { ws.close(1011, e.message); } catch (x) {} });
  ws.on('error', () => socket.destroy());
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`relay:${PORT}`));
