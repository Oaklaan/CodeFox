// Webview renderer. All game logic lives in the Rust/WASM core (webview/pkg).
// This file only: draws the fox, forwards pointer events, and runs the frame loop.

const S = { IDLE: 0, WALK: 1, SPRINT: 2, JUMP: 3, CROUCH: 4, SLEEP: 5 };
const PAL = { O: '#e8742a', W: '#f6efe4', K: '#2b1d17' };

// 18 x 9 pixel body, facing right. Legs are drawn separately.
const BODY = [
  '...........O...O..',
  '..........OOO.OOO.',
  '..........OOOOOOOO',
  '..........OOOKOOOO',
  'WW........OOOOOWWK',
  'OOOO..OOOOOOOOWWW.',
  'OOOOOOOOOOOOOOW...',
  '.OOOOOOOOOOOOO....',
  '..OOWWWWWWOOO.....',
];
const FOX_W = 18;
const BODY_H = 9;
const LEGS = [
  { x: 3, set: 0 },
  { x: 5, set: 1 },
  { x: 9, set: 1 },
  { x: 11, set: 0 },
];

const body = document.body;
const canvas = document.getElementById('fox');
const ctx = canvas.getContext('2d');
const errBox = document.getElementById('err');

let scale = clampScale(Number(body.dataset.scale));
let worldW = 100;
let worldH = 40;
let dpr = 1;
let fox = null;
let lineColor = '#808080';
let frameCount = 0;

function clampScale(v) {
  return Math.min(8, Math.max(2, Math.round(v) || 4));
}

function showError(msg) {
  errBox.hidden = false;
  errBox.textContent = msg;
}

function resize() {
  const r = canvas.getBoundingClientRect();
  dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(r.width * dpr));
  canvas.height = Math.max(1, Math.round(r.height * dpr));
  worldW = r.width / scale;
  worldH = r.height / scale;
  if (fox) fox.set_world_width(worldW);
}

function drawLegs(state, frame) {
  for (const l of LEGS) {
    let dx = 0;
    let tucked = false;
    if (state === S.WALK || state === S.SPRINT) {
      const swing = (frame < 2 ? 1 : -1) * (l.set ? -1 : 1);
      dx = swing * (state === S.SPRINT ? 2 : 1);
    } else if (state === S.JUMP) {
      dx = l.x < 8 ? -1 : 1;
      tucked = true;
    }
    const lx = l.x + dx;
    if (!tucked) {
      ctx.fillStyle = PAL.O;
      ctx.fillRect(lx, -2, 1, 1);
    }
    ctx.fillStyle = PAL.K;
    ctx.fillRect(lx, -1, 1, 1);
  }
}

function drawFox(x, feetY, facing, state, frame) {
  const low = state === S.CROUCH || state === S.SLEEP;
  const legH = low ? 0 : 2;

  ctx.save();
  ctx.translate(x, feetY);
  ctx.scale(facing, 1);
  ctx.translate(-FOX_W / 2, 0);

  const top = -(BODY_H + legH);
  for (let r = 0; r < BODY_H; r++) {
    const row = BODY[r];
    let c = 0;
    while (c < row.length) {
      const ch = row[c];
      if (ch === '.') { c++; continue; }
      let e = c;
      while (e < row.length && row[e] === ch) e++;
      ctx.fillStyle = PAL[ch];
      ctx.fillRect(c, top + r, e - c, 1);
      c = e;
    }
  }
  if (!low) drawLegs(state, frame);
  ctx.restore();

  if (state === S.SLEEP) {
    ctx.fillStyle = lineColor;
    ctx.font = '5px monospace';
    ctx.fillText(Math.floor(performance.now() / 700) % 2 ? 'Z' : 'z', x - 2, feetY - 14);
  }
}

function draw() {
  const k = scale * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(k, 0, 0, k, 0, 0);

  if (frameCount++ % 60 === 0) {
    lineColor =
      getComputedStyle(body).getPropertyValue('--vscode-panel-border').trim() || '#808080';
  }

  const groundY = Math.floor(worldH) - 3;
  ctx.fillStyle = lineColor;
  ctx.fillRect(0, groundY, worldW, 1);

  drawFox(
    Math.round(fox.x()),
    groundY - Math.round(fox.y()),
    fox.facing(),
    fox.state(),
    fox.frame()
  );
}

function bindInput() {
  const toWorldX = (e) => (e.clientX - canvas.getBoundingClientRect().left) / scale;

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    fox.pointer_down(toWorldX(e));
  });
  canvas.addEventListener('pointerup', () => fox.pointer_up());
  canvas.addEventListener('pointercancel', () => fox.pointer_cancel());
}

async function boot() {
  let mod;
  try {
    mod = await import('./pkg/fox_core.js');
    await mod.default(); // loads fox_core_bg.wasm next to the glue file
  } catch (err) {
    showError(
      'Fox core (WASM) could not be loaded. Run "npm run build:wasm" and reload.\n' + err
    );
    return;
  }

  resize();
  fox = new mod.Fox(worldW, (Math.random() * 4294967296) >>> 0);
  fox.set_wander(body.dataset.wander !== 'false');
  bindInput();

  new ResizeObserver(resize).observe(canvas);
  window.addEventListener('message', (ev) => {
    const m = ev.data;
    if (m && m.type === 'config') {
      scale = clampScale(m.scale);
      fox.set_wander(!!m.wander);
      resize();
    }
  });

  let last = performance.now();
  function loop(now) {
    fox.tick(now - last);
    last = now;
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

boot();
