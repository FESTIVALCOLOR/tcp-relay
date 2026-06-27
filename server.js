const WebSocket = require('ws');
const net = require('net');
const http = require('http');

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  // Diagnostic: test TCP to a host
  if (url.pathname === '/test') {
    const host = url.searchParams.get('h') || '149.154.175.53';
    const port = parseInt(url.searchParams.get('p') || '443');
    const t0 = Date.now();
    const sock = net.createConnection({ host, port });
    sock.setTimeout(8000);
    sock.on('connect', () => {
      const ms = Date.now() - t0;
      // Send a TLS ClientHello (minimal)
      const ch = Buffer.from(
        '160301009e0100009a030300000000000000000000000000000000000000000000000000000000000000000000001ac02bc02fc02cc030cca9cca8c013c014002f0035000a010000570000000' +
        'e000c0000096c6f63616c686f73740017000000230000ff01000100000a000a0008001d00170018001900000b00020100000d001400120804080308010806060106030501050302030201', 'hex'
      );
      sock.write(ch);
      // Wait for ServerHello
      sock.once('data', (d) => {
        res.writeHead(200);
        res.end(`TCP+TLS OK ${host}:${port} in ${Date.now()-t0}ms, got ${d.length} bytes back\n`);
        sock.destroy();
      });
    });
    sock.on('timeout', () => { res.writeHead(200); res.end(`TIMEOUT ${host}:${port} after ${Date.now()-t0}ms\n`); sock.destroy(); });
    sock.on('error', (e) => { res.writeHead(200); res.end(`TCP ERROR ${host}:${port}: ${e.message}\n`); });
    return;
  }

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
