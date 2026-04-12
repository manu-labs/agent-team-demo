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
const GRAVITY = 0.48;
const MAX_FALL = 10;
const PLAYER_SPEED = 3.2;
const JUMP_FORCE = -10.2;

// ── State ────────────────────────────────────────────────────
let gameState = 'title'; // title | playing | complete | dead | dying | victory
let currentLevel = 0;
let fireGems = 0;
let waterGems = 0;
let totalFireGems = 0;
let totalWaterGems = 0;
let deathMsg = '';
let levelStartTime = 0;
let levelTime = 0;
let screenShake = 0;
let deathTimer = 0;
let deathType = ''; // 'fire', 'water', 'poison'

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
    this.type = type;
    this.w = 20;
    this.h = 28;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.atDoor = false;
    this.facing = 1;
    this.alive = true;
  }

  spawn(tx, ty) {
    this.x = tx * TILE + (TILE - this.w) / 2;
    this.y = ty * TILE + (TILE - this.h);
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.atDoor = false;
    this.alive = true;
  }

  update() {
    if (!this.alive) return;
    if (this.type === 'fire') {
      if (keys['ArrowLeft']) { this.vx = -PLAYER_SPEED; this.facing = -1; }
      else if (keys['ArrowRight']) { this.vx = PLAYER_SPEED; this.facing = 1; }
      else this.vx = 0;
      if (keys['ArrowUp'] && this.onGround) this.vy = JUMP_FORCE;
    } else {
      if (keys['KeyA']) { this.vx = -PLAYER_SPEED; this.facing = -1; }
      else if (keys['KeyD']) { this.vx = PLAYER_SPEED; this.facing = 1; }
      else this.vx = 0;
      if (keys['KeyW'] && this.onGround) this.vy = JUMP_FORCE;
    }

    this.vy += GRAVITY;
    if (this.vy > MAX_FALL) this.vy = MAX_FALL;

    this.x += this.vx;
    this.resolveCollisionX();

    this.y += this.vy;
    this.onGround = false;
    this.resolveCollisionY();

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
    if (!this.alive) return;
    const cx = this.x + this.w / 2;
    const cy = this.y;

    ctx.save();

    if (this.type === 'fire') {
      // Body
      ctx.fillStyle = '#ff6b35';
      ctx.fillRect(this.x + 2, this.y + 8, this.w - 4, this.h - 8);
      // Legs (animated when moving)
      if (Math.abs(this.vx) > 0.5) {
        const step = Math.sin(Date.now() * 0.015) * 3;
        ctx.fillStyle = '#cc5522';
        ctx.fillRect(this.x + 3, this.y + this.h - 6 + step, 5, 6);
        ctx.fillRect(this.x + this.w - 8, this.y + this.h - 6 - step, 5, 6);
      }
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
      ctx.fillRect(cx - 4 + (this.facing > 0 ? 1 : 0), cy + 6, 2, 2);
      ctx.fillRect(cx + 2 + (this.facing > 0 ? 1 : 0), cy + 6, 2, 2);
      // Flame hair
      const flicker = Math.sin(Date.now() * 0.012) * 2;
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
      // Legs
      if (Math.abs(this.vx) > 0.5) {
        const step = Math.sin(Date.now() * 0.015) * 3;
        ctx.fillStyle = '#1a8a9a';
        ctx.fillRect(this.x + 3, this.y + this.h - 6 + step, 5, 6);
        ctx.fillRect(this.x + this.w - 8, this.y + this.h - 6 - step, 5, 6);
      }
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
      ctx.fillRect(cx - 4 + (this.facing > 0 ? 1 : 0), cy + 6, 2, 2);
      ctx.fillRect(cx + 2 + (this.facing > 0 ? 1 : 0), cy + 6, 2, 2);
      // Water droplet hair
      const bob = Math.sin(Date.now() * 0.008) * 1.5;
      ctx.fillStyle = '#80e8ff';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 7 + bob);
      ctx.quadraticCurveTo(cx + 6, cy - 1, cx, cy + 2);
      ctx.quadraticCurveTo(cx - 6, cy - 1, cx, cy - 7 + bob);
      ctx.fill();
    }

    ctx.restore();
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  get bottom() { return this.y + this.h; }
}

// ── Level data ───────────────────────────────────────────────
// Tile legend:
// . = empty, # = wall, = = platform,
// F = fire pool, W = water pool, P = poison pool,
// f = fireboy spawn, w = watergirl spawn,
// 1 = fire door, 2 = water door,
// r = red gem, b = blue gem

// Max jump height ~3.3 tiles, so vertical gaps between platforms <= 3 tiles
const LEVELS = [
  {
    name: "First Steps",
    map: [
      "##############################",
      "#..1......................2..#",
      "#..##....................##..#",
      "#............................#",
      "#.=====.......=====....=====.#",
      "#............................#",
      "#.........r.........b........#",
      "#.......======....======.....#",
      "#............................#",
      "#...r....................b...#",
      "#.======..............======.#",
      "#............................#",
      "#...........r.....b..........#",
      "#........============........#",
      "#............................#",
      "#............................#",
      "#======.....======.....======#",
      "#............................#",
      "#f......FFF.PPPPPP.WWW......w#",
      "##############################",
    ],
  },
  {
    name: "The Great Divide",
    map: [
      "##############################",
      "#.1............#...........2.#",
      "#.##...........#..........##.#",
      "#..............#.............#",
      "#..=====.......#......=====..#",
      "#..............#.............#",
      "#....r.........#........b....#",
      "#.=====........#.......=====.#",
      "#..............#.............#",
      "#..r...........#..........b..#",
      "#======........#.......======#",
      "#..............#.............#",
      "#.....r........#......b......#",
      "#..======......#.....======..#",
      "#..............#.............#",
      "#..............#.............#",
      "#.=====........#.......=====.#",
      "#..............#.............#",
      "#f....FFF.PPPPP#PPPPP.WWW...w#",
      "##############################",
    ],
  },
  {
    name: "Zigzag Ascent",
    map: [
      "##############################",
      "#..1......................2..#",
      "#..###..................###..#",
      "#...........r.....b..........#",
      "#.......==============.......#",
      "#............................#",
      "#..r......................b..#",
      "#========............========#",
      "#............................#",
      "#.........r.........b........#",
      "#.....==================.....#",
      "#............................#",
      "#.r........................b.#",
      "#========............========#",
      "#............................#",
      "#............................#",
      "#.....==================.....#",
      "#............................#",
      "#f....FFF.PPPPPPPPPP.WWW....w#",
      "##############################",
    ],
  },
  {
    name: "Temple of Traps",
    map: [
      "##############################",
      "#.1........................2.#",
      "#.##......................##.#",
      "#............................#",
      "#....========....========....#",
      "#............................#",
      "#..r......................b..#",
      "#.=====..FFF......WWW..=====.#",
      "#........###......###........#",
      "#.....r................b.....#",
      "#...========......========...#",
      "#............................#",
      "#............................#",
      "#.==========......==========.#",
      "#............................#",
      "#......FFF..........WWW......#",
      "#======###..........###======#",
      "#............................#",
      "#f......PPPPPPPPPPPPPP......w#",
      "##############################",
    ],
  },
  {
    name: "The Final Trial",
    map: [
      "##############################",
      "#..1......................2..#",
      "#..###..................###..#",
      "#.........r.........b........#",
      "#.....==================.....#",
      "#............................#",
      "#..r........FF..WW........b..#",
      "#.======....##..##....======.#",
      "#............................#",
      "#.......r.............b......#",
      "#.....========....========...#",
      "#............................#",
      "#............................#",
      "#.========..PPPPPP..========.#",
      "#............................#",
      "#....FFF..PPPPPPPP....WWW....#",
      "#====###..########....###====#",
      "#............................#",
      "#f....FFF.PPPPPPPP...WWW....w#",
      "##############################",
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
let ambientParticles = []; // background atmosphere

function loadLevel(idx) {
  currentLevel = idx;
  const level = LEVELS[idx];
  tileMap = [];
  gems = [];
  fireGems = 0;
  waterGems = 0;
  particles = [];
  ambientParticles = [];
  screenShake = 0;
  deathTimer = 0;
  levelStartTime = Date.now();

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

// ── Death effects ───────────────────────────────────────────
function spawnDeathEffect(player, type) {
  const px = player.cx;
  const py = player.cy;
  deathType = type;

  if (type === 'fire') {
    // Fire burst — flames shooting up and out
    for (let i = 0; i < 30; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      const speed = 2 + Math.random() * 5;
      particles.push({
        x: px + (Math.random() - 0.5) * 10,
        y: py + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        color: ['#ff4400', '#ff6600', '#ffaa00', '#ffcc00', '#ffee66'][Math.floor(Math.random() * 5)],
        size: 3 + Math.random() * 5,
        type: 'fire',
      });
    }
    // Ember trail
    for (let i = 0; i < 15; i++) {
      particles.push({
        x: px + (Math.random() - 0.5) * 20,
        y: py,
        vx: (Math.random() - 0.5) * 3,
        vy: -1 - Math.random() * 3,
        life: 40 + Math.random() * 30,
        maxLife: 70,
        color: '#ff8800',
        size: 1 + Math.random() * 2,
        type: 'ember',
      });
    }
  } else if (type === 'water') {
    // Water splash — droplets arcing out
    for (let i = 0; i < 25; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2;
      const speed = 2 + Math.random() * 4;
      particles.push({
        x: px + (Math.random() - 0.5) * 10,
        y: py + 5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        color: ['#0088ff', '#00aaff', '#44ccff', '#88ddff', '#aaeeff'][Math.floor(Math.random() * 5)],
        size: 3 + Math.random() * 4,
        type: 'water',
        gravity: 0.15,
      });
    }
    // Ripple rings
    for (let i = 0; i < 3; i++) {
      particles.push({
        x: px, y: py + 10,
        vx: 0, vy: 0,
        life: 25 + i * 8,
        maxLife: 25 + i * 8,
        color: '#44ccff',
        size: 5 + i * 8,
        type: 'ripple',
      });
    }
  } else if (type === 'poison') {
    // Toxic cloud — green puffs expanding
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2;
      particles.push({
        x: px + (Math.random() - 0.5) * 10,
        y: py + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        life: 40 + Math.random() * 30,
        maxLife: 70,
        color: ['#33aa33', '#44cc44', '#66ee66', '#88ff88'][Math.floor(Math.random() * 4)],
        size: 5 + Math.random() * 8,
        type: 'cloud',
      });
    }
    // Skull indicator (small crosses)
    for (let i = 0; i < 6; i++) {
      particles.push({
        x: px + (Math.random() - 0.5) * 30,
        y: py - 10 - Math.random() * 20,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.3 - Math.random() * 0.5,
        life: 50,
        maxLife: 50,
        color: '#aaffaa',
        size: 2,
        type: 'cross',
      });
    }
  }

  screenShake = 12;
}

// ── Hazard checks ────────────────────────────────────────────
function checkHazards(player) {
  const points = [
    { x: player.x + 2, y: player.bottom - 2 },
    { x: player.x + player.w - 2, y: player.bottom - 2 },
    { x: player.cx, y: player.bottom - 2 },
    { x: player.cx, y: player.cy },
  ];

  for (const pt of points) {
    const tx = Math.floor(pt.x / TILE);
    const ty = Math.floor(pt.y / TILE);
    if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) continue;
    const tile = tileMap[ty][tx];

    if (tile === 'P') {
      return { msg: player.type === 'fire' ? 'Fireboy fell into poison!' : 'Watergirl fell into poison!', type: 'poison' };
    }
    if (tile === 'F' && player.type === 'water') {
      return { msg: 'Watergirl touched fire!', type: 'fire' };
    }
    if (tile === 'W' && player.type === 'fire') {
      return { msg: 'Fireboy touched water!', type: 'water' };
    }
  }
  return null;
}

// ── Gem collection ───────────────────────────────────────────
function collectGems(player) {
  for (const gem of gems) {
    if (gem.collected) continue;
    if (gem.type !== player.type) continue;
    const dx = player.cx - (gem.x + 8);
    const dy = player.cy - (gem.y + 8);
    if (Math.abs(dx) < 18 && Math.abs(dy) < 18) {
      gem.collected = true;
      if (gem.type === 'fire') fireGems++;
      else waterGems++;
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 / 12) * i;
        particles.push({
          x: gem.x + 8, y: gem.y + 8,
          vx: Math.cos(angle) * 3,
          vy: Math.sin(angle) * 3,
          life: 25,
          maxLife: 25,
          color: gem.type === 'fire' ? '#ffcc00' : '#80e8ff',
          size: 3,
          type: 'sparkle',
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

// ── Ambient particles ───────────────────────────────────────
function spawnAmbientParticles() {
  // Spawn floating dust motes
  if (Math.random() < 0.03) {
    ambientParticles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.1 - Math.random() * 0.2,
      life: 200 + Math.random() * 200,
      maxLife: 400,
      size: 1 + Math.random() * 1.5,
      color: 'rgba(200,200,220,0.15)',
    });
  }

  // Spawn fire embers near fire tiles
  if (Math.random() < 0.08) {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (tileMap[row] && tileMap[row][col] === 'F' && Math.random() < 0.01) {
          ambientParticles.push({
            x: col * TILE + Math.random() * TILE,
            y: row * TILE + TILE * 0.3,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -0.5 - Math.random() * 1,
            life: 40 + Math.random() * 30,
            maxLife: 70,
            size: 1 + Math.random() * 2,
            color: Math.random() > 0.5 ? '#ff6600' : '#ffaa00',
          });
        }
        // Water drips
        if (tileMap[row] && tileMap[row][col] === 'W' && Math.random() < 0.005) {
          ambientParticles.push({
            x: col * TILE + Math.random() * TILE,
            y: row * TILE + TILE * 0.3,
            vx: 0,
            vy: 0.3,
            life: 20 + Math.random() * 20,
            maxLife: 40,
            size: 2,
            color: '#44ccff',
          });
        }
        // Poison bubbles
        if (tileMap[row] && tileMap[row][col] === 'P' && Math.random() < 0.008) {
          ambientParticles.push({
            x: col * TILE + Math.random() * TILE,
            y: row * TILE + TILE * 0.35,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -0.3 - Math.random() * 0.5,
            life: 30 + Math.random() * 20,
            maxLife: 50,
            size: 2 + Math.random() * 3,
            color: '#66ee66',
          });
        }
      }
    }
  }
}

// ── Particles ────────────────────────────────────────────────
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    if (p.gravity) p.vy += p.gravity;
    if (p.type === 'cloud') { p.size += 0.2; p.vx *= 0.97; p.vy *= 0.97; }
    if (p.type === 'ember') { p.vy -= 0.02; p.size *= 0.98; }
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // Ambient
  for (let i = ambientParticles.length - 1; i >= 0; i--) {
    const p = ambientParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) ambientParticles.splice(i, 1);
  }

  if (screenShake > 0) screenShake--;
}

// ── Drawing ──────────────────────────────────────────────────
function drawTiles() {
  const t1 = Date.now();
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const t = tileMap[row][col];
      const x = col * TILE;
      const y = row * TILE;

      if (t === '#') {
        ctx.fillStyle = '#3a3a5c';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#2e2e4a';
        ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
        ctx.strokeStyle = '#4a4a6c';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE / 2 - 2);
        ctx.strokeRect(x + TILE / 2, y + TILE / 2, TILE / 2 - 2, TILE / 2 - 2);
        ctx.strokeRect(x + 2, y + TILE / 2, TILE / 2 - 2, TILE / 2 - 2);
        // Subtle moss/vine on some walls
        if ((col + row) % 7 === 0) {
          ctx.fillStyle = 'rgba(60,120,60,0.15)';
          ctx.fillRect(x + 2, y + TILE - 6, TILE - 4, 4);
        }
      } else if (t === '=') {
        // Platform with more detail
        ctx.fillStyle = '#6a6a8c';
        ctx.fillRect(x, y, TILE, 10);
        ctx.fillStyle = '#8a8aac';
        ctx.fillRect(x, y, TILE, 3);
        ctx.fillStyle = '#555578';
        ctx.fillRect(x, y + 8, TILE, 2);
        // Rivets
        ctx.fillStyle = '#9a9abc';
        ctx.fillRect(x + 3, y + 4, 2, 2);
        ctx.fillRect(x + TILE - 5, y + 4, 2, 2);
      } else if (t === 'F') {
        // Enhanced fire pool
        ctx.fillStyle = '#cc2200';
        ctx.fillRect(x, y + TILE * 0.4, TILE, TILE * 0.6);
        ctx.fillStyle = '#ff4400';
        ctx.fillRect(x, y + TILE * 0.5, TILE, TILE * 0.4);
        ctx.fillStyle = '#ff6622';
        ctx.fillRect(x + 2, y + TILE * 0.55, TILE - 4, TILE * 0.2);
        // Animated flames
        const ft = t1 * 0.005;
        for (let i = 0; i < 4; i++) {
          const fx = x + 2 + i * 8;
          const fh = 10 + Math.sin(ft + i * 1.7 + col * 0.5) * 6;
          const fw = 5 + Math.sin(ft * 1.3 + i) * 2;
          ctx.fillStyle = i % 2 === 0 ? '#ffaa00' : '#ffcc44';
          ctx.beginPath();
          ctx.moveTo(fx, y + TILE * 0.45);
          ctx.quadraticCurveTo(fx + fw / 2, y + TILE * 0.45 - fh, fx + fw, y + TILE * 0.45);
          ctx.fill();
        }
        // Glow
        ctx.fillStyle = 'rgba(255,100,0,0.08)';
        ctx.fillRect(x - 4, y - 8, TILE + 8, TILE * 0.5);
      } else if (t === 'W') {
        // Enhanced water pool
        ctx.fillStyle = '#003388';
        ctx.fillRect(x, y + TILE * 0.4, TILE, TILE * 0.6);
        ctx.fillStyle = '#0055aa';
        ctx.fillRect(x, y + TILE * 0.5, TILE, TILE * 0.35);
        // Animated waves
        const wt = t1 * 0.003;
        ctx.fillStyle = '#2288dd';
        for (let i = 0; i < 5; i++) {
          const wx = x + i * 7 - 2;
          const wy = y + TILE * 0.36 + Math.sin(wt + i * 0.8 + col * 0.3) * 3;
          ctx.beginPath();
          ctx.arc(wx + 3, wy, 4, 0, Math.PI, true);
          ctx.fill();
        }
        // Surface shimmer
        ctx.fillStyle = 'rgba(100,200,255,0.15)';
        const shimX = x + Math.sin(wt + col) * 4 + TILE / 2;
        ctx.fillRect(shimX - 3, y + TILE * 0.42, 6, 1);
      } else if (t === 'P') {
        // Enhanced poison pool
        ctx.fillStyle = '#1a6622';
        ctx.fillRect(x, y + TILE * 0.4, TILE, TILE * 0.6);
        ctx.fillStyle = '#2a8833';
        ctx.fillRect(x, y + TILE * 0.5, TILE, TILE * 0.3);
        ctx.fillStyle = '#33aa44';
        ctx.fillRect(x + 3, y + TILE * 0.55, TILE - 6, TILE * 0.15);
        // Bubbles
        const pt = t1 * 0.003;
        ctx.fillStyle = '#66ee66';
        const bx1 = x + 6 + Math.sin(pt + col * 1.5) * 5;
        const by1 = y + TILE * 0.33 + Math.sin(pt * 1.3 + col) * 4;
        ctx.beginPath();
        ctx.arc(bx1, by1, 3 + Math.sin(pt * 2) * 1, 0, Math.PI * 2);
        ctx.fill();
        if (Math.sin(pt * 0.7 + col * 3) > 0.3) {
          const bx2 = x + 20 + Math.sin(pt * 0.8 + col) * 4;
          const by2 = y + TILE * 0.3 + Math.sin(pt * 1.1 + col * 2) * 3;
          ctx.beginPath();
          ctx.arc(bx2, by2, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

function drawDoor(door, type) {
  const x = door.x * TILE;
  const y = door.y * TILE;
  const color1 = type === 'fire' ? '#ff6b35' : '#2ab7ca';
  const color2 = type === 'fire' ? '#ff9a56' : '#4ecdc4';
  const glow = type === 'fire' ? 'rgba(255,107,53,' : 'rgba(42,183,202,';

  // Pulsing glow
  const pulse = 0.2 + Math.sin(Date.now() * 0.004) * 0.1;
  ctx.fillStyle = glow + pulse + ')';
  ctx.fillRect(x - 4, y - 4, TILE + 8, TILE + 8);
  ctx.fillStyle = glow + (pulse + 0.1) + ')';
  ctx.fillRect(x - 2, y - 2, TILE + 4, TILE + 4);

  ctx.fillStyle = color1;
  ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
  ctx.fillStyle = color2;
  ctx.fillRect(x + 5, y + 5, TILE - 10, TILE - 10);

  // Door symbol with glow
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(type === 'fire' ? 'F' : 'W', x + TILE / 2, y + TILE / 2);
}

function drawGems() {
  const now = Date.now();
  for (const gem of gems) {
    if (gem.collected) continue;
    const x = gem.x + 8;
    const y = gem.y + 8;
    const bob = Math.sin(now * 0.005 + gem.x) * 3;
    const spin = Math.sin(now * 0.003 + gem.x * 0.1) * 0.15;

    ctx.save();
    ctx.translate(x, y + bob);
    ctx.rotate(spin);

    // Glow behind gem
    ctx.fillStyle = gem.type === 'fire' ? 'rgba(255,68,68,0.15)' : 'rgba(68,136,255,0.15)';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();

    if (gem.type === 'fire') {
      ctx.fillStyle = '#ff4444';
      ctx.strokeStyle = '#ffaa44';
      ctx.lineWidth = 1.5;
    } else {
      ctx.fillStyle = '#4488ff';
      ctx.strokeStyle = '#88ccff';
      ctx.lineWidth = 1.5;
    }
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(7, 0);
    ctx.lineTo(0, 8);
    ctx.lineTo(-7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sparkle shine
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(-2, -5, 3, 3);
    // Secondary sparkle
    const sparkle = Math.sin(now * 0.01 + gem.x) > 0.7;
    if (sparkle) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(3, -2, 2, 2);
    }

    ctx.restore();
  }
}

function drawParticles() {
  // Ambient particles (behind everything)
  for (const p of ambientParticles) {
    const alpha = Math.min(1, p.life / (p.maxLife * 0.3)) * Math.min(1, (p.maxLife - p.life) / 20);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Game particles (death effects, gem sparkles)
  for (const p of particles) {
    const alpha = p.life / (p.maxLife || 25);
    ctx.globalAlpha = alpha;

    if (p.type === 'ripple') {
      // Expanding ring
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      const radius = (1 - p.life / p.maxLife) * 30 + 5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.type === 'cloud') {
      // Expanding poison cloud
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'cross') {
      // Toxic cross/skull
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 1, p.y - 4, 2, 8);
      ctx.fillRect(p.x - 4, p.y - 1, 8, 2);
    } else {
      // Standard particle (fire, water, ember, sparkle)
      ctx.fillStyle = p.color;
      if (p.type === 'water') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
  }
  ctx.globalAlpha = 1;
}

function drawBackground() {
  ctx.fillStyle = '#0f0f23';
  ctx.fillRect(0, 0, W, H);

  // Subtle grid
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

  // Gradient overlay at top and bottom for atmosphere
  const topGrad = ctx.createLinearGradient(0, 0, 0, 80);
  topGrad.addColorStop(0, 'rgba(20,15,40,0.4)');
  topGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, 80);
}

function drawCheckmark(door) {
  const x = door.x * TILE + TILE / 2;
  const y = door.y * TILE - 8;
  const pulse = 0.7 + Math.sin(Date.now() * 0.008) * 0.3;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#00ff66';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✓', x, y);
  ctx.globalAlpha = 1;
}

function drawTimer() {
  if (gameState !== 'playing') return;
  const elapsed = ((Date.now() - levelStartTime) / 1000).toFixed(1);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '12px "Nunito", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${elapsed}s`, W / 2, 18);
}

// ── Game logic ───────────────────────────────────────────────
function update() {
  if (gameState === 'dying') {
    deathTimer--;
    updateParticles();
    if (screenShake > 0) screenShake--;
    if (deathTimer <= 0) {
      gameState = 'dead';
      deathReason.textContent = deathMsg;
      gameOverScreen.classList.remove('hidden');
    }
    return;
  }

  if (gameState !== 'playing') return;

  fireboy.update();
  watergirl.update();

  const fireDeath = checkHazards(fireboy);
  const waterDeath = checkHazards(watergirl);
  if (fireDeath || waterDeath) {
    const death = fireDeath || waterDeath;
    deathMsg = death.msg;
    const deadPlayer = fireDeath ? fireboy : watergirl;
    spawnDeathEffect(deadPlayer, death.type);
    deadPlayer.alive = false;
    gameState = 'dying';
    deathTimer = 45; // frames of death animation
    return;
  }

  collectGems(fireboy);
  collectGems(watergirl);

  fireboy.atDoor = checkDoor(fireboy, fireDoor);
  watergirl.atDoor = checkDoor(watergirl, waterDoor);

  if (fireboy.atDoor && watergirl.atDoor) {
    completeLevel();
  }

  spawnAmbientParticles();
  updateParticles();
}

function draw() {
  ctx.save();

  // Screen shake
  if (screenShake > 0) {
    const shakeX = (Math.random() - 0.5) * screenShake * 1.5;
    const shakeY = (Math.random() - 0.5) * screenShake * 1.5;
    ctx.translate(shakeX, shakeY);
  }

  drawBackground();
  if (gameState === 'title') { ctx.restore(); return; }

  drawTiles();
  drawDoor(fireDoor, 'fire');
  drawDoor(waterDoor, 'water');
  drawGems();

  if (gameState === 'playing' || gameState === 'complete' || gameState === 'dying') {
    fireboy.draw();
    watergirl.draw();
  }

  drawParticles();
  drawTimer();

  if (gameState === 'playing') {
    if (fireboy.atDoor) drawCheckmark(fireDoor);
    if (watergirl.atDoor) drawCheckmark(waterDoor);
  }

  // Death flash overlay
  if (gameState === 'dying' && deathTimer > 35) {
    const flashAlpha = (deathTimer - 35) / 10;
    if (deathType === 'fire') ctx.fillStyle = `rgba(255,80,0,${flashAlpha * 0.3})`;
    else if (deathType === 'water') ctx.fillStyle = `rgba(0,100,255,${flashAlpha * 0.3})`;
    else ctx.fillStyle = `rgba(50,200,50,${flashAlpha * 0.3})`;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.restore();
}

function die() {
  gameState = 'dead';
  deathReason.textContent = deathMsg;
  gameOverScreen.classList.remove('hidden');
}

function completeLevel() {
  gameState = 'complete';
  levelTime = ((Date.now() - levelStartTime) / 1000).toFixed(1);
  totalFireGems += fireGems;
  totalWaterGems += waterGems;
  completeStats.textContent = `🔥 ${fireGems} gems  |  💧 ${waterGems} gems  |  ⏱ ${levelTime}s`;
  levelComplete.classList.remove('hidden');

  // Victory particles
  for (let i = 0; i < 30; i++) {
    particles.push({
      x: W / 2 + (Math.random() - 0.5) * 200,
      y: H / 2,
      vx: (Math.random() - 0.5) * 6,
      vy: -2 - Math.random() * 5,
      life: 40 + Math.random() * 30,
      maxLife: 70,
      color: ['#ffcc00', '#ff6b35', '#4ecdc4', '#80e8ff', '#ff4444', '#4488ff'][Math.floor(Math.random() * 6)],
      size: 3 + Math.random() * 3,
      type: 'sparkle',
      gravity: 0.1,
    });
  }
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

// ── Touch Controls (mobile) ──────────────────────────────────
function touchBind(id, keyCode) {
  const btn = document.getElementById(id);
  if (!btn) return;
  const onStart = (e) => { e.preventDefault(); keys[keyCode] = true; btn.classList.add('active'); };
  const onEnd = (e) => { e.preventDefault(); keys[keyCode] = false; btn.classList.remove('active'); };
  btn.addEventListener('touchstart', onStart, { passive: false });
  btn.addEventListener('touchend', onEnd, { passive: false });
  btn.addEventListener('touchcancel', onEnd, { passive: false });
  btn.addEventListener('mousedown', onStart);
  btn.addEventListener('mouseup', onEnd);
  btn.addEventListener('mouseleave', onEnd);
}

touchBind('fire-left', 'ArrowLeft');
touchBind('fire-right', 'ArrowRight');
touchBind('fire-jump', 'ArrowUp');
touchBind('water-left', 'KeyA');
touchBind('water-right', 'KeyD');
touchBind('water-jump', 'KeyW');

// Tap overlay to advance screens
function handleScreenTap(e) {
  e.preventDefault();
  if (gameState === 'title') { gameState = 'playing'; hideAll(); loadLevel(0); }
  else if (gameState === 'complete') { nextLevel(); }
  else if (gameState === 'dead') { hideAll(); loadLevel(currentLevel); gameState = 'playing'; }
  else if (gameState === 'victory') { currentLevel = 0; totalFireGems = 0; totalWaterGems = 0; hideAll(); titleScreen.classList.remove('hidden'); gameState = 'title'; }
}
[titleScreen, levelComplete, gameOverScreen, victoryScreen].forEach(el => {
  if (el) {
    el.addEventListener('click', handleScreenTap);
    el.addEventListener('touchend', handleScreenTap);
  }
});

// Prevent scroll/zoom on mobile
document.addEventListener('touchmove', e => { e.preventDefault(); }, { passive: false });

// ── Main loop ────────────────────────────────────────────────
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
