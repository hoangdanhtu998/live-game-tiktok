// Kháng Chiến — màn hình trận đấu cho TikTok LIVE (bản 2).
  // Anh Hùng Việt (Xanh, bên trái) đánh Yêu Quái (Đỏ, bên phải) trên chiến trường dài, 8 đường, tối đa 240 quân.
// Quà càng đắt nhân vật càng mạnh: từ 99 xu có chiêu cuối, từ 1000 xu có cảnh giáng thế riêng.
(() => {
  const cfg = window.loadConfig();
  const canvas = document.getElementById('field');
  const ctx = canvas.getContext('2d');
  const W = 390, H = 500;
  const quality = Object.assign({ renderScale: 1, effects: true, minimap: true }, window.KC_QUALITY || {});
  const perf = { frames: 0, slowFrames: 0, frameMs: 0, updateMs: 0, drawMs: 0, maxFrameMs: 0, fps: 0, sampleAt: 0, sampleFrames: 0 };
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = W * DPR * quality.renderScale; canvas.height = H * DPR * quality.renderScale;
  ctx.setTransform(DPR * quality.renderScale, 0, 0, DPR * quality.renderScale, 0, 0);

  // ---------- Kích thước sân ----------
  const WORLD = 1800;                              // sân dài ~4,6 màn hình
  const PARALLAX = 0.3;                            // phông xa trôi chậm hơn mặt đất
  const GROUND_TOP = 318;                          // mép trên mặt đất (xa)
  const LANES = [330, 352, 374, 396, 418, 440, 462, 484]; // 8 đường đánh, đường trên là xa
  const NL = LANES.length;
  const CASTLE_W = 230, CASTLE_BASE = 396, CASTLE_FOOT = 0.12;
  const FACE = { xanh: CASTLE_W * .87, do: WORLD - CASTLE_W * .87 };
  const SPAWN_X = { xanh: CASTLE_W * .8, do: WORLD - CASTLE_W * .8 };
  const SPEED = 1.6;
  const MAX_UNITS = 240;
  const MAX_PARTICLES = 260;
  const dir = { xanh: 1, do: -1 };
  const enemyOf = { xanh: 'do', do: 'xanh' };
  const TEAM_NAME = { xanh: 'DÂN VIỆT', do: 'YÊU TINH' };
  const col = t => cfg.teams[t].color;
  const SHOT_SPEED = { arrow: 6, stone: 5, magic: 4.5, fireball: 4, cannon: 4.5, lantern: 5 };
  const RARITY = cfg.tierNames.map((name, i) => ({ name, c: ['#cbd5e1', '#cbd5e1', '#86efac', '#7dd3fc', '#c4b5fd', '#fdba74', '#fde047'][i] }));
  const GIFT_ICONS = {
    rose: '🌹', rosa: '🌹', tea: '🍵', confetti: '🎊', tiktok: '🎵', gg: '🎮', icecream: '🍦', finger: '💞', handheart: '💝', loveyou: '💌', butterfly: '🦋', crown: '👑', bottle: '🧪',
    perfume: '🌸', donut: '🍩', cap: '🧢', crane: '🕊️', garland: '🌼', mic: '🎤', concert: '🎶', star: '⭐', galaxy: '🌌', fire: '🎆', lion: '🦁',
  };
  const SKILL_NAMES = {
    barrage: 'CỬU HOA ĐĂNG', shock: 'SẤM TRỐNG ĐỒNG', roar: 'KIM LÂN GẦM', wall: 'THÀNH ỐC TRẤN ĐỊA', webnet: 'LƯỚI TƠ MẶT NẠ',
    threads: 'KHÂU BÓNG TRÓI QUÂN', healwave: 'CHUÔNG HỒI SINH', charge: 'VOI CHIẾN XUNG TRẬN',
  };

  // ---------- Nhịp trận: ít nhất 10 phút ----------
  const PHASES = [
    { end: 180, floor: 66, name: 'Giai đoạn 1 · Giằng co' },
    { end: 360, floor: 33, name: 'Giai đoạn 2 · Công thành' },
    { end: 600, floor: 1, name: 'Giai đoạn 3 · Quyết chiến' },
    { end: 900, floor: 0, name: 'Tổng tấn công · phá thành để thắng' },
  ];
  const MATCH_MAX = 900;
  const GATE_DMG = 0.035;
  const TOWER = { range: 240, cd: 70, dmg: 6 };

  const state = {
    units: [], particles: [], bubbles: [], shots: [], dead: [], waves: [], spirits: [], banners: [],
    tick: 0, cam: { x: WORLD / 2 - W / 2, z: 1, y: H * .66 }, focus: null,
    base: { xanh: 100, do: 100 }, gateHit: { xanh: -999, do: -999 },
    hearts: { xanh: 0, do: 0 }, heartTurn: { xanh: 0, do: 0 },
    giftsSent: { xanh: 0, do: 0 }, joinCool: {}, joinTurn: { xanh: 0, do: 0 }, lastGiftTick: { xanh: -99999, do: -99999 },
    likes: 0, viewers: 1284, lastDefault: 0, defaultOn: false,
    gameOver: null, overAt: 0, overReason: '', matchStart: 0, phase: 0,
    towerCool: { xanh: 60, do: 60 }, floorMsgT: { xanh: -999, do: -999 },
    flash: { c: '#fff', t: -999 }, lastUlt: -99999, lastSkillBanner: -999, intro: null,
    combo: { team: null, count: 0, until: 0 }, shake: 0,
    stats: {}, feed: [], summonCount: {}, speed: 1, paused: false, matchNo: 1,
  };
  const WIN_HISTORY_KEY = 'khangchien-win-history-v1';
  function loadWinHistory() {
    try {
      const saved = JSON.parse(localStorage.getItem(WIN_HISTORY_KEY) || 'null');
      return { total: { xanh: Math.max(0, Number(saved?.total?.xanh) || 0), do: Math.max(0, Number(saved?.total?.do) || 0) }, recent: Array.isArray(saved?.recent) ? saved.recent.filter(x => x && (x.winner === 'xanh' || x.winner === 'do')).slice(0, 20) : [] };
    } catch (_) { return { total: { xanh: 0, do: 0 }, recent: [] }; }
  }
  let winHistory = loadWinHistory();
  function recordWin(winner, reason) {
    winHistory.total[winner]++;
    winHistory.recent.unshift({ winner, reason, time: Date.now() });
    winHistory.recent = winHistory.recent.slice(0, 20);
    try { localStorage.setItem(WIN_HISTORY_KEY, JSON.stringify(winHistory)); } catch (_) { /* thống kê trong phiên vẫn hoạt động nếu lưu trữ bị tắt */ }
    renderWinAnalysis();
  }

  // ---------- Tiện ích ----------
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.ceil(w * DPR); c.height = Math.ceil(h * DPR); const g = c.getContext('2d'); g.setTransform(DPR, 0, 0, DPR, 0, 0); return [c, g]; };
  const hexA = (hex, a) => { const n = parseInt(hex.replace('#', ''), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  quality.renderScale = clamp(Number(quality.renderScale) || 1, .6, 1);
  quality.effects = quality.effects !== false;
  quality.minimap = quality.minimap !== false;
  let appliedRenderScale = quality.renderScale;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const depthScale = y => .8 + clamp((y - LANES[0]) / (LANES[NL - 1] - LANES[0]), 0, 1) * .2;
  const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);

  // ---------- Lớp nền ----------
  const envImgs = {};
  let skyCanvas = null, skyW = 0, skyH = 0, groundCanvas = null, groundH = 0, glowSprite, vignetteCanvas;

  function buildSky() {
    const im = envImgs.sky;
    if (!im) return;
    skyH = 400; skyW = Math.round(im.width * skyH / im.height);
    const [c, g] = mk(skyW, skyH);
    g.drawImage(im, 0, 0, skyW, skyH);
    skyCanvas = c;
  }

  // Mặt đất: lát ảnh ruộng Việt theo chiều dài sân, có dải màu phe ở hai đầu và đường chia 6 hàng
  function buildGround() {
    groundH = H - GROUND_TOP + 30;
    const [c, g] = mk(WORLD, groundH);
    const im = envImgs.ground;
    if (im) {
      const th = groundH, tw = im.width * th / im.height;
      for (let x = 0; x < WORLD; x += tw - 1) g.drawImage(im, x, 0, tw, th);
    } else {
      const gr = g.createLinearGradient(0, 0, 0, groundH);
      gr.addColorStop(0, '#c9b45a'); gr.addColorStop(.35, '#a6a047'); gr.addColorStop(1, '#6f5a33');
      g.fillStyle = gr; g.fillRect(0, 0, WORLD, groundH);
      // ruộng bậc: các dải nhấp nhô, vài bụi cỏ và vũng nước
      for (let i = 0; i < NL + 1; i++) {
        const y = (LANES[Math.max(0, i - 1)] + (i === 0 ? -30 : 13)) - GROUND_TOP;
        g.fillStyle = i % 2 ? 'rgba(255,240,170,.08)' : 'rgba(40,60,10,.08)';
        g.fillRect(0, y, WORLD, 26);
      }
      g.fillStyle = 'rgba(160,210,240,.35)';
      for (let i = 0; i < 40; i++) { g.beginPath(); g.ellipse(rnd(0, WORLD), rnd(20, groundH - 10), rnd(10, 30), rnd(2, 5), 0, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = 'rgba(60,90,20,.45)'; g.lineWidth = 1.2;
      for (let i = 0; i < 420; i++) { const x = rnd(0, WORLD), y = rnd(8, groundH - 4); g.beginPath(); g.moveTo(x, y); g.lineTo(x + rnd(-2, 2), y - rnd(3, 7)); g.stroke(); }
    }
    // nhuộm màu phe ở hai đầu sân để người xem biết ngay đâu là bên nào
    for (const t of ['xanh', 'do']) {
      const x0 = t === 'xanh' ? 0 : WORLD, x1 = t === 'xanh' ? WORLD * .42 : WORLD * .58;
      const wash = g.createLinearGradient(x0, 0, x1, 0);
      wash.addColorStop(0, hexA(col(t), .42)); wash.addColorStop(1, hexA(col(t), 0));
      g.fillStyle = wash; g.fillRect(Math.min(x0, x1), 0, Math.abs(x1 - x0), groundH);
    }
    // vạch chia hàng mờ
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1.2; g.setLineDash([12, 14]);
    for (let i = 0; i < NL - 1; i++) {
      const y = (LANES[i] + LANES[i + 1]) / 2 + 12 - GROUND_TOP;
      g.beginPath(); g.moveTo(CASTLE_W, y); g.lineTo(WORLD - CASTLE_W, y); g.stroke();
    }
    g.setLineDash([]);
    // vạch giữa sân (chiến tuyến)
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.setLineDash([4, 10]);
    g.beginPath(); g.moveTo(WORLD / 2, 14); g.lineTo(WORLD / 2, groundH - 6); g.stroke(); g.setLineDash([]);
    // mép trên mờ dần vào phông cảnh
    g.globalCompositeOperation = 'destination-in';
    const fade = g.createLinearGradient(0, 0, 0, groundH);
    fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(.1, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = fade; g.fillRect(0, 0, WORLD, groundH);
    groundCanvas = c;
  }

  function buildStatic() {
    const [gc, gg] = mk(64, 64);
    const rg = gg.createRadialGradient(32, 32, 1, 32, 32, 30);
    rg.addColorStop(0, 'rgba(255,255,255,.9)'); rg.addColorStop(.4, 'rgba(255,255,255,.4)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    gg.fillStyle = rg; gg.fillRect(0, 0, 64, 64);
    glowSprite = gc;
    const [vc, vg] = mk(W, H);
    const vig = vg.createRadialGradient(W / 2, H / 2, H * .38, W / 2, H / 2, H * .85);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,.42)');
    vg.fillStyle = vig; vg.fillRect(0, 0, W, H);
    vignetteCanvas = vc;
  }
  const loadEnv = (key, src, done) => { const im = new Image(); im.onload = () => { envImgs[key] = im; done(); }; im.src = src; };

  // ---------- Sprite ----------
  const sprites = {};
  function loadSprite(key, spec, then) {
    const img = new Image();
    img.onload = () => {
      const cw = img.width / spec.cols, ch = img.height / spec.rows;
      const frames = [];
      for (let i = 0; i < spec.frames; i++) {
        const c = document.createElement('canvas');
        c.width = Math.round(cw); c.height = Math.round(ch);
        const cx = c.getContext('2d');
        cx.drawImage(img, (i % spec.cols) * cw, Math.floor(i / spec.cols) * ch, cw, ch, 0, 0, c.width, c.height);
        if (spec.clean) {
          const d = cx.getImageData(0, 0, c.width, c.height), p = d.data;
          for (let k = 0; k < p.length; k += 4) {
            const r = p[k], g = p[k + 1], b = p[k + 2];
            if ((g > 150 && g > r + 60 && g > b + 60) || (r > 170 && b > 150 && g < 110)) p[k + 3] = 0;
          }
          cx.putImageData(d, 0, 0);
        }
        if (spec.mask !== false) {
          cx.globalCompositeOperation = 'destination-in';
          const r = c.width / 2, gr = cx.createRadialGradient(r, r, r * .8, r, r, r);
          gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
          cx.fillStyle = gr; cx.fillRect(0, 0, c.width, c.height);
        }
        frames.push(c);
      }
      const all = frames.map((_, i) => i);
      sprites[key] = {
        frames, fps: spec.fps || 6, drawW: spec.drawW, cw, ch,
        walk: spec.walk || all.slice(0, spec.cols), attack: spec.attack || (spec.rows > 1 ? all.slice(spec.cols) : all),
        foot: spec.foot ?? .06, head: spec.head ?? .06,
      };
      if (then) then(sprites[key]);
    };
    img.src = spec.src;
  }
  // Chưa có tranh riêng cho Yêu Quái thì tạm nhuộm bản anh hùng sang tông đỏ tím "yêu khí"
  function deriveMonster(sp) {
    const frames = sp.frames.map(f => {
      const c = document.createElement('canvas'); c.width = f.width; c.height = f.height;
      const g = c.getContext('2d');
      g.filter = 'hue-rotate(150deg) saturate(1.3) brightness(.92)';
      g.drawImage(f, 0, 0);
      g.filter = 'none';
      g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(120,20,70,.18)'; g.fillRect(0, 0, c.width, c.height);
      return c;
    });
    return Object.assign({}, sp, { frames });
  }
  for (const [key, def] of Object.entries(cfg.units)) {
    if (def.sprite) loadSprite(key, def.sprite, sp => { if (!def.spriteDo && !sprites[key + '@do']) sprites[key + '@do'] = deriveMonster(sp); });
    if (def.spriteDo) loadSprite(key + '@do', def.spriteDo);
  }
  loadSprite('castle@xanh', { src: 'assets/thanh-xanh-sprite.webp', cols: 3, rows: 1, frames: 3, drawW: CASTLE_W, mask: false });
  loadSprite('castle@do', { src: 'assets/hang-yeu-3.webp', cols: 3, rows: 1, frames: 3, drawW: CASTLE_W, mask: false });

  loadSprite('skillFx', { src: 'assets/phep-thuat-16.webp', cols: 4, rows: 4, frames: 16, drawW: 128, mask: false });

  const spriteFor = (key, team) => { const k = cfg.units[key]?.proxy || key; return sprites[k + '@' + team] || sprites[k]; };
  const spriteOf = u => spriteFor(u.key, u.team);
  const labelOf = (key, team) => { const d = cfg.units[key]; return (team === 'do' && d.labelDo) || d.label; };
  function bodyR(u) { const sp = spriteOf(u); return (sp ? Math.min(24, sp.drawW * .2) : cfg.units[u.key].size * .6) * u.sc; }

  // ---------- DOM ----------
  const hudCache = {};
  const setText = (id, v) => { const e = $(id); if (e && hudCache[id] !== v) { hudCache[id] = v; e.textContent = v; } };
  const setWidth = (id, v) => { const e = $(id); const k = 'w' + id; if (e && hudCache[k] !== v) { hudCache[k] = v; e.style.width = v; } };
  function toast(text) {
    const el = $('toast'); if (!el) return;
    el.textContent = text; el.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), 1700);
  }
  function pushFeed(team, html, kind = '') {
    state.feed.unshift({ team, html, kind, t: Date.now() });
    if (state.feed.length > 40) state.feed.length = 40;
    state.feedDirty = true;
  }
  const addChat = (html, cls = '') => pushFeed(null, html, cls);

  // ---------- Thống kê người chơi (bảng xếp hạng) ----------
  function statsOf(user, team) {
    if (!user) return null;
    let s = state.stats[user];
    if (!s) s = state.stats[user] = { user, team, dmg: 0, heal: 0, tank: 0, kills: 0, summons: 0, coins: 0 };
    s.team = team || s.team;
    return s;
  }

  // ---------- Đơn vị ----------
  const TIER_HP = t => 1 + .3 * t, TIER_DMG = t => 1 + .22 * t, TIER_SIZE = t => 1 + .07 * t;

  function pickLane(team, tier = 0) {
    // Cân bằng mật độ theo làn; tướng cấp cao chỉ hơi ưu tiên trung tâm, không dồn cứng vào 2 làn.
    const counts = LANES.map((_, i) => state.units.reduce((n, u) => n + (u.team === team && u.lane === i ? (u.tier >= 4 ? 1.5 : 1) : 0), 0)
      + (tier >= 4 ? Math.abs(i - (NL - 1) / 2) * .12 : 0) + Math.random() * .45);
    return counts.indexOf(Math.min(...counts));
  }

  function spawn(team, unitKey, count = 1, owner = null, meta = {}) {
    if (state.gameOver) return [];
    const def = cfg.units[unitKey];
    if (!def) return [];
    count = Math.min(count, MAX_UNITS);
    // sân quá đông: bỏ lính tự sinh trước, rồi lính thường cũ nhất, cuối cùng mới tới tướng
    while (state.units.length + count > MAX_UNITS) {
      let idx = state.units.findIndex(x => !x.owner);
      if (idx < 0) idx = state.units.findIndex(x => (cfg.units[x.key].tier || 0) < 2);
      if (idx < 0) idx = 0;
      state.units.splice(idx, 1);
    }
    const tier = def.tier || 0;
    const made = [];
    for (let i = 0; i < count; i++) {
      const lane = pickLane(team, tier);
      const unitSprite = spriteFor(unitKey, team), unitScale = TIER_SIZE(tier) * depthScale(LANES[lane]);
      const unitRadius = (unitSprite ? Math.min(24, unitSprite.drawW * .2) : def.size * .6) * unitScale;
      const queueGap = state.units.reduce((gap, o) => gap + (o.team === team && o.lane === lane && (o.x - SPAWN_X[team]) * dir[team] < 30
        ? Math.max(28, bodyR(o) + unitRadius + 5) : 0), 0);
      const unit = {
        team, key: unitKey, def, lane, yOff: rnd(-3, 3), tier,
        x: SPAWN_X[team] - dir[team] * queueGap, y: LANES[lane],
        hp: Math.round(def.hp * TIER_HP(tier)), maxHp: 0, dmgMul: TIER_DMG(tier), sc: TIER_SIZE(tier) * depthScale(LANES[lane]),
        cool: 20, skillCool: Math.round((def.skillCd || 0) * rnd(.4, .8)), seed: Math.random() * 8, owner, gift: meta.gift || null,
        state: 'walk', atkT: -999, hitT: -999, waitT: 0, topY: LANES[lane] - 40, tagW: 0, bornT: state.tick, atkCount: 0,
        tag: !!owner && i === 0, rootT: 0, shieldT: 0, rallyT: 0, introUntil: 0, laneCool: 0,
        battleX: null, battleAt: -9999,
      };
      unit.maxHp = unit.hp;
      state.units.push(unit); made.push(unit);
    }
    return made;
  }

  function popText(x, y, text, color, size) {
    if (state.particles.length > MAX_PARTICLES) return;
    state.particles.push({ x, y, text, color, life: 36, kind: 'text', size });
  }
  function bubbleOn(unit, text, color = '#fff', opts = {}) {
    if (!unit) return;
    state.bubbles = state.bubbles.filter(b => b.unit !== unit);
    state.bubbles.push({ unit, text, color, life: opts.life || 150, tw: 0, big: !!opts.big });
    if (state.bubbles.length > 4) state.bubbles.splice(0, state.bubbles.length - 4);
  }
  const allyOf = team => { const l = state.units.filter(u => u.team === team); return l.length ? pick(l) : null; };

  // Camera: lướt tới một điểm và (tuỳ chọn) phóng to
  function focusOn(x, ticks = 150, zoom = 1, y = null, prio = 0) {
    if (state.focus && state.focus.prio > prio && state.tick < state.focus.until) return;
    state.focus = { x, until: state.tick + ticks, zoom, y, prio };
  }

  // ---------- Hiệu ứng cơ bản ----------
  function pushFx(p) { if (quality.effects && state.particles.length < MAX_PARTICLES + 60) state.particles.push(p); }
  function compactAlive(list, alive) {
    let write = 0;
    for (let i = 0; i < list.length; i++) if (alive(list[i])) list[write++] = list[i];
    list.length = write;
    return list;
  }
  function bolt(x1, y1, x2, y2, color, life = 12) {
    const pts = [[x1, y1]], n = 6;
    for (let i = 1; i < n; i++) pts.push([x1 + (x2 - x1) * i / n + rnd(-9, 9), y1 + (y2 - y1) * i / n + rnd(-3, 3)]);
    pts.push([x2, y2]);
    pushFx({ kind: 'bolt', pts, color, life, maxLife: life });
  }
  const streak = (x1, y1, x2, y2, color, life = 10, w = 3) => pushFx({ kind: 'streak', x1, y1, x2, y2, color, life, maxLife: life, w });
  const glyph = (x, y, text, life = 40, size = 14) => pushFx({ kind: 'text', x, y, text, color: '#fff', life, size });
  const ring = (x, y, color, life = 30, grow = 80, r0 = 6, extra = {}) => pushFx(Object.assign({ kind: 'ring', x, y, r0, color, life, maxLife: life, grow, delay: 0 }, extra));
  const aura = (x, y, color, size = 22, life = 14) => pushFx({ kind: 'aura', x, y, color, size, life, maxLife: life });

  // ---------- Linh hồn khổng lồ ----------
  function summonSpirit(team, key, x, y, power = 2, kind = 'summon') {
    const def = cfg.units[key];
    if (!def) return;
    if (state.spirits.length >= 3) state.spirits.shift();
    state.spirits.push({ team, key, x, y, t0: state.tick, power, kind, life: kind === 'ult' ? 90 : power >= 3 ? 190 : power > 1 ? 150 : 100 });
    if (power > 1 || kind === 'ult') {
      state.flash = { c: col(team), t: state.tick };
      state.shake = Math.max(state.shake, kind === 'ult' ? 9 : 13);
    }
    for (let i = 0; i < (power > 1 ? 3 : 1); i++) ring(x, y + 4, col(team), 34 + i * 8, 120, 6, { delay: i * 8 });
  }
  function banner(text, team, life = 120) {
    state.banners.push({ text, team, t0: state.tick, life });
    if (state.banners.length > 2) state.banners.shift();
  }
  const tintCache = {};
  function tintedFrame(key, team, idx) {
    const id = key + '|' + team + '|' + idx;
    if (tintCache[id]) return tintCache[id];
    const sp = spriteFor(key, team);
    if (!sp) return null;
    const f = sp.frames[idx];
    const c = document.createElement('canvas'); c.width = f.width; c.height = f.height;
    const g = c.getContext('2d');
    g.drawImage(f, 0, 0);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = hexA(col(team), .8); g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = .35; g.drawImage(f, 0, 0);
    return (tintCache[id] = c);
  }
  const beamCache = {};
  function beamSprite(team) {
    if (beamCache[team]) return beamCache[team];
    const c = document.createElement('canvas'); c.width = 64; c.height = 256;
    const g = c.getContext('2d');
    const hz = g.createLinearGradient(0, 0, 64, 0);
    hz.addColorStop(0, 'rgba(255,255,255,0)'); hz.addColorStop(.5, 'rgba(255,255,255,.55)'); hz.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hz; g.fillRect(0, 0, 64, 256);
    g.globalCompositeOperation = 'source-in';
    const cg = g.createLinearGradient(0, 0, 0, 256);
    cg.addColorStop(0, hexA(col(team), 0)); cg.addColorStop(.6, hexA(col(team), .6)); cg.addColorStop(1, hexA(col(team), .95));
    g.fillStyle = cg; g.fillRect(0, 0, 64, 256);
    return (beamCache[team] = c);
  }

  function burst(team) {
    for (let i = 0; i < 14; i++) pushFx({ kind: 'dot', x: SPAWN_X[team] + dir[team] * 10, y: rnd(LANES[1] - 20, LANES[4]), vx: rnd(-1, 1), vy: rnd(-2.2, 0), color: col(team), life: 30 });
  }

  function defaultTick() {
    if (!state.defaultOn || state.gameOver) return;
    const d = cfg.defaultSpawn;
    if (state.tick - state.lastDefault < d.intervalSec * 60) return;
    state.lastDefault = state.tick;
    for (const team of ['xanh', 'do']) if (state.tick - state.lastGiftTick[team] > 20 * 60) spawn(team, d.unit, d.perTeam);
  }

  // ---------- Sự kiện LIVE vào trận ----------
  const teamOf = {};
  const pickTeamFor = user => (teamOf[user] || (teamOf[user] = Math.random() < .5 ? 'xanh' : 'do'));
  const giftUnitKey = (gift, team) => gift[`unit${team === 'xanh' ? 'Xanh' : 'Do'}`] || cfg.roster[team][gift.tier];
  const quoteFor = tier => pick(cfg.quotes[tier >= 6 ? 'god' : tier >= 5 ? 'god' : tier >= 3 ? 'high' : tier >= 2 ? 'mid' : 'low']);

  // Hai vòng 18 nhân vật. Số lựa chọn theo từng bậc giống nhau ở hai phe để cùng giá có cùng cơ hội và sức mạnh.
  const GACHA_POOL = {
    xanh: ['linh', 'cung', 'khienMay', 'daNem', 'traucon', 'kyBinh', 'ySi', 'songKiem', 'bachHo', 'kimQuy', 'voiChien', 'bachTuong', 'kinhNgu', 'kyLan', 'thanhGiongTuong', 'phuongHoang', 'trongSam', 'thanhLong'],
    do: ['linh', 'cung', 'khienMay', 'daNem', 'traucon', 'kyBinh', 'ySi', 'songKiem', 'ngoCong', 'xaTinh', 'yeuTru', 'nguTinh', 'nhenRoi', 'mocTinh', 'thanhGiongTuong', 'hoTinh', 'cuuVi', 'hacGiao'],
  };
  const GACHA_COUNT = GACHA_POOL.xanh.length;
  function roleInfo(key) {
    const d = cfg.units[key] || {};
    if (d.heal || d.skill === 'healwave') return { label: 'Hỗ trợ', cls: 'support' };
    if (d.shield || d.taunt) return { label: 'Đỡ đòn', cls: 'tank' };
    if (['arrow', 'stone', 'cannon'].includes(d.projectile)) return { label: 'Bắn xa', cls: 'ranged' };
    if (d.projectile || d.range >= 90 || ['shock', 'dragonLightning', 'blackTide', 'roar', 'abyssalWave'].includes(d.skill)) return { label: 'Chưởng xa', cls: 'magic' };
    return { label: 'Cận chiến', cls: 'melee' };
  }

  // Xác suất trước tiên được chia theo tier, sau đó chia đều cho các nhân vật cùng tier.
  // Quà rẻ vẫn có thể trúng cấp cao nhưng tỉ lệ cực thấp; cấp 5-6 chỉ mở bằng quà giá trị cao.
  function gachaCandidates(coins, team) {
    const value = Math.max(0, Number(coins) || 0);
    const maxTier = value < 50 ? 4 : value < 1000 ? 5 : 6;
    const tierMass = [94, 4, 1.2, 0.55, 0.20, 0.045, 0.005];
    const priceBoost = Math.pow(1 + 0.35 * Math.log10(Math.max(1, value)), 1.2);
    const tierWeight = tierMass.map((mass, tier) => tier <= maxTier ? mass * Math.pow(priceBoost, tier) : 0);
    const pool = GACHA_POOL[team] || GACHA_POOL.xanh;
    const counts = Array(7).fill(0);
    for (const key of pool) counts[cfg.units[key]?.tier || 0]++;
    const eligible = pool.filter(key => (cfg.units[key]?.tier || 0) <= maxTier);
    const raw = eligible.map((key, index) => {
      const tier = cfg.units[key]?.tier || 0;
      return Object.assign({ key, index, tier, weight: (tierWeight[tier] || 0) / Math.max(1, counts[tier]) }, roleInfo(key));
    });
    const total = raw.reduce((sum, item) => sum + item.weight, 0) || 1;
    const rates = raw.map(item => item.weight / total);
    const cents = rates.map(rate => Math.floor(rate * 10000)); // hundredths of one percentage point
    let remainder = 10000 - cents.reduce((sum, value) => sum + value, 0);
    const order = rates.map((rate, index) => ({ index, fraction: rate * 10000 - cents[index] })).sort((a, b) => b.fraction - a.fraction);
    for (let i = 0; i < remainder; i++) cents[order[i % order.length].index]++;
    return raw.map((item, index) => Object.assign(item, { rate: rates[index], displayRate: `${(cents[index] / 100).toFixed(2)}%` }));
  }

  function rollGacha(coins, team) {
    const candidates = gachaCandidates(coins, team);
    let r = Math.random();
    for (const item of candidates) { r -= item.rate; if (r <= 0) return item; }
    return candidates[candidates.length - 1];
  }

  let gachaQueue = Promise.resolve();
  function showGacha(user, team, coins, result, done) {
    const task = () => new Promise(resolve => {
      const el = $('gacha');
      if (!el) { done(); resolve(); return; }
      const candidates = gachaCandidates(coins, team);
      el.className = 'gacha show';
      el.style.borderColor = col(team);
      el.innerHTML = `<div class="gt">🎡 @${escapeHtml(user)} · ${coins.toLocaleString('vi-VN')} xu · phe ${TEAM_NAME[team]}</div>
        <div class="gr" id="gachaReel">Sẵn sàng quay</div><div class="gs" id="gachaSub">Tỷ lệ trúng từng nhân vật</div>
      <div class="gacha-clock"><span id="gachaSeconds">4.0s</span><div class="gacha-track"><i id="gachaProgress"></i></div><span>${candidates.length} con</span></div>
        <div class="gacha-grid">${candidates.map((item, i) => { const p = portrait(item.key, team); const icon = item.cls === 'melee' ? '⚔' : item.cls === 'support' ? '💚' : item.cls === 'tank' ? '🛡' : item.cls === 'ranged' ? '🏹' : '✨'; return `<div class="gacha-slot" data-index="${i}"><span class="gacha-avatar">${p ? `<img src="${p}" alt="">` : icon}</span><span class="gacha-copy"><b>${escapeHtml(labelOf(item.key, team))}</b><small><span class="g-role ${item.cls}">${item.label}</span><span>${item.displayRate}</span></small></span></div>`; }).join('')}</div>`;
      const slots = [...el.querySelectorAll('.gacha-slot')], reel = $('gachaReel'), sub = $('gachaSub');
      const started = performance.now(), duration = 4000;
      let index = Math.floor(Math.random() * candidates.length), nextStep = started;
      const finish = () => {
        const item = candidates[result.index];
        slots.forEach((slot, i) => slot.classList.toggle('active', i === result.index));
        reel.textContent = labelOf(item.key, team); reel.style.color = RARITY[item.tier].c;
        sub.textContent = `★ ${RARITY[item.tier].name.toUpperCase()} · ${item.label.toUpperCase()} · TỶ LỆ ${item.displayRate}`;
        sub.style.color = RARITY[item.tier].c;
        $('gachaSeconds').textContent = 'DỪNG'; $('gachaProgress').style.width = '100%';
        setTimeout(() => { el.className = 'gacha'; done(); resolve(); }, 650);
      };
      const animate = now => {
        const progress = Math.min(1, (now - started) / duration);
        $('gachaSeconds').textContent = `${Math.max(0, (duration - (now - started)) / 1000).toFixed(1)}s`;
        $('gachaProgress').style.width = `${progress * 100}%`;
        if (progress >= 1) { finish(); return; }
        if (now >= nextStep) {
          index = (index + 1) % candidates.length;
          slots.forEach((slot, i) => slot.classList.toggle('active', i === index));
          const item = candidates[index], rarity = RARITY[item.tier];
          reel.textContent = labelOf(item.key, team); reel.style.color = rarity.c;
          sub.textContent = `${rarity.name} · ${item.label} · bậc ${item.tier} · ${item.displayRate}`;
          sub.style.color = rarity.c;
          nextStep = now + 42 + 520 * Math.pow(progress, 3); // chậm dần như vòng quay thật
        }
        requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    });
    gachaQueue = gachaQueue.then(task, task);
  }

  function giftFrom(user, gift, opts = {}) {
    const team = opts.team || pickTeamFor(user);
    teamOf[user] = team;
    const go = (unitKey, count, viaGacha) => {
      state.giftsSent[team]++;
      state.lastGiftTick[team] = state.tick;
      const def = cfg.units[unitKey];
      const tier = def.tier || 0;
      const now = Date.now();
      if (state.combo.team === team && now < state.combo.until) state.combo.count++;
      else state.combo = { team, count: 1, until: 0 };
      state.combo.until = now + 5000;
      const s = statsOf(user, team); s.summons += count; s.coins += gift.coins;
      state.summonCount[unitKey] = (state.summonCount[unitKey] || 0) + count;
      const made = spawn(team, unitKey, count, user, { gift: gift.name });
      const first = made[0];
      if (!first) return;
      const label = labelOf(unitKey, team);
      pushFeed(team, `<b class="${team}">${escapeHtml(user)}</b> ${viaGacha ? 'quay trúng' : 'tặng ' + escapeHtml(gift.name) + ' → gọi'} <b>${escapeHtml(label)}</b> ×${count} <i>cho ${TEAM_NAME[team]}</i> · tổng ${state.summonCount[unitKey]}`, 'gift');
      // Quân thường chỉ có thoại; intro/zoom dành riêng cho tướng bậc cao.
      const quote = (def.quote && pick(def.quote)) || quoteFor(tier);
      bubbleOn(first, quote, col(team), { big: true, life: 170 });
      if (tier >= 4) introSequence(first, user, gift, made);
      else {
        if (gift.coins >= 10 || tier >= 2) summonSpirit(team, unitKey, first.x, first.y, tier >= 3 ? 2 : 1);
        if (state.combo.count >= 3) { toast(`COMBO x${state.combo.count} · ${TEAM_NAME[team]} áp đảo`); state.shake = 8; }
        else toast(`${gift.name} → ${label} · phe ${TEAM_NAME[team]}`);
      }
      burst(team);
    };
    const gachaChance = gift.random ? 1 : (opts.gachaChance ?? cfg.gacha.chance);
    if ((gift.random || cfg.gacha.enabled) && !opts.noGacha && Math.random() < gachaChance && gift.coins >= 1) {
      const r = rollGacha(gift.coins, team);
      showGacha(user, team, gift.coins, r, () => go(r.key, 1, true));
    } else go(giftUnitKey(gift, team), gift.count, false);
  }

  function heartsFrom(user, n, opts = {}) {
    const team = opts.team || pickTeamFor(user);
    state.hearts[team] += n;
    while (state.hearts[team] >= cfg.hearts.threshold) {
      state.hearts[team] -= cfg.hearts.threshold;
      const key = cfg.hearts.units[team][state.heartTurn[team]++ % cfg.hearts.units[team].length];
      const made = spawn(team, key, cfg.hearts.count, user);
      const first = made[0];
      if (!first) continue;
      statsOf(user, team).summons += made.length;
      state.summonCount[key] = (state.summonCount[key] || 0) + made.length;
      bubbleOn(first, quoteFor(cfg.units[key].tier || 0), col(team), { big: true, life: 170 });
      pushFeed(team, `<b class="${team}">${escapeHtml(user)}</b> góp đủ ${cfg.hearts.threshold} tim → <b>${escapeHtml(labelOf(key, team))}</b> <i>cho ${TEAM_NAME[team]}</i>`, 'gift');
      toast(`${TEAM_NAME[team]} đủ ${cfg.hearts.threshold} tim → ${labelOf(key, team)}!`);
      summonSpirit(team, key, first.x, first.y, 2);
      burst(team);
    }
    state.likes += n;
    setText('likes', state.likes);
  }

  function commentFrom(user, text) {
    const t = text.trim();
    const team = cfg.commentJoin[t];
    if (team) {
      teamOf[user] = team;
      const js = cfg.joinSpawn || { unit: 'linh', cooldownSec: 15 };
      const now = Date.now();
      if (!state.joinCool[user] || now >= state.joinCool[user]) {
        state.joinCool[user] = now + js.cooldownSec * 1000;
        const pool = [js[team], ...cfg.hearts.units[team].filter(k => k !== js[team])];
        const key = pool[state.joinTurn[team]++ % pool.length];
        const count = Math.max(1, Math.min(8, Number(js.count) || 2));
        const made = spawn(team, key, count, user);
        statsOf(user, team).summons += made.length;
        if (made[0]) bubbleOn(made[0], `⚔ ${user} ra trận!`, col(team));
        pushFeed(team, `<b class="${team}">${escapeHtml(user)}</b> vào phe <b>${TEAM_NAME[team]}</b> · ra trận ×${made.length}`, 'join');
      } else pushFeed(team, `<b class="${team}">${escapeHtml(user)}</b> cổ vũ ${TEAM_NAME[team]}`, 'join');
    } else {
      pushFeed(teamOf[user] || null, `<b>${escapeHtml(user)}</b> ${escapeHtml(text)}`, 'chat');
      const who = allyOf(teamOf[user] || (Math.random() < .5 ? 'xanh' : 'do'));
      if (who) bubbleOn(who, `${user}: ${text.slice(0, 22)}`, '#f3e9ff');
    }
  }

  // ---------- Cảnh giáng thế cho thần tướng (từ 1000 xu) ----------
  function introSequence(u, user, gift, made) {
    const def = cfg.units[u.key], god = u.tier >= 6, legendary = u.tier >= 5;
    const life = god ? 170 : legendary ? 130 : 100;
    const title = god ? '✦ THẦN THOẠI GIÁNG THẾ ✦' : legendary ? '✦ THẦN TƯỚNG GIÁNG THẾ ✦' : '✦ TƯỚNG LĨNH XUẤT CHIẾN ✦';
    state.intro = { t0: state.tick, life, team: u.team, key: u.key, user, gift: gift.name, coins: gift.coins, god, title, label: labelOf(u.key, u.team), quote: (def.quote && pick(def.quote)) || pick(u.tier >= 5 ? cfg.quotes.god : cfg.quotes.high) };
    for (const m of made) { m.introUntil = state.tick + life + 10; m.shieldT = life + 50; }
    summonSpirit(u.team, u.key, u.x, u.y, god || legendary ? 3 : 2);
    focusOn(u.x - dir[u.team] * 40, life, god ? 1.48 : legendary ? 1.4 : 1.32, u.y, 9);
    state.flash = { c: god ? '#fde047' : legendary ? '#fdba74' : col(u.team), t: state.tick };
    state.shake = god ? 18 : legendary ? 15 : 11;
  }

  // ---------- Luật trận ----------
  function foesOf(u, range, back = 0) {
    const out = [];
    const candidates = near(grid[enemyOf[u.team]], u.x, range + back);
    for (let i = 0; i < candidates.length; i++) {
      const e = candidates[i];
      const ahead = (e.x - u.x) * dir[u.team];
      if (ahead >= -back && ahead <= range) out.push(e);
    }
    return out;
  }
  function alliesOf(u, range) {
    const out = [];
    const candidates = near(grid[u.team], u.x, range);
    for (let i = 0; i < candidates.length; i++) {
      const a = candidates[i];
      if (Math.abs(a.x - u.x) <= range) out.push(a);
    }
    return out;
  }

  // Lưới không gian dùng chung cho mục tiêu, đánh lan, sóng và va chạm.
  const CELL = 40, NC = Math.ceil(WORLD / CELL) + 2;
  const mkGrid = () => Array.from({ length: NC }, () => []);
  const grid = { xanh: mkGrid(), do: mkGrid(), all: mkGrid() };
  const laneMax = { xanh: new Array(NL).fill(-1e9), do: new Array(NL).fill(-1e9) };   // x lớn nhất mỗi hàng của mỗi phe
  const laneMin = { xanh: new Array(NL).fill(1e9), do: new Array(NL).fill(1e9) };     // x nhỏ nhất mỗi hàng của mỗi phe
  const scratch = [];
  function buildGrid() {
    for (const k of ['xanh', 'do', 'all']) for (const c of grid[k]) c.length = 0;
    for (const t of ['xanh', 'do']) { laneMax[t].fill(-1e9); laneMin[t].fill(1e9); }
    for (const u of state.units) {
      const c = clamp(Math.floor(u.x / CELL), 0, NC - 1);
      grid[u.team][c].push(u); grid.all[c].push(u);
      if (u.x > laneMax[u.team][u.lane]) laneMax[u.team][u.lane] = u.x;
      if (u.x < laneMin[u.team][u.lane]) laneMin[u.team][u.lane] = u.x;
    }
  }
  function near(g, x, r) {
    scratch.length = 0;
    const a = Math.max(0, Math.floor((x - r) / CELL)), b = Math.min(NC - 1, Math.floor((x + r) / CELL));
    for (let c = a; c <= b; c++) { const cell = g[c]; for (let i = 0; i < cell.length; i++) scratch.push(cell[i]); }
    return scratch;
  }

  function findTarget(u, def) {
    let best = null, bestScore = Infinity;
    const rng = def.range * (u.tier >= 3 ? 1.1 : 1);
    const list = near(grid[enemyOf[u.team]], u.x, rng + 60);
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (Math.abs(e.lane - u.lane) > 1) continue;
      const ahead = (e.x - u.x) * dir[u.team];
      if (ahead < -6) continue;
      const gap = ahead - (def.projectile ? 0 : bodyR(u) + bodyR(e) * .6);
      if (gap > rng) continue;
      const score = ahead + (e.lane !== u.lane ? 40 : 0) - (e.def.taunt ? 1000 : 0);
      if (score < bestScore) { bestScore = score; best = e; }
    }
    return best;
  }
  const splashCandidates = [];
  const splashVictims = [];
  function splashUnits(target, def) {
    splashCandidates.length = 0;
    const list = near(grid[target.team], target.x, def.splash);
    const limit = def.splashMax == null ? Infinity : Math.max(0, def.splashMax - 1);
    if (!limit) return splashCandidates;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e === target || e.hp <= 0 || Math.abs(e.x - target.x) >= def.splash || Math.abs(e.lane - target.lane) > (def.splashLanes ?? 1)) continue;
      let score = Math.abs(e.x - target.x) + Math.abs(e.lane - target.lane) * 36;
      let at = splashCandidates.length;
      while (at > 0 && splashCandidates[at - 1].score > score) at--;
      splashCandidates.splice(at, 0, { unit: e, score });
      if (splashCandidates.length > limit) splashCandidates.pop();
    }
    return splashCandidates;
  }
  function blockerAhead(u) {
    let best = null, bd = Infinity;
    const list = near(grid.all, u.x, 60);
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      if (o === u) continue;
      if (o.team === u.team && o.lane !== u.lane) continue;
      // Chỉ đối thủ cùng làn hoặc sát làn mới cản đường; quân ở làn xa không tạo “bức tường vô hình”.
      if (o.team !== u.team && Math.abs(o.lane - u.lane) > 1) continue;
      const ahead = (o.x - u.x) * dir[u.team];
      if (ahead <= 0) continue;
      if (ahead < bodyR(u) + bodyR(o) + 2 && ahead < bd) { bd = ahead; best = o; }
    }
    return best;
  }
  // Hàng của mình hết địch: dồn sang hàng có trận đánh gần đó để bu lại
  function assistLane(u) {
    const d = dir[u.team], foe = enemyOf[u.team];
    // còn địch cùng hàng phía trước (ở bất kỳ khoảng cách nào) thì cứ đánh ở hàng mình
    if (d > 0 ? laneMax[foe][u.lane] > u.x - 10 : laneMin[foe][u.lane] < u.x + 10) return null;
    let best = null, bs = Infinity;
    const list = near(grid[foe], u.x, 300);
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.lane === u.lane) continue;
      const ahead = (e.x - u.x) * d;
      if (ahead < -70 || ahead > 300) continue;
      const s = Math.abs(ahead) + Math.abs(e.lane - u.lane) * 25;
      if (s < bs) { bs = s; best = e; }
    }
    return best ? best.lane : null;
  }
  function laneFree(u, lane) {
    const list = near(grid.all, u.x, 40);
    for (let i = 0; i < list.length; i++) { const o = list[i]; if (o !== u && o.lane === lane && Math.abs(o.x - u.x) < bodyR(u) + bodyR(o) + 4) return false; }
    return true;
  }
  function escapeLane(u) {
    const targetLane = assistLane(u);
    let best = null, bestScore = Infinity;
    for (let lane = 0; lane < NL; lane++) {
      if (lane === u.lane || !laneFree(u, lane)) continue;
      const crowd = state.units.reduce((n, o) => n + (o !== u && o.team === u.team && o.lane === lane && Math.abs(o.x - u.x) < 110 ? 1 : 0), 0);
      const targetCost = targetLane === null ? 0 : Math.abs(lane - targetLane) * 3;
      const score = crowd * 2 + Math.abs(lane - u.lane) * 1.25 + targetCost + Math.random() * .35;
      if (score < bestScore) { best = lane; bestScore = score; }
    }
    return best;
  }

  // Chạm đòn: mỗi tướng đặc biệt có kiểu hiệu ứng riêng
  function fxImpact(att, tgt, def) {
    const fx = def.fx;
    if (!fx) return;
    const tx = tgt.x, foot = tgt.y, mid = tgt.y - (tgt.y - tgt.topY) * .5, d = dir[att.team];
    switch (fx) {
      case 'slash': streak(tx - 14, mid - 12, tx + 14, mid + 12, '#fff', 9, 3); streak(tx + 14, mid - 12, tx - 14, mid + 12, '#fde68a', 9, 2.5); break;
      case 'claw': for (let i = -1; i <= 1; i++) streak(tx - 10 + i * 9, mid - 18, tx + 6 + i * 9, mid + 14, '#fb923c', 12, 3); state.shake = Math.max(state.shake, 5); break;
      case 'stomp':
        ring(tx, foot + 2, '#fde68a', 26, 70);
        for (let i = 0; i < 6; i++) pushFx({ kind: 'smoke', x: tx + rnd(-20, 20), y: foot, vx: rnd(-.6, .6), vy: rnd(-.8, -.3), color: '#b59a7b', life: 30 });
        state.shake = Math.max(state.shake, 6); break;
      case 'lightning':
        bolt(tx + rnd(-15, 15), 120, tx, mid, '#fef08a', 16); bolt(tx - 24, 150, tx - 14, foot, '#fde047', 12);
        ring(tx, foot + 2, '#fef08a', 22, 60, 4); state.flash = { c: '#fef9c3', t: state.tick - 8 }; state.shake = Math.max(state.shake, 8); break;
      case 'runes':
        ring(tx, foot + 2, '#f0abfc', 40, 38, 10); ring(tx, foot + 2, '#fde68a', 34, 52, 4, { delay: 6 });
        for (const g of ['☯', '✦', '符']) glyph(tx + rnd(-20, 20), foot - 6 - rnd(0, 14), g, 44, 15); break;
      case 'flutter': for (let i = 0; i < 4; i++) glyph(tx + rnd(-18, 18), mid + rnd(-7, 7), att.key === 'hacGiay' ? '✉' : '🦋', 46, 14); break;
      case 'web': for (let i = 0; i < 4; i++) streak(tx + rnd(-4, 4), mid - 20, tx + rnd(-30, 30), foot + 2, '#fde047', 22, 1.6); break;
      case 'thread': for (let i = 0; i < 6; i++) streak(att.x + (tx - att.x) * i / 6, att.y - 14 + (i % 2 ? 4 : -4), att.x + (tx - att.x) * (i + .8) / 6, att.y - 14 + (i % 2 ? -4 : 4), '#5eead4', 24, 2); break;
      case 'fire':
        for (let i = 0; i < 8; i++) pushFx({ kind: 'dot', x: tx, y: mid, vx: rnd(-1.5, 1.5) + d, vy: rnd(-3, -1), color: i % 2 ? '#fb923c' : '#fde047', life: 26 });
        ring(tx, foot + 2, '#fb923c', 26, 60); state.shake = Math.max(state.shake, 6); break;
      case 'blast':
        glyph(tx, mid - 8, '💥', 26, 22);
        for (let i = 0; i < 10; i++) pushFx({ kind: 'dot', x: tx, y: mid, vx: rnd(-2, 2), vy: rnd(-3, 0), color: i % 2 ? '#fb923c' : '#fef08a', life: 24 });
        ring(tx, foot + 2, '#fdba74', 26, 80); state.shake = Math.max(state.shake, 7); break;
      case 'bash': ring(tx, mid, '#e5e7eb', 16, 28, 4, { round: true }); break;
    }
  }
  function fxAmbient(u, def) {
    if (!def.amb || u.state !== 'walk' || state.tick % 14 !== (u.lane * 3) % 14 || state.particles.length > MAX_PARTICLES) return;
    const x = u.x - dir[u.team] * 6, y = u.topY + 6 + Math.random() * (u.y - u.topY) * .6;
    switch (def.amb) {
      case 'butterfly': glyph(x, y, '🦋', 50, 12); break;
      case 'paper': glyph(x, y, '✉', 50, 11); break;
      case 'ember': pushFx({ kind: 'dot', x, y, vx: -dir[u.team] * .4, vy: -.8, color: '#fb923c', life: 30 }); break;
      case 'dust': pushFx({ kind: 'smoke', x: u.x, y: u.y, vx: -dir[u.team] * .4, vy: -.2, color: '#b59a7b', life: 26 }); break;
      case 'spark': bolt(x, y - 8, x + rnd(-13, 13), y + 14, '#fde047', 7); break;
    }
  }

  // Kéo địch lại gần nhưng không bao giờ kéo xuyên qua quân mình đang đứng giữa
  function pullToward(att, e, amount) {
    const d = dir[att.team];
    let lim = att.x + d * (bodyR(att) + bodyR(e) + 2);
    const list = near(grid[att.team], e.x, amount + 80);
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a === att || a.lane !== e.lane || (e.x - a.x) * d <= 0) continue;
      const l = a.x + d * (bodyR(a) + bodyR(e) + 2);
      if ((l - lim) * d > 0) lim = l;
    }
    const nx = e.x - d * amount;
    e.x = (nx - lim) * d < 0 ? lim : nx;
  }

  // Gây sát thương. def.dmg là sát thương gốc; nhân thêm hệ số bậc của người đánh.
  function hit(att, target, def, mult = 1) {
    if (target.hp <= 0) return;
    const victims = splashVictims;
    victims.length = 0;
    victims.push(target);
    if (def.splash) {
      const nearby = splashUnits(target, def);
      for (let i = 0; i < nearby.length; i++) victims.push(nearby[i].unit);
    }
    for (const v of victims) {
      if (v.hp <= 0) continue;
      const vdef = cfg.units[v.key];
      const rallyPower = att.rallyT > 0 ? 1.15 : 1;
      const splashPower = v === target ? 1 : (def.splashRatio ?? .6);
      let dmg = Math.max(1, Math.round(splashPower * (def.dmg || 1) * (att.dmgMul || 1) * mult * rallyPower));
      // Shield nguồn gốc đơn vị và khiên kỹ năng cùng chia sẻ một lớp giảm sát thương.
      if (vdef.shield || v.shieldT > 0) dmg = Math.ceil(dmg / 2);
      if (v.rallyT > 0) dmg = Math.ceil(dmg * .9);
      if (v.introUntil > state.tick) dmg = 0;
      const dealt = Math.min(dmg, v.hp);
      v.hp -= dmg; v.hitT = state.tick;
      if (att.owner) { const s = statsOf(att.owner, att.team); if (s) s.dmg += dealt; }
      if (v.owner) { const s = statsOf(v.owner, v.team); if (s) s.tank += dealt; }
      const iy = v.y - (v.y - v.topY) * .55;
      // hào quang khi trúng đòn + tia lửa
      aura(v.x, iy, col(att.team), 16 + Math.min(34, dmg * .35));
      for (let i = 0; i < 4; i++) pushFx({ kind: 'spark', x: v.x - dir[v.team] * 6, y: iy, vx: -dir[v.team] * rnd(1, 3), vy: rnd(-1.7, .7), color: i % 2 ? '#fff7d6' : col(att.team), life: 12 });
      if ((vdef.hp || 0) < 200 && !(v.tier >= 3)) v.knock = Math.min(6, 2 + dmg * .12);
      popText(v.x + rnd(-5, 5), v.topY - 4, `-${dmg}`, vdef.shield ? '#fde68a' : '#fca5a5', dmg > 40 ? 16 : 13);
      if (v.hp <= 0) {
        if (att.owner) { const s = statsOf(att.owner, att.team); if (s) s.kills++; }
        if (att.hp > 0) bubbleOn(att, 'Hạ!', col(att.team));
      }
    }
    if (def.hook && target.hp > 0) {
      const gap = bodyR(att) + bodyR(target) + 2, ahead = (target.x - att.x) * dir[att.team];
      pullToward(att, target, Math.max(0, Math.min(22, ahead - gap)));
    }
    if ((def.dmg || 0) * (att.dmgMul || 1) >= 14) state.shake = Math.max(state.shake, (def.dmg || 0) * (att.dmgMul || 1) >= 30 ? 8 : 4);
    if (def.fx) fxImpact(att, target, def);
  }
  function healUnit(healer, target, amount) {
    const add = Math.min(amount, target.maxHp - target.hp);
    if (add <= 0) return 0;
    target.hp += add;
    if (healer.owner) { const s = statsOf(healer.owner, healer.team); if (s) s.heal += add; }
    return add;
  }

  function hitGate(u, def) {
    const foe = enemyOf[u.team];
    if (state.base[foe] <= 0) return;
    const floor = PHASES[state.phase].floor, gx = FACE[foe];
    state.gateHit[foe] = state.tick;
    if (state.base[foe] <= floor) {
      if (state.tick - state.floorMsgT[foe] > 90) { state.floorMsgT[foe] = state.tick; popText(gx, CASTLE_BASE - 90, '🛡 Thành kiên cố', '#bae6fd'); }
      return;
    }
    const dmg = Math.max(.05, def.dmg * u.dmgMul * GATE_DMG);
    state.base[foe] = Math.max(floor, state.base[foe] - dmg);
    popText(gx, CASTLE_BASE - 80, `-${dmg.toFixed(1)}%`, '#fde68a');
    for (let i = 0; i < 4; i++) pushFx({ kind: 'dot', x: gx, y: CASTLE_BASE - 20 - Math.random() * 60, vx: -dir[u.team] * (.5 + Math.random() * 1.8), vy: -Math.random() * 2, color: i % 2 ? '#a8a29e' : '#78716c', life: 26 });
  }

  // ---------- Chiêu cuối ----------
  // Sóng năng lượng quét dọc chiến trường, trúng ai thì người đó dính đòn (mỗi người một lần)
  function wave(u, opts) {
    state.waves.push(Object.assign({ team: u.team, src: u, x: u.x + dir[u.team] * 20, y: u.y, dir: dir[u.team], speed: 7, dist: 0, maxDist: 420, hit: new Set(), color: col(u.team), mult: 2, w: 60, lanes: NL, knock: 14, life: 0 }, opts));
  }
  const SKILLS = {
    // Cửu Vĩ: 9 đèn lồng tản ra như pháo dây, mỗi đèn nổ trên một kẻ địch
    barrage(u, def, mult) {
      const foes = foesOf(u, 380, 20).sort((a, b) => Math.abs(a.x - u.x) - Math.abs(b.x - u.x));
      const n = 9;
      for (let i = 0; i < n; i++) {
        const t = foes.length ? foes[i % foes.length] : null;
        if (!t) break;
        state.shots.push({ x: u.x + dir[u.team] * 20, y: u.topY + 10, target: t, from: u, def: { dmg: def.dmg * 1.5, splash: 46, fx: 'blast' }, kind: 'lantern', speed: 3.5 + i * .3, delay: i * 5, mult });
      }
      state.shake = 10;
    },
    // Phượng Hoàng: mưa lửa quét nhiều hàng, mỗi đốm nổ lan khi chạm đất.
    phoenixRain(u, def, mult) {
      const foes = foesOf(u, 620, 20).sort((a, b) => Math.abs(a.x - u.x) - Math.abs(b.x - u.x)).slice(0, 10);
      foes.forEach((t, i) => state.shots.push({ x: u.x + dir[u.team] * (24 + i % 3 * 9), y: 55 + (i % 4) * 12, target: t, from: u, def: { dmg: def.dmg * 1.65, splash: 58, splashMax: 3, splashRatio: .35, fx: 'blast' }, kind: 'lantern', speed: 4.2 + i % 3 * .35, delay: i * 4, mult }));
      for (let i = 0; i < 4; i++) ring(u.x, u.y + 2, '#fb923c', 38 + i * 5, 150 + i * 18, 8, { delay: i * 7 });
      glyph(u.x, u.topY - 12, 'THIÊN HỎA!', 64, 16); state.shake = 12;
    },
    // Hồ Tinh: hồ hỏa tách thành các đốm lửa ma, bám theo nhiều mục tiêu.
    foxfire(u, def, mult) {
      const foes = foesOf(u, 540, 20).sort((a, b) => Math.abs(a.x - u.x) - Math.abs(b.x - u.x)).slice(0, 7);
      foes.forEach((t, i) => state.shots.push({ x: u.x + dir[u.team] * 18, y: u.topY + 10 + (i % 3 - 1) * 12, target: t, from: u, def: { dmg: def.dmg * 1.8, splash: 34, splashMax: 2, splashRatio: .4, fx: 'blast' }, kind: 'foxfire', speed: 4.8, delay: i * 5, mult }));
      for (let i = 0; i < 9; i++) ring(u.x + Math.cos(i * Math.PI / 4.5) * 24, u.y - 16 + Math.sin(i * Math.PI / 4.5) * 12, '#fb923c', 46, 92, 5, { delay: i * 3 });
      glyph(u.x, u.topY - 10, 'CỬU ẢNH!', 60, 15); state.shake = 9;
    },
    // Thanh Long: gọi lôi đình từ trời đánh lần lượt các địch trên toàn chiến tuyến.
    dragonLightning(u, def, mult) {
      const foes = foesOf(u, 820, 25).sort((a, b) => Math.abs(a.x - u.x) - Math.abs(b.x - u.x)).slice(0, 14);
      foes.forEach((e, i) => {
        setTimeout(() => { if (e.hp > 0) { bolt(e.x + rnd(-12, 12), 40, e.x, e.y - 16, '#67e8f9', 18); hit(u, e, { dmg: def.dmg * 1.9, fx: 'lightning' }, mult); ring(e.x, e.y, '#67e8f9', 24, 64, 5); } }, i * 45);
      });
      for (let i = 0; i < 5; i++) ring(u.x, u.y + 2, '#67e8f9', 36 + i * 6, 210 + i * 26, 8, { delay: i * 6 });
      glyph(u.x, u.topY - 14, 'LÔI VŨ!', 70, 18); state.flash = { c: '#67e8f9', t: state.tick }; state.shake = 16;
    },
    // Ngư Tinh: triều đen dâng thành một đợt sóng lớn, quét rộng và hất lùi.
    abyssalWave(u, def, mult) {
      wave(u, { speed: 7, maxDist: 620, mult: 2.2 * mult, color: '#38bdf8', kind: 'surge', w: 150, knock: 28 });
      for (let i = 0; i < 5; i++) ring(u.x + dir[u.team] * (20 + i * 24), u.y + 3, '#38bdf8', 34 + i * 5, 170 + i * 18, 8, { delay: i * 5 });
      glyph(u.x, u.topY - 12, 'HẮC TRIỀU!', 64, 16); state.shake = 13;
    },
    // Hắc Giao: long tức đen ép thành luồng lũ, xuyên sâu và đánh bật đội hình.
    blackTide(u, def, mult) {
      wave(u, { speed: 10, maxDist: 880, mult: 2.05 * mult, color: '#c084fc', kind: 'blackTide', w: 118, knock: 34 });
      for (let i = 0; i < 4; i++) ring(u.x, u.y + 2, '#c084fc', 42 + i * 7, 240 + i * 24, 10, { delay: i * 7 });
      glyph(u.x, u.topY - 14, 'HẮC GIAO NỘ LONG!', 76, 16); state.flash = { c: '#7e22ce', t: state.tick }; state.shake = 18;
    },
    // Trống Sấm: nện trống, sóng sét chạy dọc mọi hàng
    shock(u, def, mult) {
      wave(u, { speed: 8, maxDist: 520, mult: 2.2 * mult, color: '#fde047', kind: 'shock', knock: 18 });
      for (let i = 0; i < 3; i++) setTimeout(() => ring(u.x + dir[u.team] * (40 + i * 60), u.y + 2, '#fde047', 26, 80, 8), i * 90);
      state.shake = 14;
    },
    // Kim Lân: tiếng gầm quét sạch cả chiến trường phía trước
    roar(u, def, mult) {
      wave(u, { speed: 9, maxDist: 760, mult: 3 * mult, color: '#fbbf24', kind: 'roar', w: 90, knock: 26 });
      state.flash = { c: '#fde047', t: state.tick }; state.shake = 18;
      ring(u.x, u.y + 2, '#fde047', 40, 160, 10); ring(u.x, u.y + 2, '#fff', 30, 110, 6, { delay: 6 });
    },
    // Thành Ốc: dựng tường đá, đồng đội quanh đó được giảm nửa sát thương, địch gần bị hất lui
    wall(u, def, mult) {
      for (const a of alliesOf(u, 170)) { a.shieldT = 360; aura(a.x, a.y - 20, '#fde68a', 26, 22); }
      const foes = foesOf(u, 120, 30).sort((a, b) => Math.abs(a.x - u.x) - Math.abs(b.x - u.x)).slice(0, 5);
      for (const e of foes) { hit(u, e, { dmg: def.dmg * 1.4 }, mult); e.knock = 16; }
      ring(u.x, u.y + 2, '#fde68a', 36, 170, 10); ring(u.x, u.y + 2, '#a8a29e', 30, 120, 6, { delay: 6 });
      state.shake = 12;
    },
    // Nhện rối: giăng lưới tơ, địch trong tầm bị trói và chịu thêm sát thương
    webnet(u, def, mult) {
      const foes = foesOf(u, 190, 30).sort((a, b) => Math.abs(a.x - u.x) - Math.abs(b.x - u.x)).slice(0, 8);
      for (const e of foes) {
        e.rootT = 180; hit(u, e, { dmg: def.dmg * 1.1, fx: 'web' }, mult);
        for (let i = 0; i < 5; i++) streak(u.x, u.topY + 10, e.x + rnd(-6, 6), e.y - rnd(0, 20), '#fde047', 26, 1.8);
      }
      ring(u.x + dir[u.team] * 90, u.y + 2, '#fde047', 36, 130, 10);
    },
    // Bà Vá: khâu chỉ kéo và trói nhiều địch về phía mình
    threads(u, def, mult) {
      const foes = foesOf(u, 230, 20).slice(0, 8);
      for (const e of foes) {
        e.rootT = 120; hit(u, e, { dmg: def.dmg * 1.2, hook: true, fx: 'thread' }, mult);
        pullToward(u, e, Math.min(70, Math.max(0, (e.x - u.x) * dir[u.team] - bodyR(u) - bodyR(e) - 6)));
      }
      ring(u.x, u.y + 2, '#5eead4', 34, 120, 8);
    },
    // Kình Ngư: tiếng chuông hồi sinh, hồi 40% máu cho cả đội quanh đó
    healwave(u, def) {
      for (const a of alliesOf(u, 210)) { const got = healUnit(u, a, a.maxHp * .4); if (got > 0) { popText(a.x, a.topY - 6, `+${Math.round(got)}`, '#86efac', 14); aura(a.x, a.y - 20, '#86efac', 26, 22); } }
      for (let i = 0; i < 3; i++) ring(u.x, u.y + 2, '#86efac', 34 + i * 6, 190, 8, { delay: i * 9 });
      state.shake = 5;
    },
    // Voi chiến: lao tới địch gần nhất, không vượt mục tiêu hoặc cổng thành.
    charge(u, def, mult) {
      const target = foesOf(u, 260, 0).sort((a, b) => Math.abs(a.x - u.x) - Math.abs(b.x - u.x))[0];
      if (!target) {
        const allies = alliesOf(u, 220).filter(a => a !== u && a.tier === 0 && Math.abs(a.lane - u.lane) <= 2);
        if (allies.length < 2) return;
        const label = u.key === 'bachTuong' ? 'BẠCH TƯỢNG' : 'VOI CHIẾN';
        u.skillLabelOverride = `${label} RỐNG HIỆU LỆNH`;
        ring(u.x, u.y + 2, '#fde047', 44, 165, 10);
        for (const a of allies) {
          a.rallyT = 300; // 5 giây: +15% sát thương/tốc đánh, -10% sát thương nhận vào
          a.cool = Math.min(a.cool, Math.ceil((a.def.cd || 45) * .85));
          aura(a.x, a.y - 14, '#fde047', 24, 30);
          ring(a.x, a.y + 2, '#fde047', 34, 64, 5);
        }
      bubbleOn(u, 'RỐNG · +15% CÔNG/TỐC · -10% NHẬN · 5 GIÂY', '#fde047', { big: true, life: 105 });
        return;
      }
      u.skillLabelOverride = u.key === 'bachTuong' ? 'BẠCH TƯỢNG XUNG TRẬN' : 'VOI CHIẾN XUNG TRẬN';
      const targetStop = Math.max(20, (target.x - u.x) * dir[u.team] + bodyR(target) * .35);
      const gateStop = Math.max(20, (FACE[enemyOf[u.team]] - u.x) * dir[u.team] - bodyR(u) - 42);
      const maxDist = Math.min(240, targetStop, gateStop);
      wave(u, { speed: 6, maxDist, mult: 1.8 * mult, color: '#fdba74', kind: 'charge', w: 40, knock: 22, follow: true });
    },
    // Thánh Gióng cưỡi ngựa sắt xung phong thẳng qua đội hình, quãng lao khóa theo địch gần nhất.
    cavalryCharge(u, def, mult) {
      const target = foesOf(u, 360, 0).sort((a, b) => Math.abs(a.x - u.x) - Math.abs(b.x - u.x))[0];
      if (!target) return;
      const targetStop = Math.max(18, (target.x - u.x) * dir[u.team] + bodyR(target) * .4);
      const gateStop = Math.max(18, (FACE[enemyOf[u.team]] - u.x) * dir[u.team] - bodyR(u) - 38);
      const maxDist = Math.min(320, targetStop, gateStop);
      wave(u, { speed: 9, maxDist, mult: 1.65 * mult, color: '#fb923c', kind: 'charge', w: 48, knock: 22, follow: true });
      ring(u.x, u.y + 2, '#fb923c', 34, 150, 9);
    },
    // Yêu Trư không bắn đạn: cú húc quét tối đa bốn địch sát bên và hất lùi cả nhóm.
    tuskCharge(u, def, mult) {
      const foes = foesOf(u, 145, 28).filter(e => Math.abs(e.lane - u.lane) <= 1)
        .sort((a, b) => Math.abs(a.x - u.x) - Math.abs(b.x - u.x)).slice(0, 4);
      for (const e of foes) {
        hit(u, e, { dmg: def.dmg * 1.35, fx: 'stomp' }, mult);
        e.knock = Math.max(e.knock || 0, 20);
        ring(e.x, e.y + 2, '#fb7185', 22, 58, 5);
      }
      ring(u.x + dir[u.team] * 36, u.y + 2, '#fb7185', 34, 125, 9);
      state.shake = 7;
    },
  };

  function castSkill(u, def, mult = 1, free = false) {
    const fn = SKILLS[def.skill];
    if (!fn) return;
    u.skillCool = def.skillCd || 480;
    u.atkT = state.tick; u.state = 'attack';
    fn(u, def, mult);
    const skillLabel = u.skillLabelOverride || def.skillName || def.skill.toUpperCase();
    const isRally = skillLabel.includes('RỐNG HIỆU LỆNH');
    if (u.tier >= 4 && !isRally) {
      const fx = { phuongHoang: 1, thanhLong: 2, hacGiao: 3, mocTinh: 4, kyLan: 7, hoTinh: 11 }[u.key] ?? 6;
      pushFx({ kind: 'skillImage', x: u.x + dir[u.team] * 55, y: u.y - 60, frame: fx, life: u.tier >= 6 ? 58 : 44, maxLife: u.tier >= 6 ? 58 : 44 });
      bubbleOn(u, skillLabel, col(u.team), { big: true, life: u.tier >= 6 ? 100 : 76 });
    }
    state.lastUlt = state.tick;
    if (!isRally) summonSpirit(u.team, u.key, u.x + dir[u.team] * 30, u.y, u.tier >= 6 ? 3 : u.tier >= 4 ? 2 : 1, 'ult');
    if (!free && (u.tier >= 4 || u.skillLabelOverride || state.tick - state.lastSkillBanner > 120)) {
      banner(`✦ ${skillLabel} · @${u.owner || 'thần tướng'} ✦`, u.team, u.tier >= 6 ? 150 : 115);
      state.lastSkillBanner = state.tick;
    }
    u.skillLabelOverride = null;
  }
  function skillReady(u, def) {
    if (!def.skill || u.skillCool > 0 || u.rootT > 0) return false;
    if (def.skill === 'healwave') return alliesOf(u, 210).filter(a => a.hp < a.maxHp * .7).length >= 3;
    if (def.skill === 'wall') return foesOf(u, 150, 30).length >= 2;
    if (def.skill === 'charge') {
      if (foesOf(u, 260, 0).length) return true;
      return alliesOf(u, 220).filter(a => a !== u && a.tier === 0 && Math.abs(a.lane - u.lane) <= 2).length >= 2;
    }
    if (def.skill === 'cavalryCharge') return foesOf(u, 360, 0).length > 0;
    if (def.skill === 'tuskCharge') return foesOf(u, 145, 28).some(e => Math.abs(e.lane - u.lane) <= 1);
    return foesOf(u, def.skill === 'roar' ? 700 : def.skill === 'charge' ? 260 : def.skill === 'shock' ? 420 : 300, 0).length >= (def.skill === 'webnet' || def.skill === 'threads' ? 2 : 1);
  }

  // Tháp canh trên thành bắn tên vào địch đến gần cổng
  function towersShoot() {
    for (const team of ['xanh', 'do']) {
      if (--state.towerCool[team] > 0 || state.base[team] <= 0) continue;
      let best = null, bd = TOWER.range;
      for (const e of state.units) {
        if (e.team === team) continue;
        const d = Math.abs(e.x - FACE[team]);
        if (d < bd) { bd = d; best = e; }
      }
      if (!best) { state.towerCool[team] = 10; continue; }
      state.towerCool[team] = TOWER.cd;
      const tx = team === 'xanh' ? CASTLE_W * .62 : WORLD - CASTLE_W * .62;
      state.shots.push({ x: tx, y: CASTLE_BASE - 130, target: best, from: { team, hp: 0, x: tx, topY: CASTLE_BASE - 146, dmgMul: 1 }, def: { dmg: TOWER.dmg }, kind: 'arrow', speed: 6, delay: 0 });
    }
  }

  function updatePhase() {
    const secs = (state.tick - state.matchStart) / 60;
    let p = PHASES.findIndex(ph => secs < ph.end);
    if (p < 0) p = PHASES.length - 1;
    if (p !== state.phase) {
      state.phase = p;
      toast(PHASES[p].name);
      pushFeed(null, `⏱ ${escapeHtml(PHASES[p].name)}${PHASES[p].floor > 0 ? ` · thành chỉ bị đánh xuống tới ${PHASES[p].floor}%` : ' · thành đã có thể bị phá!'}`, 'sys');
      state.shake = 6;
    }
    if (!state.gameOver && secs >= MATCH_MAX) {
      const w = state.base.xanh === state.base.do
        ? (state.units.filter(u => u.team === 'xanh').length >= state.units.filter(u => u.team === 'do').length ? 'xanh' : 'do')
        : (state.base.xanh > state.base.do ? 'xanh' : 'do');
      endMatch(w, 'Hết giờ · thành còn vững hơn');
    }
  }
  function endMatch(winner, reason) {
    if (state.gameOver) return;
    state.gameOver = winner; state.overAt = state.tick; state.overReason = reason;
    recordWin(winner, reason);
    focusOn(winner === 'xanh' ? WORLD - CASTLE_W / 2 : CASTLE_W / 2, 420, 1.15, null, 99);
    pushFeed(winner, `🏆 <b>${TEAM_NAME[winner]}</b> thắng trận! ${escapeHtml(reason)}`, 'sys');
    clearTimeout(state.resetT);
    state.resetT = setTimeout(() => reset(false), 9000);
  }

  // ---------- Vòng cập nhật (60 bước/giây) ----------
  function update() {
    state.tick++;
    defaultTick(); updatePhase();
    if (!state.gameOver) towersShoot();
    const units = state.units;
    buildGrid();
    for (const u of units) {
      const def = u.def;
      u.cool = Math.max(0, u.cool - 1);
      if (u.skillCool > 0) u.skillCool--;
      if (u.shieldT > 0) u.shieldT--;
      if (u.rallyT > 0) u.rallyT--;
      if (u.rootT > 0) u.rootT--;
      u.y += (LANES[u.lane] + u.yOff - u.y) * .12;
      u.sc = TIER_SIZE(u.tier) * depthScale(u.y);
      if (u.knock) { u.x -= dir[u.team] * u.knock; u.knock *= .5; if (u.knock < .3) u.knock = 0; }

      // đang giáng thế: đứng yên toả sáng, hết cảnh mới tung chiêu áp đảo
      if (u.introUntil > state.tick) { u.state = 'intro'; continue; }
      if (u.introUntil && u.introUntil <= state.tick) { u.introUntil = 0; if (def.skill) castSkill(u, def, 2, true); }

      const target = findTarget(u, def);
      const foe = enemyOf[u.team];
      const atGate = !target && (FACE[foe] - u.x) * dir[u.team] <= def.range + bodyR(u);
      // chiêu cuối: tự tung khi đủ điều kiện (kiểm tra thưa để đỡ tốn)
      if (!state.gameOver && def.skill && (state.tick + (u.seed | 0)) % 12 === 0 && skillReady(u, def)) castSkill(u, def, 1);

      if (u.rootT > 0) { u.state = target ? 'attack' : 'wait'; if (!target || u.cool > 0) { fxAmbient(u, def); continue; } }
      if (target || atGate) {
        u.state = 'attack'; u.waitT = 0;
        u.battleX = target ? (u.x + target.x) / 2 : FACE[foe] - dir[u.team] * 30;
        u.battleAt = state.tick;
        if (u.cool === 0 && !state.gameOver) {
          u.cool = Math.max(1, Math.ceil((def.cd || 45) * (u.rallyT > 0 ? .85 : 1))); u.atkT = state.tick; u.atkCount++;
          if (target && def.projectile) {
            const sp = spriteOf(u);
            const delay = sp && def.shotFrame ? Math.round(def.shotFrame * 60 / sp.fps) : 0;
            state.shots.push({ x: u.x + dir[u.team] * 16, y: u.topY + 16, target, from: u, def, kind: def.projectile, speed: SHOT_SPEED[def.projectile] || 4, delay });
          } else if (target) hit(u, target, def);
          else hitGate(u, def);
        }
      } else {
        if (u.laneCool > 0) u.laneCool--;
        else {
          const el = assistLane(u);
          if (el !== null) { const nl = u.lane + Math.sign(el - u.lane); if (laneFree(u, nl)) { u.lane = nl; u.laneCool = 20; } }
        }
        const block = blockerAhead(u);
        if (block) {
          u.state = 'wait';
          if (++u.waitT > 40 && u.waitT % 12 === 5) {
            const lane = escapeLane(u);
            if (lane !== null) { u.lane = lane; u.waitT = 0; u.laneCool = 12; }
          }
        } else {
          u.state = 'walk'; u.waitT = 0;
          const behind = (u.x - SPAWN_X[u.team]) * dir[u.team] < 0;
          u.x += (behind ? Math.max(1.6, def.speed * SPEED * 2) : def.speed * SPEED) * dir[u.team];
        }
      }
      if (def.heal) {
        const mates = near(grid[u.team], u.x, 80);
        for (let i = 0; i < mates.length; i++) { const a = mates[i]; if (a.hp < a.maxHp && Math.abs(a.x - u.x) < 80 && Math.abs(a.lane - u.lane) <= 1) healUnit(u, a, def.heal * (1 + .3 * u.tier) / 60); }
        if (state.tick % 40 === 0) { popText(u.x + rnd(-15, 15), u.topY, '+', '#86efac'); ring(u.x, u.y + 2, '#86efac', 34, 80); }
      }
      fxAmbient(u, def);
      if ((u.x - FACE[foe]) * dir[u.team] > -bodyR(u)) u.x = FACE[foe] - dir[u.team] * bodyR(u);
    }

    // dàn hàng: quân mình cùng đường không đứng chồng lên nhau
    for (const a of units) {
      const mates = near(grid[a.team], a.x, 30);
      for (let j = 0; j < mates.length; j++) {
        const b = mates[j];
        if (b === a || a.lane !== b.lane || a.seed >= b.seed && a.x !== b.x) continue;
        const gap = Math.abs(a.x - b.x), need = (bodyR(a) + bodyR(b)) * .8;
        if (gap < need) {
          const rear = (a.x - b.x) * dir[a.team] < 0 || (gap === 0 && a.seed < b.seed) ? a : b;
          rear.x -= dir[rear.team] * (need - gap) * .15;
        }
      }
    }

    // sóng chiêu cuối
    for (const w of state.waves) {
      w.life++;
      w.x += w.dir * w.speed; w.dist += w.speed;
      if (w.follow && w.src.hp > 0) { w.src.x = w.x - w.dir * 20; w.src.state = 'attack'; }
      // copy because hit() performs another near() lookup and reuses the scratch buffer.
      const waveUnits = near(grid[enemyOf[w.team]], w.x, w.w * .5).slice();
      for (let wi = 0; wi < waveUnits.length; wi++) {
        const e = waveUnits[wi];
        if (w.hit.has(e) || Math.abs(e.x - w.x) > w.w * .5) continue;
        w.hit.add(e);
        hit(w.src, e, { dmg: cfg.units[w.src.key].dmg, fx: null }, w.mult);
        e.knock = Math.max(e.knock || 0, w.knock); if (w.kind === 'shock' || w.kind === 'roar') bolt(e.x + rnd(-6, 6), 90, e.x, e.y - 20, w.color, 14);
      }
      if (w.kind === 'shock' && w.life % 4 === 0) ring(w.x, w.y + 2, w.color, 18, 40, 4);
    }
    compactAlive(state.waves, w => w.dist < w.maxDist);

    // đạn bay tới đúng mục tiêu rồi mới gây sát thương
    for (const s of state.shots) {
      if (s.delay > 0) { s.delay--; if (s.from.hp > 0 && s.kind !== 'lantern') { s.x = s.from.x + dir[s.from.team] * 16; s.y = s.from.topY + 16; } continue; }
      if (s.target.hp <= 0) { s.done = true; continue; }
      const tx = s.target.x, ty = s.target.y - (s.target.y - s.target.topY) * .5;
      const dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy);
      if (d < s.speed + 2) { hit(s.from, s.target, s.def, s.mult || 1); s.done = true; }
      else { s.x += dx / d * s.speed; s.y += dy / d * s.speed; s.ang = Math.atan2(dy, dx); if ((s.kind === 'lantern' || s.kind === 'foxfire') && state.tick % 2 === 0) pushFx({ kind: 'dot', x: s.x, y: s.y, vx: 0, vy: -.3, color: s.kind === 'foxfire' ? '#c084fc' : '#fb923c', life: 14 }); }
    }
    compactAlive(state.shots, s => !s.done);

    // khói, lửa ở thành sắp vỡ
    for (const team of ['xanh', 'do']) {
      const hp = state.base[team];
      if (hp < 66 && state.tick % (hp < 33 ? 5 : 12) === 0 && state.particles.length < MAX_PARTICLES) {
        const cx = team === 'xanh' ? CASTLE_W * .45 : WORLD - CASTLE_W * .45;
        pushFx({ kind: 'smoke', x: cx + rnd(-45, 45), y: CASTLE_BASE - 60 - Math.random() * 80, vx: rnd(-.15, .15), vy: rnd(-.9, -.5), color: hp < 33 ? '#f97316' : '#57534e', life: 55 });
      }
    }

    // chết: ngã xuống, mờ dần
    for (const u of units) {
      if (u.hp > 0) continue;
      state.dead.push({ u, life: 36 });
      for (let i = 0; i < 4; i++) pushFx({ kind: 'smoke', x: u.x + rnd(-10, 10), y: u.y - 2, vx: rnd(-.4, .4), vy: rnd(-.7, -.3), color: '#a8927a', life: 30 });
    }
    compactAlive(state.dead, d => --d.life > 0);
    if (state.dead.length > 30) state.dead.splice(0, state.dead.length - 30);
    compactAlive(units, u => u.hp > 0);
    state.units = units;
    for (const b of state.bubbles) b.life--;
    compactAlive(state.bubbles, b => b.life > 0 && b.unit.hp > 0);
    state.shake = Math.max(0, state.shake - .5);
    for (const p of state.particles) {
      if (p.kind === 'dot' || p.kind === 'spark') { p.x += p.vx; p.y += p.vy; p.vy += .08; }
      else if (p.kind === 'smoke') { p.x += p.vx; p.y += p.vy; }
      else if (p.kind === 'ring') { if (p.delay > 0) { p.delay--; continue; } }
      else if (p.kind === 'bolt' || p.kind === 'streak' || p.kind === 'aura') { /* đứng yên */ }
      else p.y -= .5;
      p.life--;
    }
    compactAlive(state.particles, p => p.life > 0);
    if (state.intro && state.tick - state.intro.t0 > state.intro.life) state.intro = null;
    if (!state.gameOver && (state.base.xanh <= 0 || state.base.do <= 0)) endMatch(state.base.xanh <= 0 ? 'do' : 'xanh', 'Thành địch đã bị phá');
    updateCamera();
  }

  // Camera: theo chỗ đang giao tranh, hoặc lướt/zoom vào nhân vật vừa gọi
  function updateCamera() {
    const c = state.cam;
    let tx, tz = 1, ty = H * .66;
    if (state.focus && state.tick < state.focus.until) {
      tx = state.focus.x; tz = state.focus.zoom || 1;
      if (state.focus.y != null && tz > 1.05) ty = state.focus.y - 34;
    } else {
      state.focus = null;
      let blueMaxX = -Infinity, redMinX = Infinity;
      const clusters = [];
      for (const u of state.units) {
        if (u.team === 'xanh') blueMaxX = Math.max(blueMaxX, u.x);
        else redMinX = Math.min(redMinX, u.x);
        if (u.state !== 'attack' || state.tick - u.battleAt > 12 || !Number.isFinite(u.battleX)) continue;
        let c = null;
        for (let i = clusters.length - 1; i >= 0; i--) if (Math.abs(clusters[i].x / clusters[i].n - u.battleX) < 210) { c = clusters[i]; break; }
        if (!c) { c = { x: 0, n: 0, score: 0, newest: 0 }; clusters.push(c); }
        const weight = 1 + Math.min(6, u.tier || 0) * .18;
        c.x += u.battleX * weight; c.n += weight; c.score += weight;
        c.newest = Math.max(c.newest, u.battleAt);
      }
      let bestCluster = null;
      for (const c of clusters) if (!bestCluster || c.score > bestCluster.score || (c.score === bestCluster.score && c.newest > bestCluster.newest)) bestCluster = c;
      if (bestCluster) {
        // Chia giao tranh thành cụm gần nhau; ưu tiên cụm đông và có tướng mạnh.
        tx = bestCluster.x / bestCluster.n;
      }
      else if (blueMaxX > -Infinity && redMinX < Infinity) tx = (blueMaxX + redMinX) / 2;
      else if (blueMaxX > -Infinity) tx = blueMaxX;
      else if (redMinX < Infinity) tx = redMinX;
      else tx = WORLD / 2;
    }
    const half = W / 2 / tz;
    const goal = clamp(tx - half, 0, WORLD - W / tz);
    c.x += (goal - c.x) * .05;
    c.z += (tz - c.z) * .07;
    c.y += (ty - c.y) * .07;
  }

  function reset(full = true) {
    clearTimeout(state.resetT);
    Object.assign(state, {
      units: [], particles: [], bubbles: [], shots: [], dead: [], waves: [], spirits: [], banners: [], intro: null,
      base: { xanh: 100, do: 100 }, gateHit: { xanh: -999, do: -999 }, hearts: { xanh: 0, do: 0 }, heartTurn: { xanh: 0, do: 0 }, giftsSent: { xanh: 0, do: 0 }, joinTurn: { xanh: 0, do: 0 },
      gameOver: null, combo: { team: null, count: 0, until: 0 }, focus: null, matchStart: state.tick, phase: 0, lastDefault: state.tick,
      lastGiftTick: { xanh: -99999, do: -99999 }, towerCool: { xanh: 60, do: 60 }, matchNo: state.matchNo + 1,
    });
    if (full) { state.stats = {}; state.feed = []; state.summonCount = {}; }
    state.feedDirty = true;
    toast(full ? 'Đã đặt lại trận' : 'Trận mới bắt đầu!');
  }

  // ---------- Vẽ ----------
  function hpBar(x, y, w, u) {
    ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(x - 1, y - 1, w + 2, 4.5);
    ctx.fillStyle = col(u.team); ctx.fillRect(x, y, w * Math.max(0, u.hp / u.maxHp), 2.5);
  }

  function drawUnit(u, t, dying = 0) {
    const def = cfg.units[u.key], sp = spriteOf(u), teamC = col(u.team);
    const moving = u.state === 'walk' && !dying;
    const big = (def.tier || 0) >= 3, sc = u.sc;
    const age = state.tick - u.bornT;
    const ph = t / 1000 * (sp ? sp.fps : 8) * Math.PI + u.seed;
    const bob = moving ? -Math.abs(Math.sin(ph)) * (big ? 1.6 : 2.6) * sc : 0;
    const rw = (sp ? Math.min(30, sp.drawW * .28) : def.size * .7) * sc;

    // vòng màu phe dưới chân: xanh/đỏ rõ ràng; tướng có vòng thở và hào quang lớn hơn theo bậc
    if (!dying) {
      const pulse = .5 + .5 * Math.sin(t / 380 + u.seed);
      const R = rw * (1.15 + (big ? .25 * pulse : 0));
      ctx.fillStyle = hexA(teamC, .28 + .1 * (def.tier || 0) / 6); ctx.strokeStyle = hexA(teamC, .95); ctx.lineWidth = big ? 2.6 : 1.8;
      ctx.beginPath(); ctx.ellipse(u.x, u.y, R, R * .32, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (u.tier >= 4) { ctx.strokeStyle = hexA(teamC, .35 + .3 * pulse); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(u.x, u.y, R * 1.45, R * .45, 0, 0, Math.PI * 2); ctx.stroke(); }
      if (u.shieldT > 0) { ctx.strokeStyle = 'rgba(253,230,138,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(u.x, u.y - (u.y - u.topY) * .5, rw * .9, (u.y - u.topY) * .6, 0, 0, Math.PI * 2); ctx.stroke(); }
      if (u.rallyT > 0) { const glow = .65 + .25 * Math.sin(t / 90 + u.seed); ctx.strokeStyle = `rgba(253,224,71,${glow})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(u.x, u.y + 1, rw * 1.28, rw * .4, 0, 0, Math.PI * 2); ctx.stroke(); }
      if (u.rootT > 0) { ctx.fillStyle = 'rgba(253,224,71,.5)'; ctx.fillRect(u.x - rw * .7, u.y - 4, rw * 1.4, 4); }
    } else { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(u.x, u.y, rw, rw * .26, 0, 0, Math.PI * 2); ctx.fill(); }

    const flash = !dying && state.tick - u.hitT < 5;
    if (sp) {
      let idx, lunge = 0, tilt = 0, sx = 1, sy = 1;
      if (u.state === 'attack' && !dying) {
        const dur = sp.attack.length * 60 / sp.fps, p = (state.tick - u.atkT) / dur, k = Math.floor(p * sp.attack.length);
        idx = k < sp.attack.length ? sp.attack[k] : sp.attack[0];
        if (p < 1) {
          const ranged = def.projectile || def.range >= 80, amt = (ranged ? -2 : big ? 5 : 7) * sc;
          lunge = p < .3 ? -Math.sin(p / .3 * Math.PI / 2) * amt * .35 : Math.sin((p - .3) / .7 * Math.PI) * amt;
          tilt = p < .3 ? -.05 * (p / .3) : .07 * Math.sin((p - .3) / .7 * Math.PI);
          if (p > .45 && p < .65) { sx = 1.05; sy = .96; }
        } else sy = 1 + Math.sin(t / 300 + u.seed) * .015;
      } else if (moving) {
        idx = sp.walk[Math.floor(t / 1000 * sp.fps + u.seed) % sp.walk.length];
        tilt = .05 + Math.sin(ph) * .025;
        const step = Math.abs(Math.cos(ph)); sy = 1 - step * .025; sx = 1 + step * .015;
      } else {
        idx = sp.walk[0]; sy = 1 + Math.sin(t / 420 + u.seed) * .02; sx = 1 - Math.sin(t / 420 + u.seed) * .01;
      }
      const sinceHit = state.tick - u.hitT;
      if (!dying && sinceHit < 12) tilt -= .14 * (1 - sinceHit / 12);
      const appear = Math.min(1, age / 18);
      const frame = sp.frames[idx];
      const w = sp.drawW * sc, h = w * frame.height / frame.width;
      const bottom = u.y + bob + h * sp.foot;
      ctx.save();
      ctx.translate(u.x, bottom);
      if (u.team === 'do') ctx.scale(-1, 1);
      ctx.translate(lunge, -h * sp.foot);
      ctx.rotate(tilt);
      ctx.scale(sx * (.75 + .25 * appear), sy * (.75 + .25 * appear));
      ctx.translate(0, h * sp.foot);
      if (dying) { ctx.rotate(-(1 - dying) * 1.2); ctx.globalAlpha = dying; } else if (appear < 1) ctx.globalAlpha = appear;
      if (flash) ctx.filter = 'brightness(1.8)';
      ctx.drawImage(frame, -w / 2, -h, w, h);
      ctx.restore();
      u.topY = bottom - h + h * sp.head;
    } else {
      const s = def.size * sc, cy = u.y - s / 2 + bob;
      if (dying) ctx.globalAlpha = dying;
      ctx.fillStyle = flash ? '#fff' : teamC; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(u.x, cy, s / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
      u.topY = u.y - s;
    }
    if (dying) return;
    // dấu hiệu phe trên đầu: tam giác màu + thanh máu màu phe; tướng có thêm tên
    const bw = (big ? 40 : 22) * (.85 + u.sc * .15);
    hpBar(u.x - bw / 2, u.topY - 8, bw, u);
    ctx.fillStyle = teamC; ctx.beginPath(); ctx.moveTo(u.x - 3.5, u.topY - 16); ctx.lineTo(u.x + 3.5, u.topY - 16); ctx.lineTo(u.x, u.topY - 10); ctx.closePath(); ctx.fill();
    if (big && !state.intro) {
      ctx.font = 'bold 9px system-ui, sans-serif'; ctx.textAlign = 'center';
      const name = labelOf(u.key, u.team), nw = ctx.measureText(name).width + 8;
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(u.x - nw / 2, u.topY - 28, nw, 11);
      ctx.fillStyle = teamC; ctx.fillRect(u.x - nw / 2, u.topY - 28, 2, 11);
      ctx.fillStyle = '#fff'; ctx.fillText(name, u.x + 1, u.topY - 19.5); ctx.textAlign = 'left';
    }
  }

  const beamPool = {};
  function drawSpirits(t) {
    for (const s of state.spirits) {
      const age = state.tick - s.t0, p = age / s.life;
      if (p >= 1) continue;
      const sp = spriteFor(s.key, s.team);
      if (!sp) continue;
      const c = col(s.team);
      const fade = p < .12 ? p / .12 : p > .65 ? (1 - p) / .35 : 1;
      const ease = 1 - Math.pow(1 - Math.min(1, p / .25), 3);
      const baseH = sp.drawW * sp.ch / sp.cw;
      const target = s.power >= 3 ? 300 : s.power > 1 ? 230 : 150;
      const scale = Math.min(5.5, Math.max(s.power > 1 ? 3.2 : 2.2, target / baseH)) * (.55 + .45 * ease);
      const idx = sp.attack[Math.floor(age / (60 / sp.fps)) % sp.attack.length];
      const f = tintedFrame(s.key, s.team, idx);
      if (!f) continue;
      const w = sp.drawW * scale, h = w * f.height / f.width, baseY = s.y - age * .12;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade; ctx.drawImage(beamSprite(s.team), s.x - w * .32, baseY - h, w * .64, h + (s.y - baseY) + 8);
      ctx.globalAlpha = fade * .85; ctx.drawImage(glowSprite, s.x - w * .5, s.y - w * .12, w, w * .24);
      ctx.globalAlpha = fade * (s.power > 1 ? .62 : .45); ctx.shadowColor = c; ctx.shadowBlur = 24;
      ctx.translate(s.x, baseY + h * sp.foot); if (s.team === 'do') ctx.scale(-1, 1);
      ctx.drawImage(f, -w / 2, -h, w, h); ctx.restore();
      if (s.power > 1 && age < 40) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hexA(c, .55 * (1 - age / 40)); ctx.lineWidth = 2;
        for (let i = 0; i < 14; i++) {
          const a = i / 14 * Math.PI * 2 + s.t0, r0 = 10 + age * 2.2, r1 = r0 + 26 + age * 1.4;
          ctx.beginPath(); ctx.moveTo(s.x + Math.cos(a) * r0, s.y - 6 + Math.sin(a) * r0 * .35); ctx.lineTo(s.x + Math.cos(a) * r1, s.y - 6 + Math.sin(a) * r1 * .35); ctx.stroke();
        }
        ctx.restore();
      }
    }
    state.spirits = state.spirits.filter(s => state.tick - s.t0 < s.life);
  }

  // Sóng chiêu cuối: quầng sáng kéo đuôi dài, to dần theo bậc
  function drawWaves() {
    for (const w of state.waves) {
      const hgt = 74, y = w.y - 26;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const tail = Math.min(w.dist + 20, 190);
      const g = ctx.createLinearGradient(w.x - w.dir * tail, 0, w.x, 0);
      g.addColorStop(0, hexA(w.color, 0)); g.addColorStop(.7, hexA(w.color, .35)); g.addColorStop(1, hexA(w.color, .85));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(w.x - w.dir * tail, y); ctx.lineTo(w.x, y - hgt * .5); ctx.lineTo(w.x + w.dir * 16, y); ctx.lineTo(w.x, y + hgt * .5); ctx.closePath(); ctx.fill();
      ctx.drawImage(glowSprite, w.x - 56, y - 56, 112, 112);
      ctx.strokeStyle = hexA('#ffffff', .85); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(w.x, y, 18, hgt * .5, 0, -Math.PI / 2, Math.PI / 2, w.dir < 0); ctx.stroke();
      if (w.kind === 'roar' || w.kind === 'blackTide' || w.kind === 'surge') {
        ctx.font = `900 ${w.kind === 'blackTide' ? 20 : 16}px system-ui, sans-serif`; ctx.textAlign = 'center';
        ctx.fillStyle = hexA('#fff7d6', .95); ctx.fillText(w.kind === 'blackTide' ? 'NỘ LONG!' : w.kind === 'surge' ? 'THỦY TRIỀU!' : 'GẦM!', w.x, y - hgt * .5 - 6); ctx.textAlign = 'left';
      }
      ctx.restore();
    }
  }

  function drawCastle(team) {
    const sp = sprites['castle@' + team];
    const left = team === 'xanh' ? 0 : WORLD - CASTLE_W, hp = state.base[team], since = state.tick - state.gateHit[team];
    const shakeX = since < 8 ? rnd(-2, 2) : 0;
    ctx.fillStyle = 'rgba(20,10,20,.45)'; ctx.beginPath(); ctx.ellipse(left + CASTLE_W / 2, CASTLE_BASE - 2, CASTLE_W * .55, 10, 0, 0, Math.PI * 2); ctx.fill();
    if (!sp) return;
    const stage = state.gameOver === enemyOf[team] || hp <= 33 ? 2 : hp <= 66 ? 1 : 0;
    const img = sp.frames[stage], w = CASTLE_W, h = w * sp.ch / sp.cw;
    let y = CASTLE_BASE - h * (1 - CASTLE_FOOT);
    if (state.gameOver && state.gameOver !== team) {
      const k = Math.min(1, (state.tick - state.overAt) / 90); y += k * h * .12;
      if (state.tick % 3 === 0) pushFx({ kind: 'smoke', x: left + Math.random() * CASTLE_W, y: CASTLE_BASE - 20, vx: rnd(-.6, .6), vy: rnd(-1.2, -.6), color: '#a8a29e', life: 40 });
    }
    ctx.save();
    if (since < 4) ctx.filter = 'brightness(1.7)';
    ctx.translate(left + CASTLE_W / 2 + shakeX, y);
    if (team === 'do') ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, 0, w, h);
    ctx.restore();
    // bảng tên phe trên thành, ẩn trong cảnh giáng thế để nhường chỗ cho nhân vật
    if (!state.intro) {
      const label = TEAM_NAME[team], cx = left + CASTLE_W / 2;
      ctx.font = '900 12px system-ui, sans-serif'; ctx.textAlign = 'center';
      const lw = ctx.measureText(label).width + 22;
      ctx.fillStyle = hexA(col(team), .92); ctx.beginPath(); ctx.roundRect(cx - lw / 2, y - 16, lw, 18, 9); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(label, cx, y - 3);
      ctx.textAlign = 'left';
    }
  }

  function drawShots() {
    for (const s of state.shots) {
      if (s.delay > 0 && s.kind !== 'lantern') continue;
      if (s.delay > 0) continue;
      if (s.kind === 'arrow') {
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.ang || 0);
        ctx.strokeStyle = '#f5e6c8'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(5, 0); ctx.stroke();
        ctx.fillStyle = '#e5e7eb'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(4, -2.5); ctx.lineTo(4, 2.5); ctx.closePath(); ctx.fill(); ctx.restore();
      } else if (s.kind === 'stone') {
        ctx.fillStyle = '#9ca3af'; ctx.strokeStyle = '#4b5563'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(s.x, s.y, 2.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else if (s.kind === 'magic') {
        ctx.fillStyle = 'rgba(192,132,252,.35)'; ctx.beginPath(); ctx.arc(s.x, s.y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f5d0fe'; ctx.beginPath(); ctx.arc(s.x, s.y, 2.6, 0, Math.PI * 2); ctx.fill();
      } else if (s.kind === 'cannon') {
        ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, Math.PI * 2); ctx.fill();
        if (state.tick % 3 === 0) pushFx({ kind: 'smoke', x: s.x, y: s.y, vx: 0, vy: -.2, color: '#6b7280', life: 18 });
      } else if (s.kind === 'lantern') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite, s.x - 16, s.y - 16, 32, 32); ctx.restore();
        ctx.fillStyle = '#ef4444'; ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(s.x, s.y, 5, 6.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fbbf24'; ctx.fillRect(s.x - 2, s.y + 6, 4, 4);
      } else if (s.kind === 'foxfire') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(s.x, s.y); ctx.rotate(s.ang || 0);
        ctx.drawImage(glowSprite, -15, -15, 30, 30); ctx.fillStyle = '#c084fc'; ctx.beginPath(); ctx.ellipse(0, 0, 5, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fef3c7'; ctx.beginPath(); ctx.arc(1, -2, 2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      } else {
        ctx.drawImage(glowSprite, s.x - 14, s.y - 14, 28, 28);
        ctx.fillStyle = '#fff1d6'; ctx.beginPath(); ctx.arc(s.x, s.y, 3.2, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function drawLabels(sorted, viewLeft, viewRight) {
    if (state.intro) return;
    ctx.font = 'bold 10px system-ui, sans-serif'; ctx.textAlign = 'center';
    const tagged = [];
    for (let i = state.units.length - 1; i >= 0 && tagged.length < 8; i--) {
      const u = state.units[i];
      if (u.tag && u.x >= viewLeft && u.x <= viewRight && !state.bubbles.some(b => b.unit === u)) tagged.push(u);
    }
    for (const u of sorted) {
      if (!tagged.includes(u)) continue;
      if (!u.tagW) u.tagW = ctx.measureText('@' + u.owner).width + 8;
      ctx.fillStyle = 'rgba(0,0,0,.62)'; ctx.fillRect(u.x - u.tagW / 2, u.y + 5, u.tagW, 12);
      ctx.fillStyle = col(u.team); ctx.fillRect(u.x - u.tagW / 2, u.y + 5, 2, 12);
      ctx.fillStyle = '#fff'; ctx.fillText('@' + u.owner, u.x, u.y + 14);
    }
    for (const b of (state.intro ? [] : state.bubbles)) {
      const u = b.unit, top = Math.max(150, u.topY - (b.big ? 30 : 14));
      if (u.x < viewLeft || u.x > viewRight) continue;
      ctx.font = `bold ${b.big ? 13 : 11}px system-ui, sans-serif`;
      if (!b.tw) b.tw = ctx.measureText(b.text).width + (b.big ? 22 : 14);
      ctx.globalAlpha = Math.min(1, b.life / 25);
      // giữ khung thoại trong màn hình dù nhân vật đứng sát mép
      const cx = clamp(u.x, state.cam.x + b.tw / 2 + 4, state.cam.x + W / state.cam.z - b.tw / 2 - 4);
      ctx.fillStyle = 'rgba(10,8,16,.88)'; ctx.beginPath(); ctx.roundRect(cx - b.tw / 2, top - (b.big ? 13 : 11), b.tw, b.big ? 22 : 17, 9); ctx.fill();
      ctx.strokeStyle = b.color; ctx.lineWidth = b.big ? 1.8 : 1; ctx.stroke();
      ctx.fillStyle = '#f8f1ff'; ctx.fillText(b.text, cx, top + (b.big ? 3 : 0));
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';
  }

  function drawParticles() {
    for (const p of state.particles) {
      ctx.globalAlpha = Math.min(1, p.life / 20);
      if (p.kind === 'skillImage') { const sp = sprites.skillFx; if (sp) { const k = 1 - p.life / p.maxLife, size = 100 + 50 * k; ctx.globalAlpha = Math.min(1, p.life / 15); ctx.drawImage(sp.frames[p.frame], p.x - size / 2, p.y - size / 2, size, size); } }
      else if (p.kind === 'dot') { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2); ctx.fill(); }
      else if (p.kind === 'spark') { ctx.strokeStyle = p.color; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 2.5, p.y - p.vy * 2.5); ctx.stroke(); }
      else if (p.kind === 'smoke') { ctx.globalAlpha = Math.min(.5, p.life / 60); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 4 + (55 - p.life) * .2, 0, Math.PI * 2); ctx.fill(); }
      else if (p.kind === 'ring') {
        if (p.delay > 0) continue;
        const k = Math.max(0, 1 - p.life / (p.maxLife || 34)), R = p.r0 + k * (p.grow || 120);
        ctx.globalAlpha = Math.max(0, 1 - k) * .8; ctx.strokeStyle = p.color; ctx.lineWidth = 3 * (1 - k) + 1;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, R, p.round ? R : R * .28, 0, 0, Math.PI * 2); ctx.stroke();
      } else if (p.kind === 'aura') {
        const k = 1 - p.life / p.maxLife, r = p.size * (.5 + k);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - k) * .9;
        const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, r);
        g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.35, hexA(p.color, .65)); g.addColorStop(1, hexA(p.color, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      } else if (p.kind === 'bolt') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, p.life / (p.maxLife * .6)); ctx.strokeStyle = p.color; ctx.lineWidth = 2.6; ctx.shadowColor = p.color; ctx.shadowBlur = 10;
        ctx.beginPath(); p.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.restore();
      } else if (p.kind === 'streak') {
        ctx.globalAlpha = Math.min(1, p.life / (p.maxLife * .7)); ctx.strokeStyle = p.color; ctx.lineWidth = p.w; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x1, p.y1); ctx.lineTo(p.x2, p.y2); ctx.stroke(); ctx.lineCap = 'butt';
      } else { ctx.fillStyle = p.color; ctx.font = `bold ${p.size || 13}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(p.text, p.x, p.y); ctx.textAlign = 'left'; }
    }
    ctx.globalAlpha = 1;
  }

  // Bản đồ nhỏ + đồng hồ (mờ để không che hiệu ứng)
  function drawMinimap() {
    const x0 = 30, x1 = W - 30, y = 118, mw = x1 - x0, mx = x => x0 + x / WORLD * mw;
    ctx.globalAlpha = .6;
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.roundRect(x0 - 6, y - 6, mw + 12, 12, 6); ctx.fill();
    ctx.fillStyle = col('xanh'); ctx.fillRect(x0 - 4, y - 4, 7, 8); ctx.fillStyle = col('do'); ctx.fillRect(x1 - 3, y - 4, 7, 8);
    for (const u of state.units) { ctx.fillStyle = col(u.team); const b = u.tier >= 3; ctx.fillRect(mx(u.x) - (b ? 2 : 1), y - 3 + u.lane * 1.1, b ? 4 : 2, b ? 4 : 2); }
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1; ctx.strokeRect(mx(state.cam.x), y - 5, W / state.cam.z / WORLD * mw, 10);
    const secs = Math.max(0, (state.tick - state.matchStart) / 60);
    const text = `⏱ ${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(Math.floor(secs % 60)).padStart(2, '0')} · ${PHASES[state.phase].name}`;
    ctx.font = 'bold 10px system-ui, sans-serif'; ctx.textAlign = 'center';
    const tw = ctx.measureText(text).width + 16;
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.roundRect(W / 2 - tw / 2, y + 9, tw, 15, 7); ctx.fill();
    ctx.fillStyle = state.phase >= 3 ? '#fca5a5' : '#fde68a'; ctx.fillText(text, W / 2, y + 20); ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  // Cảnh xuất trận từ cấp 4: dải phim và lời gọi được nâng bậc theo giá quà
  function drawIntro() {
    const it = state.intro;
    if (!it) return;
    const age = state.tick - it.t0, p = age / it.life;
    const a = p < .1 ? p / .1 : p > .85 ? (1 - p) / .15 : 1, c = it.god ? '#fde047' : col(it.team);
    ctx.globalAlpha = .55 * a; ctx.fillStyle = '#050208'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = a;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 34 * a); ctx.fillRect(0, H - 34 * a, W, 34 * a);
    ctx.fillStyle = c; ctx.fillRect(0, 34 * a - 2, W, 2); ctx.fillRect(0, H - 34 * a, W, 2);
    ctx.textAlign = 'center';
    const slide = Math.min(1, age / 14);
    ctx.save(); ctx.translate(W / 2 + (1 - slide) * (it.team === 'xanh' ? -160 : 160), 168);
    ctx.font = `900 ${it.god ? 30 : it.coins >= 1000 ? 27 : 23}px system-ui, sans-serif`; ctx.shadowColor = c; ctx.shadowBlur = 18; ctx.fillStyle = '#fff';
    ctx.fillText(it.title || (it.god ? '✦ THẦN THOẠI GIÁNG THẾ ✦' : '✦ THẦN TƯỚNG GIÁNG THẾ ✦'), 0, 0);
    ctx.font = `900 ${it.god ? 36 : it.coins >= 1000 ? 31 : 27}px system-ui, sans-serif`; ctx.fillStyle = c; ctx.fillText(it.label.toUpperCase(), 0, 40);
    ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.shadowBlur = 6; ctx.shadowColor = '#000';
    ctx.fillText(`@${it.user} · phe ${TEAM_NAME[it.team]} · ${it.gift} · ${it.coins} xu`, 0, 64);
    ctx.restore();
    ctx.shadowBlur = 0;
    if (age > 40) { ctx.globalAlpha = a * Math.min(1, (age - 40) / 14); ctx.font = 'italic bold 15px system-ui, sans-serif'; ctx.fillStyle = '#fff7d6'; ctx.fillText(`“${it.quote}”`, W / 2, H - 46 * a); }
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }

  function drawFlashAndBanners() {
    if (state.intro) return;
    const dt = state.tick - state.flash.t;
    if (dt < 16) { ctx.globalAlpha = .5 * (1 - dt / 16); ctx.fillStyle = state.flash.c; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    state.banners = state.banners.filter(b => state.tick - b.t0 < b.life);
    state.banners.forEach((b, i) => {
      const age = state.tick - b.t0, p = age / b.life, slide = Math.min(1, age / 10), out = p > .8 ? (1 - p) / .2 : 1, y = 150 + i * 34;
      ctx.globalAlpha = out * .92;
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.2, hexA(col(b.team), .85)); g.addColorStop(.8, hexA(col(b.team), .85)); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, y, W, 26);
      ctx.font = '900 13px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
      ctx.fillText(b.text, W / 2 + (1 - slide) * (b.team === 'xanh' ? -120 : 120), y + 18);
      ctx.shadowBlur = 0; ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    });
  }

  function topOf(key) { return Object.values(state.stats).sort((a, b) => b[key] - a[key])[0]; }
  function drawGameOver() {
    if (!state.gameOver) return;
    const k = Math.min(1, (state.tick - state.overAt) / 30), c = col(state.gameOver);
    ctx.globalAlpha = .78 * k; ctx.fillStyle = '#05030a'; ctx.fillRect(0, 150, W, 188); ctx.globalAlpha = k;
    ctx.fillStyle = c; ctx.fillRect(0, 150, W, 3); ctx.fillRect(0, 335, W, 3);
    ctx.textAlign = 'center'; ctx.font = '900 30px system-ui, sans-serif'; ctx.fillStyle = c;
    ctx.fillText(`${TEAM_NAME[state.gameOver]} THẮNG!`, W / 2, 190);
    ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillStyle = '#f3e9ff';
    ctx.fillText(`${state.overReason} · trận mới sau vài giây`, W / 2, 210);
    const rows = [['🗡 Sát thương cao nhất', 'dmg'], ['💚 Hồi máu nhiều nhất', 'heal'], ['🛡 Chịu đòn nhiều nhất', 'tank'], ['⚔ Hạ nhiều nhất', 'kills']];
    rows.forEach(([name, key], i) => {
      const top = topOf(key); ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillStyle = '#cbd5e1'; ctx.textAlign = 'left'; ctx.fillText(name, 28, 238 + i * 24);
      ctx.textAlign = 'right'; ctx.fillStyle = top && top[key] > 0 ? col(top.team) : '#64748b';
      ctx.fillText(top && top[key] > 0 ? `@${top.user} · ${Math.round(top[key])}` : '—', W - 28, 238 + i * 24);
    });
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }

  function draw(t) {
    const c = state.cam;
    const viewLeft = c.x - 150, viewRight = c.x + W / c.z + 150;
    ctx.save();
    if (state.shake > 0) ctx.translate(rnd(-.5, .5) * state.shake, rnd(-.5, .5) * state.shake);
    ctx.clearRect(-10, -10, W + 20, H + 20);

    // phông cảnh xa (trôi chậm, phóng nhẹ theo zoom)
    ctx.save();
    ctx.translate(W / 2, H * .45); const sz = 1 + (c.z - 1) * .35; ctx.scale(sz, sz); ctx.translate(-W / 2, -H * .45);
    if (skyCanvas) {
      const sx = -(skyW - W) * clamp((c.x / (WORLD - W)), 0, 1) * (PARALLAX * 1.4) - (skyW - W) * .25;
      ctx.drawImage(skyCanvas, sx, 0, skyW, skyH);
    } else { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3b2a7a'); g.addColorStop(.6, '#e58bb0'); g.addColorStop(1, '#b8a24e'); ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40); }
    ctx.restore();

    // thế giới (mặt đất, thành, quân, hiệu ứng) trong khung camera có zoom
    ctx.save();
    ctx.translate(W / 2, H * .66); ctx.scale(c.z, c.z); ctx.translate(-(c.x + W / 2 / c.z), -c.y);
    if (groundCanvas) ctx.drawImage(groundCanvas, 0, GROUND_TOP, WORLD, groundH);
    drawCastle('xanh'); drawCastle('do');
    drawSpirits(t);
    for (const d of state.dead) if (d.u.x >= viewLeft && d.u.x <= viewRight) drawUnit(d.u, t, d.life / 36);
    const sorted = state.units.slice().sort((a, b) => a.y - b.y);
    for (const u of sorted) if (u.x >= viewLeft && u.x <= viewRight) drawUnit(u, t);
    drawWaves(); drawShots(); drawLabels(sorted, viewLeft, viewRight); if (quality.effects) drawParticles();
    ctx.restore();

    ctx.drawImage(vignetteCanvas, 0, 0, W, H);
    if (quality.minimap) drawMinimap(); drawIntro(); drawFlashAndBanners(); drawGameOver();
    ctx.restore();
  }

  // ---------- Vòng lặp ----------
  let last = performance.now(), acc = 0;
  perf.sampleAt = last;
  function loop(now) {
    const dt = Math.min(100, now - last); last = now;
    const frameStart = performance.now(); let updateMs = 0;
    if (!state.paused) { acc += dt * state.speed; let n = 0; while (acc >= 1000 / 60 && n++ < 8) { update(); acc -= 1000 / 60; } if (n >= 8) acc = 0; }
    const updateEnd = performance.now(); updateMs = updateEnd - frameStart;
    draw(now);
    const drawEnd = performance.now(), frameMs = drawEnd - frameStart;
    perf.frames++; perf.updateMs = updateMs; perf.drawMs = drawEnd - updateEnd; perf.frameMs = frameMs;
    perf.maxFrameMs = Math.max(perf.maxFrameMs, frameMs);
    if (frameMs > 1000 / 60) perf.slowFrames++;
    perf.sampleFrames++;
    if (now - perf.sampleAt >= 1000) {
      perf.fps = perf.sampleFrames * 1000 / Math.max(1, now - perf.sampleAt);
      perf.sampleAt = now; perf.sampleFrames = 0;
    }
    requestAnimationFrame(loop);
  }

  // ---------- Giao diện DOM: quà, bảng xếp hạng, nhật ký ----------
  const portraitCache = {};
  function portrait(key, team) {
    const sp = spriteFor(key, team);
    if (!sp) return '';
    const id = key + team;
    if (portraitCache[id]) return portraitCache[id];
    const f = sp.frames[sp.walk[0]];
    const c = document.createElement('canvas'); const h = 52; c.height = h; c.width = Math.round(h * f.width / f.height);
    c.getContext('2d').drawImage(f, 0, 0, c.width, c.height);
    return (portraitCache[id] = c.toDataURL());
  }
  let legendIdx = 0;
  function renderLegend() {
    const el = $('legend'); if (!el) return;
    const g = cfg.gifts[legendIdx++ % cfg.gifts.length], blueKey = giftUnitKey(g, 'xanh'), redKey = giftUnitKey(g, 'do'), def = cfg.units[blueKey];
    if (!def) return;
    const tier = def.tier ?? g.tier, r = RARITY[tier];
    const pv = (team, key) => { const p = portrait(key, team); return `<div class="pv ${team}">${p ? `<img src="${p}">` : '<span>?</span>'}<b>${escapeHtml(labelOf(key, team))}</b></div>`; };
    el.innerHTML = `<div class="lg-gift">${GIFT_ICONS[g.id] || '🎁'}<div><b>${escapeHtml(g.name)}</b><small>${g.coins} xu · ${g.random ? `quay may ${GACHA_COUNT} nhân vật` : `bậc ${tier} · <span style="color:${r.c}">${r.name}</span>`}</small></div></div>` +
      (g.random ? `<div class="lg-arrow">→</div><div class="lg-units"><div class="pv"><b>🎡 Vòng quay 4 giây</b></div></div><div class="lg-note">${GACHA_COUNT} nhân vật · vai trò và tỉ lệ hiện trên từng ô</div>` : `<div class="lg-arrow">→</div><div class="lg-units">${pv('xanh', blueKey)}${pv('do', redKey)}</div><div class="lg-note">Gọi cho phe người tặng đã chọn · ${def.skill ? '✦ có chiêu cuối' : ''}</div>`);
  }
  function renderBoards() {
    const all = Object.values(state.stats);
    const col3 = (key, icon, name, fmt) => {
      const top = all.filter(s => s[key] > 0).sort((a, b) => b[key] - a[key]).slice(0, 3);
      return `<div class="bd"><h4>${icon} ${name}</h4>${top.length ? top.map((s, i) => `<div class="r"><span class="n">${i + 1}</span><span class="u ${s.team}">${escapeHtml(s.user)}</span><span class="v">${fmt(s[key])}</span></div>`).join('') : '<div class="r empty">chưa có</div>'}</div>`;
    };
    const el = $('boards'); if (el) el.innerHTML = col3('dmg', '🗡', 'Sát thương', v => Math.round(v)) + col3('heal', '💚', 'Hồi máu', v => Math.round(v)) + col3('tank', '🛡', 'Chịu đòn', v => Math.round(v));
    renderWinAnalysis();
    const cnt = Object.entries(state.summonCount).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => `${escapeHtml(cfg.units[k].label)} ×${n}`).join(' · ');
    setText('counts', cnt ? `Được gọi nhiều: ${cnt}` : 'Chưa có ai gọi nhân vật');
  }
  function renderWinAnalysis() {
    const el = $('winAnalysis'); if (!el) return;
    const total = winHistory.total.xanh + winHistory.total.do;
    const recentN = winHistory.recent.length;
    const recent = { xanh: winHistory.recent.filter(x => x.winner === 'xanh').length, do: winHistory.recent.filter(x => x.winner === 'do').length };
    const rate = (wins, n) => n ? Math.round(wins / n * 100) : 0;
    const row = (team, label, wins, n, tint) => {
      const pct = rate(wins, n), loss = n - wins;
      return `<div class="wr-row ${team}"><span class="wr-name">${label}</span><span class="wr-rate">${n ? pct + '%' : '—'}</span><div class="wr-track"><i style="width:${pct}%;background:${tint}"></i></div><span class="wr-record">${n ? `${wins}T–${loss}B` : 'chưa có'}</span></div>`;
    };
    const diff = state.base.xanh - state.base.do;
    const current = state.gameOver
      ? `Kết quả trận vừa rồi: ${TEAM_NAME[state.gameOver]} thắng.`
      : Math.abs(diff) < 1 ? `Trận đang chạy · nhà hai phe cùng ${Math.round(state.base.xanh)}%.`
      : `Trận đang chạy · nhà ${diff > 0 ? 'Xanh' : 'Quái'} còn vững hơn (${Math.round(state.base.xanh)}%–${Math.round(state.base.do)}%).`;
    el.innerHTML = `<div class="wr-head"><b>📊 TỈ LỆ THẮNG THẬT</b><span>${total} trận hoàn tất</span></div>
      <div class="wr-cols"><section><small>Tổng đã ghi</small>${row('xanh','XANH',winHistory.total.xanh,total,'#38bdf8')}${row('do','QUÁI',winHistory.total.do,total,'#fb7185')}</section>
      <section><small>${recentN ? `20 trận gần nhất · ${recentN} mẫu` : 'Gần đây · chưa có dữ liệu'}</small>${row('xanh','XANH',recent.xanh,recentN,'#38bdf8')}${row('do','QUÁI',recent.do,recentN,'#fb7185')}</section></div>
      <div class="wr-current">${current}</div>${total ? '' : '<div class="wr-note">Tỉ lệ sẽ bắt đầu tính sau trận hoàn tất đầu tiên.</div>'}`;
  }
  function renderFeed() {
    if (!state.feedDirty) return;
    state.feedDirty = false;
    const el = $('feed'); if (!el) return;
    el.innerHTML = state.feed.slice(0, 7).map(f => `<div class="fi ${f.kind} ${f.team || ''}">${f.html}</div>`).join('');
  }
  setInterval(() => { renderBoards(); renderFeed(); }, 500);
  setInterval(renderLegend, 4000);

  const ICO = GIFT_ICONS;
  function renderGifts() {
    const el = $('gifts'); if (!el) return;
    el.innerHTML = '';
    for (const gift of cfg.gifts) {
      const blueKey = giftUnitKey(gift, 'xanh'), redKey = giftUnitKey(gift, 'do');
      const unit = cfg.units[blueKey]; if (!unit) continue;
      const b = document.createElement('button');
      b.className = `gift-btn t${gift.tier}${gift.random ? ' random' : ''}`;
      const blueLabel = labelOf(blueKey, 'xanh'), redLabel = labelOf(redKey, 'do');
      const factions = `<span class="faction-line xanh"><b>XANH</b><span>${escapeHtml(blueLabel)}</span></span><span class="faction-line do"><b>QUÁI</b><span>${escapeHtml(redLabel)}</span></span>`;
      b.innerHTML = `<span class="ico">${ICO[gift.id] || '🎁'}</span>${escapeHtml(gift.name)}<div class="coin">🪙 ${gift.coins}</div><div class="unit">${gift.random ? `<span class="faction-line xanh"><b>🎡</b><span>Quay ${GACHA_COUNT} nhân vật</span></span>` : factions}</div>`;
      b.title = gift.random ? `Tặng ${gift.name} để quay ${GACHA_COUNT} nhân vật trong 4 giây` : `Xanh: ${blueLabel} · Quái: ${redLabel} · ${gift.coins} xu`;
      b.onclick = () => giftFrom(randomViewer(), gift, { team: window.__demoTeam || undefined });
      el.appendChild(b);
    }
  }
  const viewers = ['minh_anh', 'bao_tran', 'linh.vu', 'khoa99', 'thu_ha', 'duc.nguyen', 'lan_pham', 'quang_hai', 'my_linh', 'tuan.kiet'];
  const randomViewer = () => pick(viewers);
  let demoViewer = null;
  const testViewer = () => demoViewer || (demoViewer = randomViewer());
  const on = (id, fn) => { const e = $(id); if (e) e.onclick = fn; };
  on('simCommentXanh', () => commentFrom(testViewer(), '1'));
  on('simCommentDo', () => commentFrom(testViewer(), '2'));
  on('simHearts', () => heartsFrom(testViewer(), 100));
  on('simDefault', () => { state.defaultOn = false; toast('Spawn mặc định luôn TẮT'); });
  on('btnReset', () => reset(true));
  on('simGacha', () => giftFrom(randomViewer(), pick(cfg.gifts.filter(g => g.coins >= 5)), { gachaChance: 1 }));

  // ---------- Điều khiển từ app ngoài (server.js chuyển lệnh qua SSE) ----------
  function command(c) {
    switch (c.type) {
      case 'reset': reset(c.full !== false); break;
      case 'pause': state.paused = c.value ?? !state.paused; toast(state.paused ? 'Tạm dừng' : 'Tiếp tục'); break;
      case 'speed': state.speed = clamp(Number(c.value) || 1, .25, 6); toast(`Tốc độ x${state.speed}`); break;
      case 'default': state.defaultOn = false; toast('Spawn mặc định luôn TẮT'); break;
      case 'gacha': cfg.gacha.enabled = c.value ?? !cfg.gacha.enabled; toast('Quay may: ' + (cfg.gacha.enabled ? 'BẬT' : 'TẮT')); break;
      case 'spawn': spawn(c.team || 'xanh', c.unit, c.count || 1, c.user || null); break;
      case 'gift': { const g = cfg.gifts.find(x => x.id === c.gift || x.tiktokName === c.gift); if (g) giftFrom(c.user || randomViewer(), g, { team: c.team, noGacha: c.noGacha }); break; }
      case 'hearts': heartsFrom(c.user || randomViewer(), c.count || 100, { team: c.team }); break;
      case 'comment': commentFrom(c.user || randomViewer(), c.text || '1'); break;
    }
  }
  window.__kc = {
    state, spawn, command, giftFrom, heartsFrom, reset, cfg,
    quality,
    profile: () => ({ ...perf, units: state.units.length, particles: state.particles.length, shots: state.shots.length }),
    update: () => update(), draw: t => draw(t),
    setQuality(options = {}) {
      if (Number.isFinite(options.renderScale)) quality.renderScale = clamp(options.renderScale, .6, 1);
      if (typeof options.effects === 'boolean') quality.effects = options.effects;
      if (typeof options.minimap === 'boolean') quality.minimap = options.minimap;
      if (quality.renderScale !== appliedRenderScale) {
        canvas.width = W * DPR * quality.renderScale; canvas.height = H * DPR * quality.renderScale;
        ctx.setTransform(DPR * quality.renderScale, 0, 0, DPR * quality.renderScale, 0, 0);
        appliedRenderScale = quality.renderScale;
      }
      return { ...quality };
    },
    step(n = 60) { for (let i = 0; i < n; i++) update(); draw(state.tick * 1000 / 60); return { tick: state.tick, units: state.units.length, base: state.base, cam: Math.round(state.cam.x) }; },
  };

  // ---------- Sự kiện TikTok LIVE thật + lệnh điều khiển ----------
  function findGift(name) {
    const n = (name || '').toLowerCase();
    return cfg.gifts.find(g => (g.tiktokName || g.name).toLowerCase() === n);
  }
  if (window.EventSource) {
    const es = new EventSource('/events');
    es.addEventListener('chat', e => { const d = JSON.parse(e.data); commentFrom(d.user, d.comment); });
    es.addEventListener('like', e => { const d = JSON.parse(e.data); heartsFrom(d.user, d.likeCount); });
    es.addEventListener('gift', e => {
      const d = JSON.parse(e.data), gift = findGift(d.giftName);
      if (gift) giftFrom(d.user, { ...gift, count: gift.count * d.repeatCount, name: `${gift.name} ×${d.repeatCount}` });
      else pushFeed(null, `<b>${escapeHtml(d.user)}</b> tặng ${escapeHtml(d.giftName)} (chưa gán nhân vật)`, 'gift');
    });
    es.addEventListener('control', e => { try { command(JSON.parse(e.data)); } catch (err) { /* bỏ qua lệnh hỏng */ } });
    es.addEventListener('status', e => {
      const d = JSON.parse(e.data);
      const text = { connected: `Đã kết nối LIVE @${d.user || ''}`, waiting: `Đang thử kết nối lại LIVE${d.retryMs ? ` sau ${Math.ceil(d.retryMs / 1000)} giây` : ''}...`, offline: `Chưa vào được LIVE: ${d.message || ''}`, disconnected: 'Mất kết nối LIVE, đang thử lại...', ended: 'LIVE đã kết thúc', 'no-username': 'Chưa có username TikTok. Chạy: node server.js <username>' }[d.state];
      if (text) pushFeed(null, escapeHtml(text), 'sys');
    });
    // báo cáo tình hình trận cho app điều khiển
    setInterval(() => {
      const top = k => Object.values(state.stats).sort((a, b) => b[k] - a[k]).slice(0, 5).map(s => ({ user: s.user, team: s.team, v: Math.round(s[k]) }));
      fetch('/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        tick: state.tick, secs: Math.round((state.tick - state.matchStart) / 60), phase: PHASES[state.phase].name, base: state.base, paused: state.paused, speed: state.speed,
        units: { xanh: state.units.filter(u => u.team === 'xanh').length, do: state.units.filter(u => u.team === 'do').length }, gameOver: state.gameOver, matchNo: state.matchNo,
        defaultOn: state.defaultOn, gacha: cfg.gacha.enabled, top: { dmg: top('dmg'), heal: top('heal'), tank: top('tank') },
      }) }).catch(() => {});
    }, 2000);
  }
  window.addEventListener('storage', e => {
    if (e.key === 'tkgame-config') location.reload();
    if (e.key === WIN_HISTORY_KEY) { winHistory = loadWinHistory(); renderWinAnalysis(); }
  });

  setInterval(() => { state.viewers += Math.floor(Math.random() * 7) - 2; setText('viewers', state.viewers.toLocaleString('en-US')); }, 2000);
  setInterval(() => {
    setWidth('baseXanh', state.base.xanh + '%'); setWidth('baseDo', state.base.do + '%');
    setText('baseXanhTxt', Math.round(state.base.xanh)); setText('baseDoTxt', Math.round(state.base.do));
    const th = cfg.hearts.threshold;
    for (const [team, id] of [['xanh', 'Xanh'], ['do', 'Do']]) {
      const next = cfg.hearts.units[team][state.heartTurn[team] % cfg.hearts.units[team].length];
      setText('heart' + id + 'Txt', `❤ ${Math.floor(state.hearts[team])}/${th} → ${labelOf(next, team)}`);
      setWidth('heart' + id, Math.min(100, state.hearts[team] / th * 100) + '%');
    }
  }, 150);

  buildStatic(); buildGround();
  loadEnv('sky', 'assets/phong-canh-viet.webp', buildSky);
  loadEnv('ground', 'assets/mat-dat-viet.webp', buildGround);
  renderGifts(); renderLegend(); renderBoards();
  pushFeed(null, 'Chào mừng đến phòng LIVE! Bình luận <b class="xanh">1</b> = phe <b class="xanh">DÂN VIỆT</b> · <b class="do">2</b> = phe <b class="do">YÊU TINH</b> · tim theo phe vừa chọn', 'sys');
  requestAnimationFrame(loop);
})();
