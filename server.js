// Máy chủ nhỏ: đọc sự kiện TikTok LIVE (chat, quà, tim) và đẩy sang trang game qua SSE.
// Chạy: node server.js <username_tiktok>   (ví dụ: node server.js tenbanlive)
// Thư viện không chính thức (reverse-engineer). TikTok có thể đổi giao thức bất cứ lúc nào.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebcastPushConnection } = require('tiktok-live-connector/legacy');

const PORT = Number(process.env.PORT || 8765);
const USERNAME = (process.argv[2] || process.env.TIKTOK_USER || '').replace(/^@/, '');
const ROOT = __dirname;
const clients = new Set();

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json',
};

function broadcast(type, data) {
  const line = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(line);
}

// Chỉ phát dữ liệu cần dùng, không gửi toàn bộ payload của TikTok
function connectTikTok() {
  if (!USERNAME) {
    console.log('Chưa truyền username. Dùng: node server.js <username_tiktok>');
    return;
  }
  const conn = new WebcastPushConnection(USERNAME, { processInitialData: false, enableExtendedGiftInfo: true });

  conn.on('chat', d => broadcast('chat', { user: d.uniqueId, comment: d.comment }));
  conn.on('like', d => broadcast('like', { user: d.uniqueId, likeCount: d.likeCount, total: d.totalLikeCount }));
  conn.on('gift', d => {
    // Quà có thể nhấn liên tiếp (streak): chỉ phát khi chuỗi kết thúc hoặc quà không phải loại streak
    const streakable = d.giftType === 1;
    if (streakable && !d.repeatEnd) return;
    broadcast('gift', { user: d.uniqueId, giftName: d.giftName, repeatCount: d.repeatCount || 1, diamonds: d.diamondCount || 0 });
  });
  conn.on('streamEnd', () => broadcast('status', { state: 'ended' }));
  let reconnectTimer = null, reconnectAttempt = 0, connecting = false;
  function scheduleReconnect() {
    if (reconnectTimer || connecting) return;
    const base = Math.min(60000, 10000 * (2 ** Math.min(reconnectAttempt, 3)));
    const delay = Math.round(base * (0.85 + Math.random() * 0.3));
    reconnectAttempt++;
    broadcast('status', { state: 'waiting', retryMs: delay });
    reconnectTimer = setTimeout(() => { reconnectTimer = null; connect(); }, delay);
  }
  conn.on('disconnected', () => {
    broadcast('status', { state: 'disconnected' });
    console.log('Mất kết nối, sẽ thử kết nối lại với thời gian chờ tăng dần.');
    scheduleReconnect();
  });

  function connect() {
    if (connecting) return;
    connecting = true;
    conn.connect()
      .then(state => {
        connecting = false; reconnectAttempt = 0;
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
        console.log(`Đã kết nối phòng LIVE của @${USERNAME} (roomId ${state.roomId})`);
        broadcast('status', { state: 'connected', roomId: state.roomId });
      })
      .catch(err => {
        connecting = false;
        console.log(`Không kết nối được @${USERNAME}: ${err.message || err}. Thử lại sau 15 giây.`);
        broadcast('status', { state: 'offline', message: String(err.message || err) });
        scheduleReconnect();
      });
  }
  connect();
}

// Đọc nội dung JSON của một yêu cầu POST (giới hạn 64KB)
function readJson(req, cb) {
  let body = '';
  req.on('data', d => { body += d; if (body.length > 65536) req.destroy(); });
  req.on('end', () => { try { cb(null, JSON.parse(body || '{}')); } catch (e) { cb(e); } });
}
let lastReport = null; // tình hình trận do trang game báo lên, app điều khiển đọc lại

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // App điều khiển gửi lệnh -> chuyển cho trang game qua SSE
  if (url.pathname === '/control' && req.method === 'POST') {
    readJson(req, (err, cmd) => {
      if (err || !cmd || typeof cmd.type !== 'string') { res.writeHead(400); res.end('bad json'); return; }
      broadcast('control', cmd);
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true}');
    });
    return;
  }
  // Trang game báo tình hình trận (2 giây một lần)
  if (url.pathname === '/report' && req.method === 'POST') {
    readJson(req, (err, data) => { if (!err) lastReport = Object.assign({}, data, { at: Date.now() }); res.writeHead(204); res.end(); });
    return;
  }
  if (url.pathname === '/summary') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ report: lastReport, clients: clients.size, tiktok: USERNAME || null }));
    return;
  }

  if (url.pathname === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive',
    });
    res.write(`event: status\ndata: ${JSON.stringify({ state: USERNAME ? 'waiting' : 'no-username', user: USERNAME })}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('Not found'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Trang LIVE: http://127.0.0.1:${PORT}/index.html`);
  console.log(`Trang quản lý: http://127.0.0.1:${PORT}/admin.html`);
  connectTikTok();
});
