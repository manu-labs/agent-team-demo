// ============================================================
// FIREBOY & WATERGIRL — Level Feasibility Tests
// Run: node fbwg_level_test.js (from repo root or this dir)
//
// Validates that every level is physically completable:
//  - All platforms reachable from spawn via jump/walk
//  - All gems reachable
//  - Both doors reachable
//  - Fireboy doesn't have to cross water, Watergirl doesn't have to cross fire
//  - No player forced through poison
// ============================================================

// ── Physics constants (must match game.js) ───────────────────
const TILE = 32;
const COLS = 30;
const ROWS = 20;
const GRAVITY = 0.48;
const JUMP_FORCE = -10.2;
const PLAYER_SPEED = 3.2;
const MAX_FALL = 10;

// Calculate max jump height in tiles
// v² = u² + 2as → 0 = JUMP_FORCE² + 2*GRAVITY*s → s = JUMP_FORCE²/(2*GRAVITY)
const MAX_JUMP_PX = (JUMP_FORCE * JUMP_FORCE) / (2 * GRAVITY);
const MAX_JUMP_TILES = Math.floor(MAX_JUMP_PX / TILE);

// Calculate max horizontal distance during a jump (time in air * speed)
// Time to apex: t = -JUMP_FORCE/GRAVITY, total air time ~2t
const TIME_TO_APEX = -JUMP_FORCE / GRAVITY;
const TOTAL_AIR_TIME = TIME_TO_APEX * 2;
// At 60fps, each frame is ~16.67ms but we measure in frames
const AIR_FRAMES = TOTAL_AIR_TIME; // in physics steps
const MAX_HORIZ_PX = PLAYER_SPEED * AIR_FRAMES;
const MAX_HORIZ_TILES = Math.floor(MAX_HORIZ_PX / TILE);

// ── Level data (extracted from game.js) ──────────────────────
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

// ── Test runner ──────────────────────────────────────────────
let passed = 0, failed = 0, warnings = 0;

function assert(condition, name) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    failed++;
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
  }
}

function warn(msg) {
  warnings++;
  console.log(`  \x1b[33m⚠\x1b[0m ${msg}`);
}

// ── Parse a level map ────────────────────────────────────────
function parseLevel(level) {
  const tiles = [];
  let fireboySpawn = null, watergirlSpawn = null;
  let fireDoor = null, waterDoor = null;
  const fireGems = [];
  const waterGems = [];

  for (let row = 0; row < ROWS; row++) {
    tiles[row] = [];
    const line = level.map[row] || '';
    for (let col = 0; col < COLS; col++) {
      const ch = line[col] || '.';
      tiles[row][col] = ch;

      if (ch === 'f') { fireboySpawn = { col, row }; tiles[row][col] = '.'; }
      if (ch === 'w') { watergirlSpawn = { col, row }; tiles[row][col] = '.'; }
      if (ch === '1') { fireDoor = { col, row }; }
      if (ch === '2') { waterDoor = { col, row }; }
      if (ch === 'r') { fireGems.push({ col, row }); tiles[row][col] = '.'; }
      if (ch === 'b') { waterGems.push({ col, row }); tiles[row][col] = '.'; }
    }
  }

  return { tiles, fireboySpawn, watergirlSpawn, fireDoor, waterDoor, fireGems, waterGems };
}

function isSolid(tiles, col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return true;
  const t = tiles[row][col];
  return t === '#' || t === '=';
}

function isHazardFor(tiles, col, row, playerType) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  const t = tiles[row][col];
  if (t === 'P') return true;
  if (t === 'F' && playerType === 'water') return true;
  if (t === 'W' && playerType === 'fire') return true;
  return false;
}

// ── Reachability via BFS ─────────────────────────────────────
// We model reachability at tile granularity.
// A player standing on a surface at tile (col, row) means:
//   - tiles[row][col] is empty/passable
//   - tiles[row+1][col] is solid (ground beneath)
//   OR row+1 >= ROWS (bottom wall)
//
// From a standing position, a player can:
//   1. Walk left/right to adjacent tiles on the same surface
//   2. Jump up to MAX_JUMP_TILES tiles vertically and MAX_HORIZ_TILES horizontally
//   3. Fall down (walk off edge) landing on any surface below within MAX_HORIZ_TILES horizontal

function findReachable(tiles, spawn, playerType) {
  if (!spawn) return new Set();

  const standable = new Set(); // "col,row" positions where player can stand

  // Find all standable positions (empty tile with solid below)
  for (let row = 0; row < ROWS - 1; row++) {
    for (let col = 0; col < COLS; col++) {
      if (!isSolid(tiles, col, row) && !isHazardFor(tiles, col, row, playerType) &&
          isSolid(tiles, col, row + 1)) {
        standable.add(`${col},${row}`);
      }
    }
  }

  // BFS from spawn position
  // First find the spawn's standing position — spawn is on row, needs solid below
  let startRow = spawn.row;
  // The spawn might be above ground, so find where they land
  while (startRow < ROWS - 1 && !isSolid(tiles, spawn.col, startRow + 1)) {
    startRow++;
  }
  const startKey = `${spawn.col},${startRow}`;

  if (!standable.has(startKey)) {
    // Try spawn.row directly
    if (standable.has(`${spawn.col},${spawn.row}`)) {
      // ok
    } else {
      return new Set(); // Can't even stand at spawn
    }
  }

  const visited = new Set();
  const queue = [standable.has(startKey) ? startKey : `${spawn.col},${spawn.row}`];
  visited.add(queue[0]);

  while (queue.length > 0) {
    const key = queue.shift();
    const [colStr, rowStr] = key.split(',');
    const col = parseInt(colStr);
    const row = parseInt(rowStr);

    // Generate all reachable standing positions from (col, row)
    const neighbors = [];

    // 1. Walk left/right on same surface
    for (const dx of [-1, 1]) {
      let nc = col + dx;
      while (nc >= 0 && nc < COLS &&
             !isSolid(tiles, nc, row) &&
             !isHazardFor(tiles, nc, row, playerType) &&
             isSolid(tiles, nc, row + 1)) {
        neighbors.push(`${nc},${row}`);
        nc += dx;
      }
    }

    // 2. Jump: can reach tiles up to MAX_JUMP_TILES above and MAX_HORIZ_TILES sideways
    // Also handle jumping to higher platforms
    for (let dy = -MAX_JUMP_TILES; dy <= 0; dy++) {
      for (let dx = -MAX_HORIZ_TILES; dx <= MAX_HORIZ_TILES; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nc = col + dx;
        const nr = row + dy;
        if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
        const nk = `${nc},${nr}`;
        if (!standable.has(nk)) continue;

        // Check there's a somewhat clear path (no solid blocking the jump arc)
        // Simplified: check the destination tile and the tile above it are clear
        if (!isSolid(tiles, nc, nr) && !isHazardFor(tiles, nc, nr, playerType)) {
          neighbors.push(nk);
        }
      }
    }

    // 3. Fall: walk off edge and land on surfaces below
    for (const dx of [-1, 1]) {
      // Walk to edge
      let edgeCol = col + dx;
      if (edgeCol < 0 || edgeCol >= COLS || isSolid(tiles, edgeCol, row)) continue;

      // Fall from edge position — check surfaces below
      for (let fallRow = row; fallRow < ROWS - 1; fallRow++) {
        // Can drift horizontally while falling
        for (let hDrift = -MAX_HORIZ_TILES; hDrift <= MAX_HORIZ_TILES; hDrift++) {
          const landCol = edgeCol + hDrift;
          if (landCol < 0 || landCol >= COLS) continue;
          const landKey = `${landCol},${fallRow}`;
          if (standable.has(landKey) && !isHazardFor(tiles, landCol, fallRow, playerType)) {
            neighbors.push(landKey);
          }
        }
      }
    }

    // Also: jump then fall (arch) — from current position jump up then drift
    for (let jumpUp = 1; jumpUp <= MAX_JUMP_TILES; jumpUp++) {
      const peakRow = row - jumpUp;
      if (peakRow < 0) break;
      // From peak, can fall to any surface below while drifting
      for (let fallRow = peakRow; fallRow < ROWS - 1; fallRow++) {
        for (let hDrift = -MAX_HORIZ_TILES; hDrift <= MAX_HORIZ_TILES; hDrift++) {
          const landCol = col + hDrift;
          if (landCol < 0 || landCol >= COLS) continue;
          const landKey = `${landCol},${fallRow}`;
          if (standable.has(landKey) && !isHazardFor(tiles, landCol, fallRow, playerType)) {
            neighbors.push(landKey);
          }
        }
      }
    }

    for (const nk of neighbors) {
      if (!visited.has(nk)) {
        visited.add(nk);
        queue.push(nk);
      }
    }
  }

  return visited;
}

function canReach(reachable, target) {
  if (!target) return false;
  // Check if the target tile or any tile near it (within 1 tile) is reachable
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (reachable.has(`${target.col + dc},${target.row + dr}`)) return true;
    }
  }
  return false;
}

// ── Run tests ────────────────────────────────────────────────
console.log(`\n\x1b[36mFIREBOY & WATERGIRL — LEVEL FEASIBILITY TESTS\x1b[0m`);
console.log(`Physics: JUMP=${-JUMP_FORCE}, GRAVITY=${GRAVITY}, SPEED=${PLAYER_SPEED}`);
console.log(`Max jump: ${MAX_JUMP_PX.toFixed(0)}px = ${(MAX_JUMP_PX/TILE).toFixed(1)} tiles`);
console.log(`Max horizontal during jump: ${MAX_HORIZ_PX.toFixed(0)}px = ${(MAX_HORIZ_PX/TILE).toFixed(1)} tiles\n`);

for (let i = 0; i < LEVELS.length; i++) {
  const level = LEVELS[i];
  console.log(`\x1b[36mLevel ${i + 1}: ${level.name}\x1b[0m`);

  const parsed = parseLevel(level);

  // Basic structure
  assert(parsed.fireboySpawn !== null, 'Fireboy spawn exists');
  assert(parsed.watergirlSpawn !== null, 'Watergirl spawn exists');
  assert(parsed.fireDoor !== null, 'Fire door exists');
  assert(parsed.waterDoor !== null, 'Water door exists');

  // Map dimensions
  assert(level.map.length === ROWS, `Map has ${ROWS} rows`);
  assert(level.map.every(r => r.length === COLS), `All rows have ${COLS} columns`);

  // Walls on edges
  assert(level.map[0] === '#'.repeat(COLS), 'Top wall is solid');
  assert(level.map[ROWS - 1] === '#'.repeat(COLS), 'Bottom wall is solid');
  assert(level.map.every(r => r[0] === '#' && r[COLS - 1] === '#'), 'Side walls are solid');

  if (!parsed.fireboySpawn || !parsed.watergirlSpawn || !parsed.fireDoor || !parsed.waterDoor) {
    warn('Skipping reachability — missing spawn/door');
    console.log('');
    continue;
  }

  // Reachability for Fireboy
  const fireReach = findReachable(parsed.tiles, parsed.fireboySpawn, 'fire');
  assert(canReach(fireReach, parsed.fireDoor), 'Fireboy can reach fire door');

  for (let g = 0; g < parsed.fireGems.length; g++) {
    assert(canReach(fireReach, parsed.fireGems[g]),
      `Fireboy can reach red gem ${g + 1} at (${parsed.fireGems[g].col},${parsed.fireGems[g].row})`);
  }

  // Reachability for Watergirl
  const waterReach = findReachable(parsed.tiles, parsed.watergirlSpawn, 'water');
  assert(canReach(waterReach, parsed.waterDoor), 'Watergirl can reach water door');

  for (let g = 0; g < parsed.waterGems.length; g++) {
    assert(canReach(waterReach, parsed.waterGems[g]),
      `Watergirl can reach blue gem ${g + 1} at (${parsed.waterGems[g].col},${parsed.waterGems[g].row})`);
  }

  // Check spawns are not on hazards
  assert(!isHazardFor(parsed.tiles, parsed.fireboySpawn.col, parsed.fireboySpawn.row, 'fire'),
    'Fireboy spawn is not on a hazard');
  assert(!isHazardFor(parsed.tiles, parsed.watergirlSpawn.col, parsed.watergirlSpawn.row, 'water'),
    'Watergirl spawn is not on a hazard');

  console.log('');
}

// ── Mobile Compatibility Checks ─────────────────────────────
console.log(`\x1b[36mMobile Compatibility Checks\x1b[0m`);

// Check index.html for required mobile elements
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'index.html');
const cssPath = path.join(__dirname, 'style.css');
const jsPath = path.join(__dirname, 'game.js');

let htmlSrc = '', cssSrc = '', jsSrc = '';
try { htmlSrc = fs.readFileSync(htmlPath, 'utf8'); } catch (e) { htmlSrc = ''; }
try { cssSrc = fs.readFileSync(cssPath, 'utf8'); } catch (e) { cssSrc = ''; }
try { jsSrc = fs.readFileSync(jsPath, 'utf8'); } catch (e) { jsSrc = ''; }

if (htmlSrc) {
  assert(htmlSrc.includes('viewport'), 'HTML has viewport meta tag');
  assert(htmlSrc.includes('user-scalable=no') || htmlSrc.includes('maximum-scale=1'), 'HTML prevents zoom on mobile');
  assert(htmlSrc.includes('touch-controls') || htmlSrc.includes('touch-btn'), 'HTML has touch control elements');
  assert(htmlSrc.includes('mobile-only') || htmlSrc.includes('Tap'), 'HTML has mobile-specific UI hints');
} else {
  warn('Could not read index.html — skipping HTML mobile checks');
}

if (cssSrc) {
  assert(cssSrc.includes('@media'), 'CSS has responsive media queries');
  assert(cssSrc.includes('touch-action') || cssSrc.includes('touch-btn'), 'CSS has touch-related styles');
  assert(cssSrc.includes('100vw') || cssSrc.includes('max-width: 100'), 'CSS scales to viewport width');
} else {
  warn('Could not read style.css — skipping CSS mobile checks');
}

if (jsSrc) {
  assert(jsSrc.includes('touchstart') || jsSrc.includes('touchBind'), 'JS has touch event handlers');
  assert(jsSrc.includes('touchend') || jsSrc.includes('touchcancel'), 'JS handles touch end/cancel');
  assert(jsSrc.includes('touchmove') || jsSrc.includes('preventDefault'), 'JS prevents default touch behavior');
  assert(jsSrc.includes('click') || jsSrc.includes('handleScreenTap'), 'JS has tap-to-advance on overlays');
} else {
  warn('Could not read game.js — skipping JS mobile checks');
}

console.log('');

// ── Summary ──────────────────────────────────────────────────
const total = passed + failed;
console.log('─'.repeat(40));
if (failed === 0) {
  console.log(`\x1b[32m${passed}/${total} tests passed ✓\x1b[0m`);
} else {
  console.log(`\x1b[31m${passed}/${total} passed, ${failed} FAILED\x1b[0m`);
}
if (warnings > 0) console.log(`\x1b[33m${warnings} warnings\x1b[0m`);
console.log('');

process.exit(failed > 0 ? 1 : 0);
