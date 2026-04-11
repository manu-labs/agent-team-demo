// ============================================================
// FIREBOY & WATERGIRL: ELEMENTAL TEMPLE
// ============================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

// ── Screens ──────────────────────────────────────────────────
const titleScreen = document.getElementById('title-screen');
const levelComplete = document.getElementById('level-complete');
const gameOverScreen = document.getElementById('game-over');
const victoryScreen = document.getElementById('victory');
const completeStats = document.getElementById('complete-stats');
const deathReason = document.getElementById('death-reason');
const victoryStats = document.getElementById('victory-stats');
const levelDisplay = document.getElementById('level-display');
const levelNameEl = document.getElementById('level-name');
const fireGemsEl = document.getElementById('fire-gems');
const waterGemsEl = document.getElementById('water-gems');

// ── Constants ────────────────────────────────────────────────
const TILE = 32;
const COLS = W / TILE;   // 30
const ROWS = H / TILE;   // 20
const GRAVITY = 0.55;
const MAX_FALL = 10;
const PLAYER_SPEED = 3.5;
const JUMP_FORCE = -9.5;

// ── State ────────────────────────────────────────────────────
let gameState = 'title'; // title | playing | complete | dead | victory
let currentLevel = 0;
let fireGems = 0;
let waterGems = 0;
let totalFireGems = 0;
let totalWaterGems = 0;
let deathMsg = '';

const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
    e.preventDefault();
  }
  if (e.code === 'Enter' || e.code === 'Space') {
    if (gameState === 'title') { gameState = 'playing'; hideAll(); loadLevel(0); }
    else if (gameState === 'complete') { nextLevel(); }
    else if (gameState === 'dead') { hideAll(); loadLevel(currentLevel); gameState = 'playing'; }
    else if (gameState === 'victory') { currentLevel = 0; totalFireGems = 0; totalWaterGems = 0; hideAll(); titleScreen.classList.remove('hidden'); gameState = 'title'; }
  }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function hideAll() {
  titleScreen.classList.add('hidden');
  levelComplete.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  victoryScreen.classList.add('hidden');
}

// ── Player class ─────────────────────────────────────────────
class Player {
  constructor(type) {
    this.type = type; // 'fire' | 'water'
    this.w = 20;
    this.h = 28;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.atDoor = false;
  }

  spawn(tx, ty) {
    this.x = tx * TILE + (TILE - this.w) / 2;
    this.y = ty * TILE + (TILE - this.h);
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.atDoor = false;
  }

  update() {
    // Input
    if (this.type === 'fire') {
      if (keys['ArrowLeft']) this.vx = -PLAYER_SPEED;
      else if (keys['ArrowRight']) this.vx = PLAYER_SPEED;
      else this.vx = 0;
      if (keys['ArrowUp'] && this.onGround) this.vy = JUMP_FORCE;
    } else {
      if (keys['KeyA']) this.vx = -PLAYER_SPEED;
      else if (keys['KeyD']) this.vx = PLAYER_SPEED;
      else this.vx = 0;
      if (keys['KeyW'] && this.onGround) this.vy = JUMP_FORCE;
    }

    // Gravity
    this.vy += GRAVITY;
    if (this.vy > MAX_FALL) this.vy = MAX_FALL;

    // Move X
    this.x += this.vx;
    this.resolveCollisionX();

    // Move Y
    this.y += this.vy;
    this.onGround = false;
    this.resolveCollisionY();

    // Clamp to canvas
    if (this.x < 0) this.x = 0;
    if (this.x + this.w > W) this.x = W - this.w;
  }

  resolveCollisionX() {
    const left = Math.floor(this.x / TILE);
    const right = Math.floor((this.x + this.w - 1) / TILE);
    const top = Math.floor(this.y / TILE);
    const bottom = Math.floor((this.y + this.h - 1) / TILE);

    for (let ty = top; ty <= bottom; ty++) {
      for (let tx = left; tx <= right; tx++) {
        if (isSolid(tx, ty)) {
          if (this.vx > 0) this.x = tx * TILE - this.w;
          else if (this.vx < 0) this.x = (tx + 1) * TILE;
          this.vx = 0;
          return;
        }
      }
    }
  }

  resolveCollisionY() {
    const left = Math.floor(this.x / TILE);
    const right = Math.floor((this.x + this.w - 1) / TILE);
    const top = Math.floor(this.y / TILE);
    const bottom = Math.floor((this.y + this.h - 1) / TILE);

    for (let ty = top; ty <= bottom; ty++) {
      for (let tx = left; tx <= right; tx++) {
        if (isSolid(tx, ty)) {
          if (this.vy > 0) {
            this.y = ty * TILE - this.h;
            this.onGround = true;
          } else if (this.vy < 0) {
            this.y = (ty + 1) * TILE;
          }
          this.vy = 0;
          return;
        }
      }
    }
  }

  draw() {
    const cx = this.x + this.w / 2;
    const cy = this.y;

    if (this.type === 'fire') {
      // Body
      ctx.fillStyle = '#ff6b35';
      ctx.fillRect(this.x + 2, this.y + 8, this.w - 4, this.h - 8);
      // Head
      ctx.fillStyle = '#ff9a56';
      ctx.beginPath();
      ctx.arc(cx, cy + 8, 9, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx - 5, cy + 5, 4, 4);
      ctx.fillRect(cx + 1, cy + 5, 4, 4);
      ctx.fillStyle = '#222';
      ctx.fillRect(cx - 4, cy + 6, 2, 2);
      ctx.fillRect(cx + 2, cy + 6, 2, 2);
      // Flame hair
      const flicker = Math.sin(Date.now() * 0.01) * 2;
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy + 2);
      ctx.lineTo(cx - 2, cy - 6 + flicker);
      ctx.lineTo(cx + 2, cy);
      ctx.lineTo(cx + 4, cy - 8 - flicker);
      ctx.lineTo(cx + 7, cy + 2);
      ctx.closePath();
      ctx.fill();
    } else {
      // Body
      ctx.fillStyle = '#2ab7ca';
      ctx.fillRect(this.x + 2, this.y + 8, this.w - 4, this.h - 8);
      // Head
      ctx.fillStyle = '#4ecdc4';
      ctx.beginPath();
      ctx.arc(cx, cy + 8, 9, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx - 5, cy + 5, 4, 4);
      ctx.fillRect(cx + 1, cy + 5, 4, 4);
      ctx.fillStyle = '#222';
      ctx.fillRect(cx - 4, cy + 6, 2, 2);
      ctx.fillRect(cx + 2, cy + 6, 2, 2);
      // Water droplet hair
      const bob = Math.sin(Date.now() * 0.008) * 1.5;
      ctx.fillStyle = '#80e8ff';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 7 + bob);
      ctx.quadraticCurveTo(cx + 6, cy - 1, cx, cy + 2);
      ctx.quadraticCurveTo(cx - 6, cy - 1, cx, cy - 7 + bob);
      ctx.fill();
    }
  }

  // Get center for hazard checks
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  get bottom() { return this.y + this.h; }
}

// ── Level data ───────────────────────────────────────────────
// Tile legend:
// . = empty, # = stone wall, = = platform (thin),
// F = fire pool, W = water pool, P = poison pool,
// f = fireboy spawn, w = watergirl spawn,
// 1 = fire door, 2 = water door,
// r = red gem (fire), b = blue gem (water),
// ^ = spike, S = switch, M = moving platform anchor,
// L = lava fall (decorative)

const LEVELS = [
  {
    name: 'First Steps',
    map: [
      '##############################',
      '#............................#',
      '#............................#',
      '#............................#',
      '#.....r..........b...........#',
      '#...=====....=====...........#',
      '#............................#',
      '#............................#',
      '#..r.................b.......#',
      '#.====.....====.....====....#',
      '#............................#',
      '#............................#',
      '#.......r.........b..........#',
      '#....=====....=====..........#',
      '#............................#',
      '#...1....................2...#',
      '#...##.....PPPP.....##...##.#',
      '#f.###..FFF....WWW..###.w##.#',
      '#.####..FFF....WWW..####.##.#',
      '##############################',
    ],
  },
  {
    name: 'The Great Divide',
    map: [
      '##############################',
      '#..............#.............#',
      '#..............#.............#',
      '#.1............#...........2.#',
      '#.##...........#..........##.#',
      '#..............#.............#',
      '#......r.......#......b......#',
      '#....=====.....#...=====....#',
      '#..............#.............#',
      '#..............#.............#',
      '#..r...........#.........b..#',
      '#.====.........#......====..#',
      '#..............#.............#',
      '#..........==#.#.#==.........#',
      '#..............#.............#',
      '#.....r........#.......b....#',
      '#...=====......#...=====....#',
      '#f.........PPPP#PPPP......w.#',
      '#..##..FFF..PPP#PPP..WWW.##.#',
      '##############################',
    ],
  },
  {
    name: 'Vertical Challenge',
    map: [
      '##############################',
      '#............................#',
      '#.1..........r...b........2.#',
      '#.##......=======.........##.#',
      '#............................#',
      '#............................#',
      '#========..............======#',
      '#............................#',
      '#...........r....b...........#',
      '#..........=======...........#',
      '#............................#',
      '#............................#',
      '#======..............========#',
      '#............................#',
      '#.........r......b..........#',
      '#........=========..........#',
      '#............................#',
      '#f...........PPPP.........w.#',
      '#.####..FFFF.PPPP.WWWW.####.#',
      '##############################',
    ],
  },
  {
    name: 'Temple of Traps',
    map: [
      '##############################',
      '#............................#',
      '#.1........................2.#',
      '#.##......................##.#',
      '#............................#',
      '#........r........b.........#',
      '#.=====..====..====..=====..#',
      '#............................#',
      '#...FFFF...PPPP...WWWW......#',
      '#..######..####..######.....#',
      '#............................#',
      '#............................#',
      '#..r.....................b...#',
      '#.====...============..====.#',
      '#............................#',
      '#.....FFFF..PPPP..WWWW......#',
      '#....######.####.######.....#',
      '#f...........................w#',
      '#.#####..FFF..PPP..WWW.####.#',
      '##############################',
    ],
  },
  {
    name: 'The Final Trial',
    map: [
      '##############################',
      '#............................#',
      '#.1.........r..b..........2.#',
      '#.##......========.......##.#',
      '#............................#',
      '#............................#',
      '#..FFF..====..====..WWW.....#',
      '#..FFF................WWW...#',
      '#..###..r........b...###....#',
      '#.......====..====.........#',
      '#............................#',
      '#.====...PPPPPPPP....====...#',
      '#........PPPPPPPP...........#',
      '#...r.................b.....#',
      '#..====..============.====..#',
      '#............................#',
      '#....FFFF..PPPPPP..WWWW.....#',
      '#f..#####..PPPPPP..#####..w.#',
      '#..######..######..######...#',
      '##############################',
    ],
  },
];

// ── Level state ──────────────────────────────────────────────
let tileMap = [];
let gems = [];
let fireDoor = { x: 0, y: 0 };
let waterDoor = { x: 0, y: 0 };
let fireboy, watergirl;
let particles = [];

function loadLevel(idx) {
  currentLevel = idx;
  const level = LEVELS[idx];
  tileMap = [];
  gems = [];
  fireGems = 0;
  waterGems = 0;
  particles = [];

  levelDisplay.textContent = `LEVEL ${idx + 1}`;
  levelNameEl.textContent = level.name;
  updateHUD();

  fireboy = new Player('fire');
  watergirl = new Player('water');

  for (let row = 0; row < ROWS; row++) {
    tileMap[row] = [];
    const line = level.map[row] || '';
    for (let col = 0; col < COLS; col++) {
      const ch = line[col] || '.';
      let tile = '.';

      switch (ch) {
        case '#': tile = '#'; break;
        case '=': tile = '='; break;
        case 'F': tile = 'F'; break;
        case 'W': tile = 'W'; break;
        case 'P': tile = 'P'; break;
        case 'f': fireboy.spawn(col, row); tile = '.'; break;
        case 'w': watergirl.spawn(col, row); tile = '.'; break;
        case '1': fireDoor = { x: col, y: row }; tile = '1'; break;
        case '2': waterDoor = { x: col, y: row }; tile = '2'; break;
        case 'r': gems.push({ x: col * TILE + 8, y: row * TILE + 8, type: 'fire', collected: false }); tile = '.'; break;
        case 'b': gems.push({ x: col * TILE + 8, y: row * TILE + 8, type: 'water', collected: false }); tile = '.'; break;
        default: tile = '.';
      }
      tileMap[row][col] = tile;
    }
  }
}

function isSolid(tx, ty) {
  if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return true;
  const t = tileMap[ty][tx];
  return t === '#' || t === '=';
}

// ── Hazard checks ────────────────────────────────────────────
function checkHazards(player) {
  const tx = Math.floor(player.cx / TILE);
  const ty = Math.floor(player.bottom / TILE);
  // Also check the tile the player's feet are touching
  const tyFeet = Math.floor((player.bottom - 1) / TILE);

  for (const checkTy of [ty, tyFeet]) {
    if (checkTy < 0 || checkTy >= ROWS) continue;
    for (let dx = -1; dx <= 1; dx++) {
      const checkTx = Math.floor(player.cx / TILE) + dx;
      if (checkTx < 0 || checkTx >= COLS) continue;
      const tile = tileMap[checkTy][checkTx];

      // Check if player overlaps this tile
      const tileLeft = checkTx * TILE;
      const tileTop = checkTy * TILE;
      const overlap = player.x < tileLeft + TILE && player.x + player.w > tileLeft &&
                      player.y < tileTop + TILE && player.y + player.h > tileTop;
      if (!overlap) continue;

      if (tile === 'P') {
        return player.type === 'fire' ? 'Fireboy fell into poison!' : 'Watergirl fell into poison!';
      }
      if (tile === 'F' && player.type === 'water') {
        return 'Watergirl touched fire!';
      }
      if (tile === 'W' && player.type === 'fire') {
        return 'Fireboy touched water!';
      }
    }
  }
  return null;
}

// ── Gem collection ───────────────────────────────────────────
function collectGems(player) {
  for (const gem of gems) {
    if (gem.collected) continue;
    if (gem.type !== player.type) continue;
    const dx = (player.cx) - (gem.x + 8);
    const dy = (player.cy) - (gem.y + 8);
    if (Math.abs(dx) < 18 && Math.abs(dy) < 18) {
      gem.collected = true;
      if (gem.type === 'fire') fireGems++;
      else waterGems++;
      // Sparkle
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        particles.push({
          x: gem.x + 8, y: gem.y + 8,
          vx: Math.cos(angle) * 2.5,
          vy: Math.sin(angle) * 2.5,
          life: 25,
          color: gem.type === 'fire' ? '#ffcc00' : '#80e8ff',
          size: 3,
        });
      }
      updateHUD();
    }
  }
}

// ── Door check ───────────────────────────────────────────────
function checkDoor(player, door) {
  const dx = player.cx - (door.x * TILE + TILE / 2);
  const dy = player.cy - (door.y * TILE + TILE / 2);
  return Math.abs(dx) < 20 && Math.abs(dy) < 24;
}

// ── HUD ──────────────────────────────────────────────────────
function updateHUD() {
  fireGemsEl.innerHTML = `Gems: <b>${fireGems}</b>`;
  waterGemsEl.innerHTML = `Gems: <b>${waterGems}</b>`;
}

// ── Particles ────────────────────────────────────────────────
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// ── Drawing ──────────────────────────────────────────────────
function drawTiles() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const t = tileMap[row][col];
      const x = col * TILE;
      const y = row * TILE;

      if (t === '#') {
        // Stone wall with texture
        ctx.fillStyle = '#3a3a5c';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#2e2e4a';
        ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
        // Brick lines
        ctx.strokeStyle = '#4a4a6c';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE / 2 - 2);
        ctx.strokeRect(x + TILE / 2, y + TILE / 2, TILE / 2 - 2, TILE / 2 - 2);
        ctx.strokeRect(x + 2, y + TILE / 2, TILE / 2 - 2, TILE / 2 - 2);
      } else if (t === '=') {
        // Platform
        ctx.fillStyle = '#6a6a8c';
        ctx.fillRect(x, y, TILE, 8);
        ctx.fillStyle = '#8a8aac';
        ctx.fillRect(x, y, TILE, 3);
      } else if (t === 'F') {
        // Fire pool
        ctx.fillStyle = '#ff4400';
        ctx.fillRect(x, y + TILE * 0.4, TILE, TILE * 0.6);
        ctx.fillStyle = '#ff6622';
        ctx.fillRect(x, y + TILE * 0.5, TILE, TILE * 0.3);
        // Animated flames
        const t1 = Date.now() * 0.005;
        ctx.fillStyle = '#ffaa00';
        for (let i = 0; i < 3; i++) {
          const fx = x + 4 + i * 10;
          const fh = 8 + Math.sin(t1 + i * 2) * 5;
          ctx.fillRect(fx, y + TILE * 0.4 - fh / 2, 6, fh);
        }
      } else if (t === 'W') {
        // Water pool
        ctx.fillStyle = '#0066cc';
        ctx.fillRect(x, y + TILE * 0.4, TILE, TILE * 0.6);
        ctx.fillStyle = '#0088ee';
        ctx.fillRect(x, y + TILE * 0.5, TILE, TILE * 0.3);
        // Waves
        const t1 = Date.now() * 0.004;
        ctx.fillStyle = '#44aaff';
        for (let i = 0; i < 4; i++) {
          const wx = x + i * 8;
          const wy = y + TILE * 0.38 + Math.sin(t1 + i) * 2;
          ctx.fillRect(wx, wy, 6, 3);
        }
      } else if (t === 'P') {
        // Poison pool
        ctx.fillStyle = '#33aa33';
        ctx.fillRect(x, y + TILE * 0.4, TILE, TILE * 0.6);
        ctx.fillStyle = '#44cc44';
        ctx.fillRect(x, y + TILE * 0.5, TILE, TILE * 0.3);
        // Bubbles
        const t1 = Date.now() * 0.003;
        ctx.fillStyle = '#66ee66';
        const bx = x + 8 + Math.sin(t1 + col) * 6;
        const by = y + TILE * 0.35 + Math.sin(t1 * 1.5 + col) * 4;
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawDoor(door, type) {
  const x = door.x * TILE;
  const y = door.y * TILE;
  const color1 = type === 'fire' ? '#ff6b35' : '#2ab7ca';
  const color2 = type === 'fire' ? '#ff9a56' : '#4ecdc4';
  const glow = type === 'fire' ? 'rgba(255,107,53,0.3)' : 'rgba(42,183,202,0.3)';

  // Glow
  ctx.fillStyle = glow;
  ctx.fillRect(x - 2, y - 2, TILE + 4, TILE + 4);

  // Door frame
  ctx.fillStyle = color1;
  ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
  ctx.fillStyle = color2;
  ctx.fillRect(x + 5, y + 5, TILE - 10, TILE - 10);

  // Arrow/icon
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(type === 'fire' ? '🔥' : '💧', x + TILE / 2, y + TILE / 2 + 6);
}

function drawGems() {
  for (const gem of gems) {
    if (gem.collected) continue;
    const x = gem.x + 8;
    const y = gem.y + 8;
    const bob = Math.sin(Date.now() * 0.005 + gem.x) * 2;

    ctx.save();
    ctx.translate(x, y + bob);

    if (gem.type === 'fire') {
      // Red diamond
      ctx.fillStyle = '#ff4444';
      ctx.strokeStyle = '#ffaa44';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(7, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(-7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Shine
      ctx.fillStyle = 'rgba(255,255,200,0.5)';
      ctx.fillRect(-2, -4, 3, 3);
    } else {
      // Blue diamond
      ctx.fillStyle = '#4488ff';
      ctx.strokeStyle = '#88ccff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(7, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(-7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Shine
      ctx.fillStyle = 'rgba(200,240,255,0.5)';
      ctx.fillRect(-2, -4, 3, 3);
    }

    ctx.restore();
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = p.life / 25;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawBackground() {
  // Dark temple background
  ctx.fillStyle = '#0f0f23';
  ctx.fillRect(0, 0, W, H);

  // Subtle grid for atmosphere
  ctx.strokeStyle = 'rgba(100,100,150,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += TILE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += TILE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
}

// ── Game loop ────────────────────────────────────────────────
function update() {
  if (gameState !== 'playing') return;

  fireboy.update();
  watergirl.update();

  // Hazards
  const fireDeath = checkHazards(fireboy);
  const waterDeath = checkHazards(watergirl);
  if (fireDeath || waterDeath) {
    deathMsg = fireDeath || waterDeath;
    die();
    return;
  }

  // Gems
  collectGems(fireboy);
  collectGems(watergirl);

  // Doors
  fireboy.atDoor = checkDoor(fireboy, fireDoor);
  watergirl.atDoor = checkDoor(watergirl, waterDoor);

  if (fireboy.atDoor && watergirl.atDoor) {
    completeLevel();
  }

  updateParticles();
}

function draw() {
  drawBackground();

  if (gameState === 'title') return;

  drawTiles();
  drawDoor(fireDoor, 'fire');
  drawDoor(waterDoor, 'water');
  drawGems();

  if (gameState === 'playing' || gameState === 'complete') {
    fireboy.draw();
    watergirl.draw();
  }

  drawParticles();

  // Door indicators
  if (gameState === 'playing') {
    if (fireboy.atDoor) drawCheckmark(fireDoor);
    if (watergirl.atDoor) drawCheckmark(waterDoor);
  }
}

function drawCheckmark(door) {
  const x = door.x * TILE + TILE / 2;
  const y = door.y * TILE - 8;
  ctx.fillStyle = '#00ff66';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✓', x, y);
}

function die() {
  gameState = 'dead';
  deathReason.textContent = deathMsg;
  gameOverScreen.classList.remove('hidden');
}

function completeLevel() {
  gameState = 'complete';
  totalFireGems += fireGems;
  totalWaterGems += waterGems;
  completeStats.textContent = `🔥 ${fireGems} gems  |  💧 ${waterGems} gems`;
  levelComplete.classList.remove('hidden');
}

function nextLevel() {
  hideAll();
  if (currentLevel + 1 >= LEVELS.length) {
    gameState = 'victory';
    victoryStats.textContent = `Total gems: 🔥 ${totalFireGems}  |  💧 ${totalWaterGems}`;
    victoryScreen.classList.remove('hidden');
  } else {
    loadLevel(currentLevel + 1);
    gameState = 'playing';
  }
}

// ── Main loop ────────────────────────────────────────────────
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();

