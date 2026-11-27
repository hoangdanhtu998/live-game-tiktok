const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');

const root = path.resolve(__dirname, '..');
const count = Number(process.argv[2]) || 240;
const rounds = Number(process.argv[3]) || 5;
const baseline = process.argv.includes('--baseline');
let rng = 0x5eed1234;
const fixedMath = Object.create(Math);
fixedMath.random = () => ((rng = (rng * 1664525 + 1013904223) >>> 0) / 0x100000000);
const ctx = new Proxy({
  measureText: () => ({ width: 10 }),
  createRadialGradient: () => ({ addColorStop() {} }),
  createLinearGradient: () => ({ addColorStop() {} }),
  getImageData: () => ({ data: new Uint8ClampedArray(4) }),
}, { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => (target[key] = value, true) });
const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    id, style: {}, classList: { add() {}, remove() {}, toggle() {} }, appendChild() {}, addEventListener() {},
    getContext: () => ctx, querySelectorAll: () => [], innerHTML: '', textContent: '', width: 0, height: 0,
  });
  return elements.get(id);
}
const stored = {};
const localStorage = { getItem: key => stored[key] || null, setItem: (key, value) => { stored[key] = value; } };
const window = { devicePixelRatio: 1, addEventListener() {}, DEFAULT_CONFIG: null, loadConfig() { return JSON.parse(JSON.stringify(window.DEFAULT_CONFIG)); } };
const document = { getElementById: element, createElement: () => element(`bench-${Math.random()}`) };
const sandbox = {
  window, document, localStorage, performance, console, Math, Set, Map, Date, JSON, location: { reload() {} },
  Image: function Image() { this.width = 128; this.height = 128; this.src = ''; },
  requestAnimationFrame() {}, setInterval() {}, setTimeout, clearTimeout,
  fetch: () => ({ catch() {} }), Math: fixedMath,
};
vm.runInNewContext(fs.readFileSync(path.join(root, 'config.js'), 'utf8'), sandbox);
let source = fs.readFileSync(path.join(root, 'game.js'), 'utf8');
if (baseline) {
  source = source
    .replace('const victims = splashVictims;\n    victims.length = 0;\n    victims.push(target);', 'const victims = [target];')
    .replace('const nearby = splashUnits(target, def);\n      for (let i = 0; i < nearby.length; i++) victims.push(nearby[i].unit);', 'const nearby = state.units.filter(e => e !== target && e.team === target.team && e.hp > 0 && Math.abs(e.x - target.x) < def.splash && Math.abs(e.lane - target.lane) <= (def.splashLanes ?? 1)).sort((a, b) => Math.abs(a.x - target.x) + Math.abs(a.lane - target.lane) * 36 - Math.abs(b.x - target.x) - Math.abs(b.lane - target.lane) * 36);\n      victims.push(...nearby.slice(0, Math.max(0, (def.splashMax ?? Infinity) - 1)));')
    .replace('compactAlive(state.waves, w => w.dist < w.maxDist);', 'state.waves = state.waves.filter(w => w.dist < w.maxDist);')
    .replace('compactAlive(state.shots, s => !s.done);', 'state.shots = state.shots.filter(s => !s.done);')
    .replace('compactAlive(state.dead, d => --d.life > 0);\n    if (state.dead.length > 30) state.dead.splice(0, state.dead.length - 30);\n    compactAlive(units, u => u.hp > 0);\n    state.units = units;\n    for (const b of state.bubbles) b.life--;\n    compactAlive(state.bubbles, b => b.life > 0 && b.unit.hp > 0);', 'state.dead = state.dead.filter(d => --d.life > 0).slice(-30);\n    state.units = units.filter(u => u.hp > 0);\n    const alive = new Set(state.units);\n    state.bubbles = state.bubbles.filter(b => --b.life > 0 && alive.has(b.unit));')
    .replace('compactAlive(state.particles, p => p.life > 0);', 'state.particles = state.particles.filter(p => p.life > 0);');
}
vm.runInNewContext(source, sandbox);

function summarize(samples) {
  samples.sort((a, b) => a - b);
  return { median: samples[Math.floor(samples.length * 0.5)], p95: samples[Math.floor(samples.length * 0.95)] };
}
function run() {
  rng = 0x5eed1234;
  const game = window.__kc;
  const teams = ['xanh', 'do'];
  const keys = Object.keys(game.cfg.units);
  for (let i = 0; i < count; i++) {
    const team = teams[i % 2], key = keys[i % keys.length], lane = Math.floor(i / 2) % 8;
    const unit = game.spawn(team, key, 1)[0];
    if (!unit) throw new Error(`Could not spawn unit ${i + 1}/${count}; check configured unit limit.`);
    unit.lane = lane;
    unit.y = 330 + lane * 22;
    unit.x = team === 'xanh' ? 820 - (lane % 2) * 20 - Math.floor(i / 16) : 820 + (lane % 2) * 20 + Math.floor(i / 16);
    unit.cool = i % 8 === 0 ? 0 : 1;
    unit.state = 'attack'; unit.battleX = (unit.x + (team === 'xanh' ? 500 : 1300)) / 2; unit.battleAt = 0;
  }
  game.state.tick = 300;
  game.state.base.xanh = 100; game.state.base.do = 100;
  for (let i = 0; i < 12; i++) game.update();
  const samples = [];
  for (let i = 0; i < 500; i++) {
    const start = performance.now(); game.update(); samples.push(performance.now() - start);
    if (game.state.gameOver) break;
  }
  return { unitsRequested: count, unitsAtEnd: game.state.units.length, particlesAtEnd: game.state.particles.length, shotsAtEnd: game.state.shots.length, wavesAtEnd: game.state.waves.length, ticksMeasured: samples.length, tickMs: summarize(samples) };
}

setTimeout(() => {
  const results = [];
  for (let i = 0; i < rounds; i++) results.push(run());
  console.log(JSON.stringify({ runtime: process.version, mode: baseline ? 'baseline-approximation' : 'optimized', unitsRequested: count, runs: rounds,
    medianTickMs: summarize(results.map(x => x.tickMs.median)).median,
    medianOfRunP95TickMs: summarize(results.map(x => x.tickMs.p95)).median,
    medianUnitsAtEnd: summarize(results.map(x => x.unitsAtEnd)).median,
    medianParticlesAtEnd: summarize(results.map(x => x.particlesAtEnd)).median,
  }, null, 2));
}, 100);
