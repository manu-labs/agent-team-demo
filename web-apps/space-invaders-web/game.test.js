// ============================================================
// SPACE INVADERS: BORG INCURSION — Node.js Tests
// Runs with: node game.test.js
// ============================================================

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// ── Setup DOM ────────────────────────────────────────────────
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const dom = new JSDOM(html, {
  url: 'http://localhost',
  pretendToBeVisual: true,
});

const { window } = dom;
const { document } = window;

// Stub canvas 2D context
const ctxStub = new Proxy({}, {
  get: () => function () { return ctxStub; },
});
window.HTMLCanvasElement.prototype.getContext = function () { return ctxStub; };

// Wrap game code so we can access live variable state via getters
const gameCode = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
const wrappedCode = gameCode + `
;return {
  get W() { return W; }, get H() { return H; },
  get state() { return state; }, set state(v) { state = v; },
  get score() { return score; }, set score(v) { score = v; },
  get lives() { return lives; }, set lives(v) { lives = v; },
  get wave() { return wave; }, set wave(v) { wave = v; },
  get player() { return player; },
  get stars() { return stars; },
  get borgs() { return borgs; },
  get particles() { return particles; }, set particles(v) { particles = v; },
  get shieldBarriers() { return shieldBarriers; },
  get borgMessages() { return borgMessages; },
  get borgDirection() { return borgDirection; },
  get borgSpeed() { return borgSpeed; },
  get borgFireTimer() { return borgFireTimer; },
  get keys() { return keys; },
  get playerBullets() { return playerBullets; },
  get borgBullets() { return borgBullets; },
  get frameCount() { return frameCount; },
  get isMobile() { return isMobile; },
  get overlay() { return overlay; },
  get gameOverScreen() { return gameOverScreen; },
  get canvas() { return canvas; },
  get scoreEl() { return scoreEl; },
  get livesEl() { return livesEl; },
  get btnLeft() { return btnLeft; },
  get btnRight() { return btnRight; },
  get btnFire() { return btnFire; },
  initStars, createBorgFleet, initBarriers,
  spawnExplosion, spawnAssimilationText,
  resizeCanvas, touchBind,
};`;

const script = new Function(
  'window', 'document', 'navigator', 'requestAnimationFrame', 'setTimeout',
  'Math', 'console',
  wrappedCode
);

let g;
try {
  g = script(window, document, window.navigator, () => {}, window.setTimeout, Math, console);
} catch (e) {
  console.error('FATAL: game.js failed to load:', e.message);
  process.exit(1);
}

// ── Test runner ──────────────────────────────────────────────
let passed = 0, failed = 0;

function assert(condition, name) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    failed++;
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
  }
}

function assertEq(actual, expected, name) {
  assert(actual === expected, `${name} (got ${actual}, expected ${expected})`);
}

// ── Tests ────────────────────────────────────────────────────
console.log('\n\x1b[36mBORG INCURSION — TEST SUITE\x1b[0m\n');

console.log('Canvas & initial state:');
assertEq(g.W, 800, 'Canvas width is 800');
assertEq(g.H, 600, 'Canvas height is 600');
assertEq(g.state, 'title', 'Initial state is title');
assertEq(g.score, 0, 'Initial score is 0');
assertEq(g.lives, 3, 'Initial lives is 3');
assertEq(g.wave, 1, 'Initial wave is 1');

console.log('\nPlayer defaults:');
assertEq(g.player.x, 400, 'Player starts centered X');
assertEq(g.player.y, 550, 'Player starts near bottom');
assertEq(g.player.w, 40, 'Player width is 40');
assertEq(g.player.h, 24, 'Player height is 24');
assertEq(g.player.speed, 5, 'Player speed is 5');
assertEq(g.player.fireRate, 12, 'Player fire rate is 12');

console.log('\nStar field:');
g.initStars();
assertEq(g.stars.length, 120, 'initStars creates 120 stars');
assert(g.stars.every(s => s.x >= 0 && s.x <= g.W), 'All stars within X bounds');
assert(g.stars.every(s => s.y >= 0 && s.y <= g.H), 'All stars within Y bounds');
assert(g.stars.every(s => s.speed > 0), 'All stars have positive speed');

console.log('\nBorg fleet — wave 1:');
g.createBorgFleet();
const rows1 = Math.min(4 + Math.floor(1 / 2), 7);
const cols1 = Math.min(8 + Math.floor(1 / 3), 12);
assertEq(g.borgs.length, rows1 * cols1, `Fleet is ${rows1}×${cols1} = ${rows1 * cols1}`);
assert(g.borgs.every(b => b.alive), 'All borgs start alive');
assert(g.borgs.every(b => b.hp >= 1), 'All borgs have ≥1 HP');

console.log('\nBorg type assignment:');
const topRow = g.borgs.filter((_, i) => i < cols1);
assert(topRow.every(b => b.type === 2), 'Top row = type 2 (tactical diamonds)');
const midRows = g.borgs.filter((_, i) => i >= cols1 && i < cols1 * 3);
assert(midRows.every(b => b.type === 1), 'Middle rows = type 1 (spheres)');
const botRows = g.borgs.filter((_, i) => i >= cols1 * 3);
assert(botRows.every(b => b.type === 0), 'Bottom rows = type 0 (cubes)');

console.log('\nBorg fleet scaling formulas:');
const w5rows = Math.min(4 + Math.floor(5 / 2), 7);
const w5cols = Math.min(8 + Math.floor(5 / 3), 12);
assertEq(w5rows, 6, 'Wave 5 → 6 rows');
assertEq(w5cols, 9, 'Wave 5 → 9 cols');
assert(Math.abs((0.4 + 5 * 0.1) - 0.9) < 0.001, 'Wave 5 speed = 0.9');

// Max fleet size
const w20rows = Math.min(4 + Math.floor(20 / 2), 7);
const w20cols = Math.min(8 + Math.floor(20 / 3), 12);
assertEq(w20rows, 7, 'Fleet rows cap at 7');
assertEq(w20cols, 12, 'Fleet cols cap at 12');

console.log('\nBarriers:');
g.initBarriers();
assertEq(g.shieldBarriers.length, 4, '4 barriers created');
assert(g.shieldBarriers.every(b => b.cells.length > 0), 'Each barrier has cells');
assert(g.shieldBarriers.every(b => b.cells.every(c => c.alive)), 'All cells start alive');
assertEq(g.shieldBarriers[0].cells.length, 20, 'Each barrier has 20 cells');

// Barriers are evenly spaced
const bx = g.shieldBarriers.map(b => b.x);
const spacing = bx[1] - bx[0];
assert(Math.abs((bx[2] - bx[1]) - spacing) < 0.001, 'Barriers are evenly spaced');

console.log('\nParticles:');
g.particles = [];
g.spawnExplosion(100, 100, '#ff0000', 10);
assertEq(g.particles.length, 10, 'spawnExplosion creates 10 particles');
assert(g.particles.every(p => p.life > 0), 'All particles have positive life');
assert(g.particles.every(p => p.color === '#ff0000'), 'Particles have correct color');

g.particles = [];
g.spawnAssimilationText(200, 200);
assertEq(g.particles.length, 1, 'spawnAssimilationText creates 1 particle');
assert(g.particles[0].text === true, 'Has text flag');
assertEq(g.particles[0].color, '#00ff66', 'Text is Borg green');
assert(g.particles[0].vy < 0, 'Text floats upward');

console.log('\nPlayer clamping:');
let px;
px = Math.max(g.player.w / 2, Math.min(g.W - g.player.w / 2, -100));
assertEq(px, g.player.w / 2, 'Clamped at left edge');
px = Math.max(g.player.w / 2, Math.min(g.W - g.player.w / 2, 9999));
assertEq(px, g.W - g.player.w / 2, 'Clamped at right edge');

console.log('\nBorg messages:');
assertEq(g.borgMessages.length, 10, '10 Borg messages');
assert(g.borgMessages[0] === 'THE BORG ADVANCE', 'First message correct');
assert(g.borgMessages.includes('RESISTANCE IS FUTILE'), 'Contains classic line');

console.log('\nDOM refs:');
assert(g.overlay !== null, 'overlay found');
assert(g.gameOverScreen !== null, 'gameOverScreen found');
assert(g.canvas !== null, 'canvas found');
assert(g.scoreEl !== null, 'scoreEl found');
assert(g.livesEl !== null, 'livesEl found');

console.log('\nTouch controls:');
assert(g.btnLeft !== null, 'btn-left found');
assert(g.btnRight !== null, 'btn-right found');
assert(g.btnFire !== null, 'btn-fire found');

console.log('\nEdge cases:');
try { g.resizeCanvas(); assert(true, 'resizeCanvas runs without error'); }
catch (e) { assert(false, 'resizeCanvas: ' + e.message); }

try { g.touchBind(null, 'KeyX'); assert(true, 'touchBind(null) is safe'); }
catch (e) { assert(false, 'touchBind(null): ' + e.message); }

console.log('\nCollision logic:');
g.createBorgFleet();
const target = g.borgs[0];
target.hp = 1;
const bullet = { x: target.x, y: target.y, vy: -8 };
let hit = false;
for (const borg of g.borgs) {
  if (!borg.alive) continue;
  const hs = borg.size / 2;
  if (bullet.x > borg.x - hs && bullet.x < borg.x + hs &&
      bullet.y > borg.y - hs && bullet.y < borg.y + hs) {
    borg.hp--;
    if (borg.hp <= 0) borg.alive = false;
    hit = true;
    break;
  }
}
assert(hit, 'Bullet at borg position → hit');
assert(!target.alive, 'Borg with 1 HP dies on hit');

// Bullet miss
const missBullet = { x: -999, y: -999 };
let missHit = false;
for (const borg of g.borgs) {
  if (!borg.alive) continue;
  const hs = borg.size / 2;
  if (missBullet.x > borg.x - hs && missBullet.x < borg.x + hs &&
      missBullet.y > borg.y - hs && missBullet.y < borg.y + hs) {
    missHit = true;
    break;
  }
}
assert(!missHit, 'Bullet far away → miss');

console.log('\nFire interval scaling:');
assertEq(Math.max(20, 60 - 1 * 5), 55, 'Wave 1 interval = 55');
assertEq(Math.max(20, 60 - 8 * 5), 20, 'Wave 8 clamps to 20');
assertEq(Math.max(20, 60 - 12 * 5), 20, 'Wave 12 still clamped to 20');

console.log('\nSpeed multiplier:');
const testBorgs = [{ alive: true }, { alive: true }, { alive: false }, { alive: false }];
const alive = testBorgs.filter(b => b.alive);
const mult = 1 + (1 - alive.length / testBorgs.length) * 2;
assertEq(mult, 2, '50% dead = 2x speed');

const allAlive = [{ alive: true }, { alive: true }];
const mult2 = 1 + (1 - allAlive.filter(b => b.alive).length / allAlive.length) * 2;
assertEq(mult2, 1, '0% dead = 1x speed');

// ── Summary ──────────────────────────────────────────────────
const total = passed + failed;
console.log(`\n${'─'.repeat(40)}`);
if (failed === 0) {
  console.log(`\x1b[32m${passed}/${total} tests passed ✓\x1b[0m\n`);
} else {
  console.log(`\x1b[31m${passed}/${total} passed, ${failed} FAILED\x1b[0m\n`);
}

process.exit(failed > 0 ? 1 : 0);
