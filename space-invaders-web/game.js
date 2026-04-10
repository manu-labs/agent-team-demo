// ============================================================
// SPACE INVADERS: BORG INCURSION
// ============================================================

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const W = canvas.width;
const H = canvas.height;

// ── State ────────────────────────────────────────────────────
let state = 'title'; // title | playing | gameover | wave-intro
let score = 0;
let lives = 3;
let wave = 1;
let frameCount = 0;

const keys = {};
window.addEventListener('keydown', e => { keys[e.code] = true; });
window.addEventListener('keyup', e => { keys[e.code] = false; });

// Start / restart
window.addEventListener('keydown', e => {
  if (e.code !== 'Enter') return;
  if (state === 'title') startGame();
  else if (state === 'gameover') startGame();
});

// ── DOM refs ─────────────────────────────────────────────────
const scoreEl = document.getElementById('score-value');
const livesEl = document.getElementById('lives-value');
const waveEl = document.getElementById('wave-value');
const overlay = document.getElementById('overlay');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const waveBanner = document.getElementById('wave-banner');
const waveBannerNum = document.getElementById('wave-banner-num');
const waveBannerText = document.getElementById('wave-banner-text');

// ── Player ───────────────────────────────────────────────────
const player = {
  x: W / 2,
  y: H - 50,
  w: 40,
  h: 24,
  speed: 5,
  cooldown: 0,
  fireRate: 12,
  invincible: 0,
};

let playerBullets = [];
let borgBullets = [];
let borgs = [];
let particles = [];
let stars = [];
let borgDirection = 1;
let borgSpeed = 0.4;
let borgDropTimer = 0;
let borgFireTimer = 0;
let shieldBarriers = [];

// ── Star field ───────────────────────────────────────────────
function initStars() {
  stars = [];
  for (let i = 0; i < 120; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      size: Math.random() * 1.5 + 0.5,
      speed: Math.random() * 0.5 + 0.1,
      brightness: Math.random(),
    });
  }
}

// ── Borg drawing (cube-like shapes) ─────────────────────────
function drawBorgCube(x, y, size, type, frame) {
  ctx.save();
  ctx.translate(x, y);

  const pulse = Math.sin(frameCount * 0.05 + x * 0.1) * 0.15 + 0.85;
  const glowColor = type === 0 ? 'rgba(0,255,100,' : type === 1 ? 'rgba(0,200,255,' : 'rgba(180,0,255,';

  // Outer glow
  ctx.shadowColor = type === 0 ? '#00ff66' : type === 1 ? '#00ccff' : '#b400ff';
  ctx.shadowBlur = 8 * pulse;

  const s = size;
  const hs = s / 2;

  if (type === 0) {
    // Standard Borg drone — cube shape
    ctx.fillStyle = `rgba(20,40,20,${0.9 * pulse})`;
    ctx.fillRect(-hs, -hs, s, s);

    // Grid lines (Borg surface detail)
    ctx.strokeStyle = `${glowColor}${0.6 * pulse})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(-hs, -hs, s, s);

    const thirds = s / 3;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-hs + thirds * i, -hs);
      ctx.lineTo(-hs + thirds * i, hs);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-hs, -hs + thirds * i);
      ctx.lineTo(hs, -hs + thirds * i);
      ctx.stroke();
    }

    // Center eye
    ctx.fillStyle = `${glowColor}${pulse})`;
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

  } else if (type === 1) {
    // Borg sphere — round with tech lines
    ctx.fillStyle = `rgba(10,30,40,${0.9 * pulse})`;
    ctx.beginPath();
    ctx.arc(0, 0, hs, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `${glowColor}${0.5 * pulse})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, hs, 0, Math.PI * 2);
    ctx.stroke();

    // Horizontal bands
    for (let i = -1; i <= 1; i++) {
      const bw = Math.sqrt(hs * hs - (i * hs * 0.5) * (i * hs * 0.5));
      ctx.beginPath();
      ctx.moveTo(-bw, i * hs * 0.5);
      ctx.lineTo(bw, i * hs * 0.5);
      ctx.stroke();
    }

    // Center eye
    ctx.fillStyle = `${glowColor}${pulse})`;
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

  } else {
    // Borg diamond / tactical cube — rotated square
    ctx.rotate(Math.PI / 4);
    const ds = s * 0.7;
    const dhs = ds / 2;

    ctx.fillStyle = `rgba(30,10,40,${0.9 * pulse})`;
    ctx.fillRect(-dhs, -dhs, ds, ds);

    ctx.strokeStyle = `${glowColor}${0.6 * pulse})`;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-dhs, -dhs, ds, ds);

    // Inner diamond
    ctx.strokeRect(-dhs * 0.5, -dhs * 0.5, ds * 0.5, ds * 0.5);

    // Center
    ctx.fillStyle = `${glowColor}${pulse})`;
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ── Draw player ship ─────────────────────────────────────────
function drawPlayer() {
  if (player.invincible > 0 && Math.floor(frameCount / 4) % 2 === 0) return;

  ctx.save();
  ctx.translate(player.x, player.y);

  // Ship glow
  ctx.shadowColor = '#00aaff';
  ctx.shadowBlur = 10;

  // Hull
  ctx.fillStyle = '#1a3a5a';
  ctx.beginPath();
  ctx.moveTo(0, -player.h / 2);
  ctx.lineTo(-player.w / 2, player.h / 2);
  ctx.lineTo(-player.w / 4, player.h / 3);
  ctx.lineTo(player.w / 4, player.h / 3);
  ctx.lineTo(player.w / 2, player.h / 2);
  ctx.closePath();
  ctx.fill();

  // Cockpit
  ctx.fillStyle = '#00ccff';
  ctx.shadowColor = '#00ccff';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(0, -player.h / 2 + 4);
  ctx.lineTo(-6, player.h / 6);
  ctx.lineTo(6, player.h / 6);
  ctx.closePath();
  ctx.fill();

  // Engine glow
  ctx.fillStyle = 'rgba(0,180,255,0.6)';
  ctx.shadowBlur = 12;
  ctx.fillRect(-4, player.h / 3, 8, 4 + Math.random() * 3);

  ctx.restore();
}

// ── Barriers (Federation shields) ────────────────────────────
function initBarriers() {
  shieldBarriers = [];
  const barrierCount = 4;
  const spacing = W / (barrierCount + 1);

  for (let i = 0; i < barrierCount; i++) {
    const bx = spacing * (i + 1);
    const by = H - 100;
    const cells = [];

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 6; col++) {
        // Skip corners for rounded look
        if ((row === 0 && (col === 0 || col === 5)) ||
            (row === 3 && col >= 2 && col <= 3)) continue;
        cells.push({ x: col * 6 - 15, y: row * 6 - 9, alive: true });
      }
    }

    shieldBarriers.push({ x: bx, y: by, cells });
  }
}

function drawBarriers() {
  for (const barrier of shieldBarriers) {
    for (const cell of barrier.cells) {
      if (!cell.alive) continue;
      ctx.fillStyle = '#00ff88';
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 3;
      ctx.fillRect(barrier.x + cell.x, barrier.y + cell.y, 5, 5);
    }
  }
  ctx.shadowBlur = 0;
}

// ── Borg fleet creation ──────────────────────────────────────
const borgMessages = [
  'THE BORG ADVANCE',
  'WE ARE THE BORG',
  'RESISTANCE IS FUTILE',
  'YOU WILL BE ASSIMILATED',
  'YOUR CULTURE WILL ADAPT TO SERVICE US',
  'STRENGTH IS IRRELEVANT',
  'FREEDOM IS IRRELEVANT',
  'LOWER YOUR SHIELDS',
  'PREPARE TO BE BOARDED',
  'WE WILL ADD YOUR DISTINCTIVENESS TO OUR OWN',
];

function createBorgFleet() {
  borgs = [];
  const rows = Math.min(4 + Math.floor(wave / 2), 7);
  const cols = Math.min(8 + Math.floor(wave / 3), 12);
  const spacing = 52;
  const startX = (W - (cols - 1) * spacing) / 2;
  const startY = 60;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const type = row < 1 ? 2 : row < 3 ? 1 : 0;
      borgs.push({
        x: startX + col * spacing,
        y: startY + row * 44,
        type,
        size: type === 2 ? 28 : type === 1 ? 26 : 24,
        alive: true,
        hp: type === 2 ? 2 + Math.floor(wave / 3) : 1 + Math.floor(wave / 4),
        points: (type + 1) * 10 * wave,
      });
    }
  }

  borgDirection = 1;
  borgSpeed = 0.4 + wave * 0.1;
  borgFireTimer = 0;
}

// ── Particles ────────────────────────────────────────────────
function spawnExplosion(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 30 + Math.random() * 20,
      maxLife: 50,
      color,
      size: Math.random() * 3 + 1,
    });
  }
}

function spawnAssimilationText(x, y) {
  particles.push({
    x, y,
    vx: 0,
    vy: -0.8,
    life: 60,
    maxLife: 60,
    text: true,
    color: '#00ff66',
    size: 10,
  });
}

// ── Game logic ───────────────────────────────────────────────
function startGame() {
  score = 0;
  lives = 3;
  wave = 1;
  player.x = W / 2;
  player.invincible = 0;
  playerBullets = [];
  borgBullets = [];
  particles = [];
  overlay.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  initStars();
  initBarriers();
  showWaveBanner();
}

function showWaveBanner() {
  state = 'wave-intro';
  waveBannerNum.textContent = wave;
  waveBannerText.textContent = borgMessages[(wave - 1) % borgMessages.length];
  waveBanner.classList.remove('hidden');
  createBorgFleet();

  setTimeout(() => {
    waveBanner.classList.add('hidden');
    state = 'playing';
  }, 2000);
}

function gameOver() {
  state = 'gameover';
  finalScoreEl.textContent = score;
  gameOverScreen.classList.remove('hidden');
}

function nextWave() {
  wave++;
  playerBullets = [];
  borgBullets = [];
  showWaveBanner();
}

// ── Update ───────────────────────────────────────────────────
function update() {
  frameCount++;

  // Stars
  for (const star of stars) {
    star.y += star.speed;
    if (star.y > H) { star.y = 0; star.x = Math.random() * W; }
  }

  if (state !== 'playing') return;

  // Player movement
  if (keys['ArrowLeft'] || keys['KeyA']) player.x -= player.speed;
  if (keys['ArrowRight'] || keys['KeyD']) player.x += player.speed;
  player.x = Math.max(player.w / 2, Math.min(W - player.w / 2, player.x));

  // Fire
  if (player.cooldown > 0) player.cooldown--;
  if ((keys['Space'] || keys['KeyW'] || keys['ArrowUp']) && player.cooldown === 0) {
    playerBullets.push({ x: player.x, y: player.y - player.h / 2, vy: -8 });
    player.cooldown = player.fireRate;
  }

  if (player.invincible > 0) player.invincible--;

  // Player bullets
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    const b = playerBullets[i];
    b.y += b.vy;
    if (b.y < -10) { playerBullets.splice(i, 1); continue; }

    // Hit borg
    let hit = false;
    for (const borg of borgs) {
      if (!borg.alive) continue;
      const hs = borg.size / 2;
      if (b.x > borg.x - hs && b.x < borg.x + hs &&
          b.y > borg.y - hs && b.y < borg.y + hs) {
        borg.hp--;
        if (borg.hp <= 0) {
          borg.alive = false;
          score += borg.points;
          const expColor = borg.type === 0 ? '#00ff66' : borg.type === 1 ? '#00ccff' : '#b400ff';
          spawnExplosion(borg.x, borg.y, expColor, 15);
          spawnAssimilationText(borg.x, borg.y);
        } else {
          spawnExplosion(b.x, b.y, '#ffffff', 5);
        }
        hit = true;
        break;
      }
    }

    // Hit barrier
    if (!hit) {
      for (const barrier of shieldBarriers) {
        for (const cell of barrier.cells) {
          if (!cell.alive) continue;
          const cx = barrier.x + cell.x;
          const cy = barrier.y + cell.y;
          if (b.x > cx && b.x < cx + 5 && b.y > cy && b.y < cy + 5) {
            cell.alive = false;
            hit = true;
            break;
          }
        }
        if (hit) break;
      }
    }

    if (hit) playerBullets.splice(i, 1);
  }

  // Borg movement
  let leftMost = W, rightMost = 0, bottomMost = 0;
  const aliveBorgs = borgs.filter(b => b.alive);

  for (const borg of aliveBorgs) {
    leftMost = Math.min(leftMost, borg.x - borg.size / 2);
    rightMost = Math.max(rightMost, borg.x + borg.size / 2);
    bottomMost = Math.max(bottomMost, borg.y + borg.size / 2);
  }

  let shouldDrop = false;
  if (borgDirection === 1 && rightMost >= W - 10) { borgDirection = -1; shouldDrop = true; }
  if (borgDirection === -1 && leftMost <= 10) { borgDirection = 1; shouldDrop = true; }

  // Speed increases as more borgs are destroyed
  const speedMult = 1 + (1 - aliveBorgs.length / borgs.length) * 2;

  for (const borg of aliveBorgs) {
    borg.x += borgDirection * borgSpeed * speedMult;
    if (shouldDrop) borg.y += 12;
  }

  // Borg reached player level
  if (bottomMost >= player.y - 20) {
    gameOver();
    return;
  }

  // Borg firing
  borgFireTimer++;
  const fireInterval = Math.max(20, 60 - wave * 5);
  if (borgFireTimer >= fireInterval && aliveBorgs.length > 0) {
    borgFireTimer = 0;
    // Pick random borg from bottom rows to fire
    const shooters = [];
    const colMap = {};
    for (const borg of aliveBorgs) {
      const colKey = Math.round(borg.x / 10);
      if (!colMap[colKey] || borg.y > colMap[colKey].y) {
        colMap[colKey] = borg;
      }
    }
    for (const key in colMap) shooters.push(colMap[key]);

    if (shooters.length > 0) {
      const count = Math.min(1 + Math.floor(wave / 2), 3);
      for (let i = 0; i < count; i++) {
        const shooter = shooters[Math.floor(Math.random() * shooters.length)];
        const angle = Math.atan2(player.y - shooter.y, player.x - shooter.x);
        const bulletSpeed = 3 + wave * 0.3;
        borgBullets.push({
          x: shooter.x,
          y: shooter.y + shooter.size / 2,
          vx: Math.cos(angle) * bulletSpeed * 0.3,
          vy: Math.sin(angle) * bulletSpeed,
          type: shooter.type,
        });
      }
    }
  }

  // Borg bullets
  for (let i = borgBullets.length - 1; i >= 0; i--) {
    const b = borgBullets[i];
    b.x += b.vx;
    b.y += b.vy;
    if (b.y > H + 10 || b.x < -10 || b.x > W + 10) {
      borgBullets.splice(i, 1);
      continue;
    }

    // Hit player
    if (player.invincible === 0 &&
        b.x > player.x - player.w / 2 && b.x < player.x + player.w / 2 &&
        b.y > player.y - player.h / 2 && b.y < player.y + player.h / 2) {
      lives--;
      player.invincible = 90;
      spawnExplosion(player.x, player.y, '#00aaff', 20);
      borgBullets.splice(i, 1);
      if (lives <= 0) { gameOver(); return; }
      continue;
    }

    // Hit barrier
    let hitBarrier = false;
    for (const barrier of shieldBarriers) {
      for (const cell of barrier.cells) {
        if (!cell.alive) continue;
        const cx = barrier.x + cell.x;
        const cy = barrier.y + cell.y;
        if (b.x > cx && b.x < cx + 5 && b.y > cy && b.y < cy + 5) {
          cell.alive = false;
          hitBarrier = true;
          break;
        }
      }
      if (hitBarrier) break;
    }
    if (hitBarrier) borgBullets.splice(i, 1);
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // Check wave clear
  if (aliveBorgs.length === 0) {
    nextWave();
  }

  // Update HUD
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  waveEl.textContent = wave;
}

// ── Draw ─────────────────────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = '#020208';
  ctx.fillRect(0, 0, W, H);

  // Stars
  for (const star of stars) {
    const flicker = Math.sin(frameCount * 0.1 + star.x) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(180,200,255,${star.brightness * flicker})`;
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }

  // Borg tractor beam grid (subtle background effect)
  if (state === 'playing' || state === 'wave-intro') {
    ctx.strokeStyle = 'rgba(0,255,100,0.02)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    const offset = (frameCount * 0.3) % gridSize;
    for (let x = offset; x < W; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = offset; y < H; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }

  // Barriers
  drawBarriers();

  // Borgs
  for (const borg of borgs) {
    if (!borg.alive) continue;
    drawBorgCube(borg.x, borg.y, borg.size, borg.type, frameCount);
  }

  // Player
  if (state === 'playing' || state === 'wave-intro') {
    drawPlayer();
  }

  // Player bullets (Federation phaser bolts)
  ctx.shadowColor = '#00aaff';
  ctx.shadowBlur = 6;
  for (const b of playerBullets) {
    ctx.fillStyle = '#88ddff';
    ctx.fillRect(b.x - 1.5, b.y, 3, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(b.x - 0.5, b.y, 1, 10);
  }

  // Borg bullets (assimilation beams)
  for (const b of borgBullets) {
    const color = b.type === 0 ? '#00ff66' : b.type === 1 ? '#00ccff' : '#b400ff';
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
    // Trail
    ctx.fillStyle = color.replace(')', ',0.3)').replace('rgb', 'rgba');
    ctx.beginPath();
    ctx.arc(b.x - b.vx, b.y - b.vy, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Particles
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    if (p.text) {
      ctx.font = `${p.size}px "Share Tech Mono", monospace`;
      ctx.fillStyle = p.color.replace(')', `,${alpha})`).replace('rgb', 'rgba').replace('#', '');
      // Handle hex color for text
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.textAlign = 'center';
      ctx.fillText('ASSIMILATED', p.x, p.y);
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.globalAlpha = 1;
    }
  }
}

// ── Game loop ────────────────────────────────────────────────
initStars();

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
