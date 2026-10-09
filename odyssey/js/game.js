/* ==========================================================
   game.js: Knock my name off the poster.
   Breakout where the bricks are the real poster type. The
   collision grid is invisible; each brick you hit bites its
   chunk out of the name, and the chunk falls away.
   ========================================================== */
(function () {
  const FIELD = '#2f36e0';
  const CHALK = '#eef0f3';
  const DT = 1 / 120;
  const BEST_KEY = 'pa-poster-breakout-best';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const $ = (id) => document.getElementById(id);
  const scoreEl = $('score');
  const livesEl = $('lives');
  const progressEl = $('progress');
  const toastEl = $('toast');
  const statusEl = $('status');
  const soundBtn = $('sound');
  const pauseBtn = $('pause');

  /* ---------- Ways out ---------- */
  function leave(e) {
    let sameSite = false;
    try {
      sameSite = !!document.referrer && new URL(document.referrer).origin === location.origin;
    } catch (err) { /* external */ }
    if (sameSite && history.length > 1) {
      if (e) e.preventDefault();
      history.back();
    }
  }
  document.querySelectorAll('[data-back]').forEach((a) => a.addEventListener('click', leave));

  /* ---------- Best score ---------- */
  function readBest() {
    try { return parseInt(localStorage.getItem(BEST_KEY), 10) || 0; } catch (e) { return 0; }
  }
  function writeBest(v) {
    try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) { /* private mode */ }
  }
  const fmt = (n) => n.toLocaleString('en-US');

  /* ---------- Sound (off until asked for) ---------- */
  let audio = null;
  let soundOn = false;
  function blip(freq, dur = 0.07, type = 'triangle', vol = 0.08) {
    if (!soundOn || !audio) return;
    const t = audio.currentTime;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(audio.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    if (soundOn && !audio) {
      try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { soundOn = false; }
    }
    if (audio && audio.state === 'suspended') audio.resume();
    soundBtn.textContent = soundOn ? 'Sound on' : 'Sound off';
    soundBtn.setAttribute('aria-pressed', String(soundOn));
    blip(660);
    soundBtn.blur();
  });

  /* ---------- World ---------- */
  let W = 0;
  let H = 0;
  let dpr = 1;
  const nameImg = new Image();
  const nameLayer = document.createElement('canvas');
  const nameCtx = nameLayer.getContext('2d', { willReadFrequently: true });
  const name = { x: 0, y: 0, w: 0, h: 0 };
  let cell = 24;
  let cols = 0;
  let rows = 0;
  let alive = new Uint8Array(0);
  let total = 0;
  let left = 0;

  const paddle = { x: 0, y: 0, w: 120, h: 12, squash: 0, placed: false };
  const ball = { x: 0, y: 0, vx: 0, vy: 0, r: 7, px: 0, py: 0 };
  const trail = [];
  let baseSpeed = 400;
  let speedMul = 1;

  let state = 'menu'; // menu | ready | play | paused | over | won
  let resumeTo = 'ready';
  let score = 0;
  let lives = 3;
  let combo = 0;
  let broken = 0;
  let shake = 0;

  let winTimer = 0;
  const particles = [];
  const popups = [];

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    const gutter = W >= 1200 ? 48 : W >= 768 ? 32 : 16;
    const aspect = nameImg.naturalWidth / nameImg.naturalHeight || 2.56;
    let nw = Math.min(W - gutter * 2, 1320);
    let nh = nw / aspect;
    if (nh > H * 0.4) {
      nh = H * 0.4;
      nw = nh * aspect;
    }
    name.w = nw;
    name.h = nh;
    name.x = (W - nw) / 2;
    name.y = Math.max(76, H * 0.13);

    paddle.w = Math.max(90, Math.min(170, W * 0.16));
    paddle.h = 12;
    paddle.y = H - Math.max(56, H * 0.13);
    if (!paddle.placed) {
      paddle.x = (W - paddle.w) / 2;
      paddle.placed = true;
    }
    paddle.x = Math.min(Math.max(paddle.x, 0), W - paddle.w);
    ball.r = Math.max(6, Math.min(9, Math.min(W, H) * 0.009));
    baseSpeed = Math.max(320, Math.min(640, Math.min(W, H) * 0.75));

    buildBricks(cols === 0);
  }

  // Draw the real name. A fresh board samples it into an invisible grid; a resize keeps
  // the same grid (same columns, same broken bricks) and only redraws it at the new size.
  function buildBricks(fresh) {
    nameLayer.width = Math.max(1, Math.round(name.w * dpr));
    nameLayer.height = Math.max(1, Math.round(name.h * dpr));
    nameCtx.clearRect(0, 0, nameLayer.width, nameLayer.height);
    nameCtx.drawImage(nameImg, 0, 0, nameLayer.width, nameLayer.height);

    if (fresh) {
      const minCell = coarse ? 18 : 24;
      cols = Math.ceil(name.w / Math.max(minCell, Math.sqrt((name.w * name.h * 0.42) / 95)));
    }
    cell = name.w / cols;
    const newRows = Math.ceil(name.h / cell - 1e-6);

    if (fresh || newRows !== rows) {
      rows = newRows;
      alive = new Uint8Array(cols * rows);
      const data = nameCtx.getImageData(0, 0, nameLayer.width, nameLayer.height).data;
      const lw = nameLayer.width;
      const lh = nameLayer.height;
      const cs = cell * dpr;
      const stride = Math.max(1, Math.floor(cs / 8));
      total = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let ink = 0;
          let n = 0;
          const x0 = Math.floor(c * cs);
          const y0 = Math.floor(r * cs);
          for (let y = y0; y < Math.min(lh, y0 + cs); y += stride) {
            for (let x = x0; x < Math.min(lw, x0 + cs); x += stride) {
              n++;
              if (data[(y * lw + x) * 4 + 3] > 100) ink++;
            }
          }
          // slivers too thin to aim at are trimmed below, so the board can always be cleared
          if (n && ink / n >= 0.12) {
            alive[r * cols + c] = 1;
            total++;
          }
        }
      }
      left = total;
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) if (!alive[r * cols + c]) clearCell(c, r);
    }
    updateHud();
  }

  function clearCell(c, r) {
    const cs = cell * dpr;
    nameCtx.clearRect(Math.floor(c * cs) - 1, Math.floor(r * cs) - 1, Math.ceil(cs) + 2, Math.ceil(cs) + 2);
  }

  /* ---------- Bricks ---------- */
  function cellAt(x, y) {
    const c = Math.floor((x - name.x) / cell);
    const r = Math.floor((y - name.y) / cell);
    if (c < 0 || r < 0 || c >= cols || r >= rows) return -1;
    return r * cols + c;
  }

  // first live brick under the ball's box
  function hitBrick() {
    const x0 = ball.x - ball.r;
    const x1 = ball.x + ball.r;
    const y0 = ball.y - ball.r;
    const y1 = ball.y + ball.r;
    if (x1 < name.x || x0 > name.x + name.w || y1 < name.y || y0 > name.y + name.h) return -1;
    let best = -1;
    let bestD = Infinity;
    for (const yy of [y0, ball.y, y1]) {
      for (const xx of [x0, ball.x, x1]) {
        const i = cellAt(xx, yy);
        if (i >= 0 && alive[i]) {
          const cx = name.x + ((i % cols) + 0.5) * cell;
          const cy = name.y + (Math.floor(i / cols) + 0.5) * cell;
          const d = (cx - ball.x) ** 2 + (cy - ball.y) ** 2;
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
      }
    }
    return best;
  }

  function breakBrick(i) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    alive[i] = 0;
    left--;
    broken++;
    combo++;
    const mult = Math.min(5, 1 + Math.floor(combo / 5));
    const pts = 10 * mult;
    score += pts;

    const cx = name.x + c * cell;
    const cy = name.y + r * cell;
    if (!reduceMotion && particles.length < 70) {
      // lift the chunk of type off the layer and let it fall
      const cs = Math.ceil(cell * dpr);
      const chip = document.createElement('canvas');
      chip.width = cs;
      chip.height = cs;
      chip.getContext('2d').drawImage(nameLayer, Math.floor(c * cell * dpr), Math.floor(r * cell * dpr), cs, cs, 0, 0, cs, cs);
      particles.push({
        img: chip,
        x: cx + cell / 2,
        y: cy + cell / 2,
        vx: (Math.random() - 0.5) * 160 + ball.vx * 0.15,
        vy: -120 - Math.random() * 160,
        rot: 0,
        vr: (Math.random() - 0.5) * 8,
        life: 1.4,
      });
      shake = Math.min(6, shake + 1.6);
    }
    clearCell(c, r);
    popups.push({ text: '+' + pts, x: cx + cell / 2, y: cy, life: 0.8, big: false });
    if (combo % 5 === 0 && mult > 1) {
      popups.push({ text: '×' + mult, x: cx + cell / 2, y: cy - 18, life: 1.1, big: true });
    }
    if (broken % 10 === 0) speedMul = Math.min(1.45, speedMul * 1.02);
    blip(330 * Math.pow(2, Math.min(combo, 15) / 12), 0.06);
    updateHud();

    if (left <= 0) {
      state = 'won';
      clearTimeout(winTimer);
      winTimer = setTimeout(win, 700);
    }
  }

  /* ---------- Ball ---------- */
  function speed() {
    return baseSpeed * speedMul;
  }
  function setVelocity(angle) {
    // angle 0 = straight up; never let the ball go too flat to make progress
    const a = Math.max(-1.05, Math.min(1.05, angle));
    ball.vx = Math.sin(a) * speed();
    ball.vy = -Math.cos(a) * speed();
  }
  function keepLively() {
    const s = speed();
    const len = Math.hypot(ball.vx, ball.vy) || 1;
    ball.vx = (ball.vx / len) * s;
    ball.vy = (ball.vy / len) * s;
    if (Math.abs(ball.vy) < s * 0.3) {
      ball.vy = Math.sign(ball.vy || -1) * s * 0.3;
      ball.vx = Math.sign(ball.vx || 1) * Math.sqrt(s * s - ball.vy * ball.vy);
    }
  }
  function restOnPaddle() {
    ball.x = paddle.x + paddle.w / 2;
    ball.y = paddle.y - ball.r - 1;
    ball.px = ball.x;
    ball.py = ball.y;
    trail.length = 0;
  }
  function launch() {
    if (state !== 'ready') return;
    state = 'play';
    combo = 0;
    setVelocity((Math.random() - 0.5) * 0.6);
    blip(520, 0.08);
  }

  function step(dt) {
    // paddle from keys
    const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (dir) paddle.x += dir * W * 1.15 * dt;
    paddle.x = Math.min(Math.max(paddle.x, 0), W - paddle.w);
    paddle.squash = Math.max(0, paddle.squash - dt * 5);

    ball.px = ball.x;
    ball.py = ball.y;

    if (state === 'ready' || state === 'menu') {
      restOnPaddle();
    } else if (state === 'play') {
      const dist = speed() * dt;
      const maxStep = Math.max(1.5, cell * 0.5 - ball.r);
      const n = Math.max(1, Math.ceil(dist / maxStep));
      const h = dt / n;
      for (let k = 0; k < n && state === 'play'; k++) {
        // x first, then y, so a corner hit flips one axis at a time
        ball.x += ball.vx * h;
        if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); blip(200, 0.03); }
        if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); blip(200, 0.03); }
        let i = hitBrick();
        if (i >= 0) {
          ball.x -= ball.vx * h;
          ball.vx = -ball.vx;
          breakBrick(i);
        }

        ball.y += ball.vy * h;
        if (ball.y - ball.r < 4) { ball.y = 4 + ball.r; ball.vy = Math.abs(ball.vy); blip(200, 0.03); }
        i = hitBrick();
        if (i >= 0 && state === 'play') {
          ball.y -= ball.vy * h;
          ball.vy = -ball.vy;
          breakBrick(i);
        }

        // paddle: only when falling, and snap on top so it can't stick inside
        if (
          ball.vy > 0 &&
          ball.y + ball.r >= paddle.y &&
          ball.y - ball.r <= paddle.y + paddle.h &&
          ball.x >= paddle.x - ball.r &&
          ball.x <= paddle.x + paddle.w + ball.r
        ) {
          ball.y = paddle.y - ball.r;
          const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
          setVelocity(hit * 1.05);
          combo = 0;
          paddle.squash = 1;
          blip(220, 0.06, 'square', 0.05);
        }

        if (ball.y - ball.r > H) {
          loseBall();
          break;
        }
      }
      if (state === 'play') keepLively();
    }

    // trail
    if (state === 'play' && !reduceMotion) {
      trail.push([ball.x, ball.y]);
      if (trail.length > 7) trail.shift();
    }

    // particles + popups
    for (let k = particles.length - 1; k >= 0; k--) {
      const p = particles[k];
      p.vy += 1500 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.life -= dt;
      if (p.life <= 0 || p.y > H + 60) particles.splice(k, 1);
    }
    for (let k = popups.length - 1; k >= 0; k--) {
      const p = popups[k];
      p.y -= 40 * dt;
      p.life -= dt;
      if (p.life <= 0) popups.splice(k, 1);
    }
    shake = Math.max(0, shake - dt * 30);
  }

  /* ---------- Lives, winning, losing ---------- */
  function loseBall() {
    lives--;
    combo = 0;
    trail.length = 0;
    blip(150, 0.25, 'sawtooth', 0.05);
    updateHud();
    if (lives <= 0) {
      state = 'over';
      gameOver();
      return;
    }
    state = 'ready';
    restOnPaddle();
    toast(lives === 1 ? 'Last ball' : `${lives} left`);
    say(lives === 1 ? 'Ball lost. Last ball.' : `Ball lost. ${lives} balls left.`);
  }

  function finishScore() {
    const best = readBest();
    const isBest = score > best;
    if (isBest) writeBest(score);
    return { best: Math.max(best, score), isBest };
  }

  function gameOver() {
    const { best, isBest } = finishScore();
    $('over-score').textContent = isBest
      ? `You scored ${fmt(score)}, your best yet. ${fmt(left)} of ${fmt(total)} bricks still standing.`
      : `You scored ${fmt(score)}. Your best is ${fmt(best)}. ${fmt(left)} of ${fmt(total)} bricks still standing.`;
    show('screen-over');
    say(`Out of balls. You scored ${fmt(score)}.`);
  }

  function win() {
    if (state !== 'won') return;
    const bonus = lives * 250;
    score += bonus;
    updateHud();
    const { isBest } = finishScore();
    $('won-score').textContent = `${fmt(score)} points, including ${fmt(bonus)} for the ${lives === 1 ? 'ball' : 'balls'} you had left.${isBest ? ' Your best yet.' : ''}`;
    show('screen-won');
    say(`You cleared the poster with ${fmt(score)} points.`);
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.14), i * 110));
  }

  /* ---------- HUD + screens ---------- */
  function updateHud() {
    scoreEl.textContent = fmt(score);
    livesEl.querySelectorAll('i').forEach((el, i) => el.classList.toggle('is-gone', i >= lives));
    livesEl.setAttribute('aria-label', `${lives} ${lives === 1 ? 'ball' : 'balls'} left`);
    progressEl.style.transform = `scaleX(${total ? left / total : 1})`;
  }

  let toastTimer = 0;
  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 1100);
  }
  function say(text) {
    statusEl.textContent = text;
  }

  let focusTimer = 0;
  function show(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('is-on', s.id === id));
    document.body.classList.toggle('is-menu', !!id);
    pauseBtn.hidden = !!id && id !== 'screen-pause';
    clearTimeout(focusTimer);
    if (id) {
      const first = $(id).querySelector('.btn');
      if (first) focusTimer = setTimeout(() => first.focus({ preventScroll: true }), 50);
    }
  }

  function startGame() {
    score = 0;
    lives = 3;
    combo = 0;
    broken = 0;
    speedMul = 1;
    clearTimeout(winTimer);
    particles.length = 0;
    popups.length = 0;
    buildBricks(true);
    state = 'ready';
    restOnPaddle();
    updateHud();
    show(null);
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    say('Game started. Press Space or tap to launch.');
  }

  function pause(note) {
    if (state !== 'play' && state !== 'ready') return;
    resumeTo = state;
    state = 'paused';
    keys.left = keys.right = false;
    drag = null;
    $('pause-note').textContent = note || (coarse ? 'Tap Resume to carry on.' : 'Press P or Esc to carry on.');
    show('screen-pause');
    pauseBtn.textContent = 'Resume';
  }
  function resume() {
    if (state !== 'paused') return;
    state = resumeTo;
    show(null);
    pauseBtn.textContent = 'Pause';
    last = performance.now();
  }

  document.querySelectorAll('[data-action]').forEach((b) =>
    b.addEventListener('click', () => {
      const a = b.dataset.action;
      if (a === 'play' || a === 'restart') {
        pauseBtn.textContent = 'Pause';
        startGame();
      } else if (a === 'resume') {
        resume();
      }
    })
  );
  pauseBtn.addEventListener('click', () => {
    pauseBtn.blur();
    if (state === 'paused') resume();
    else pause();
  });

  /* ---------- Input ---------- */
  const keys = { left: false, right: false };
  window.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keys.left = true; e.preventDefault(); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.right = true; e.preventDefault(); }
    else if (k === ' ' && !document.querySelector('.screen.is-on')) {
      e.preventDefault();
      if (!e.repeat) launch();
    }
    else if (k === 'p' || k === 'P' || k === 'Escape') {
      if (state === 'paused') resume();
      else pause();
    } else if ((k === 'r' || k === 'R') && !e.repeat && state !== 'menu' && state !== 'won' && !e.metaKey && !e.ctrlKey) {
      pauseBtn.textContent = 'Pause';
      startGame();
    }
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = false;
    if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
  });

  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (drag || document.querySelector('.screen.is-on')) return;
    canvas.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, px: paddle.x, moved: 0, type: e.pointerType };
    if (audio && audio.state === 'suspended') audio.resume();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') {
      paddle.x = e.clientX - paddle.w / 2;
    } else if (drag && drag.id === e.pointerId) {
      // relative drag, so a thumb never hides the paddle
      paddle.x = drag.px + (e.clientX - drag.sx) * 1.25;
    }
    if (drag && drag.id === e.pointerId) {
      drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy));
    }
  });
  const endDrag = (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    if (e.type === 'pointerup' && drag.moved < 8) launch();
    drag = null;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  window.addEventListener('blur', () => {
    keys.left = keys.right = false;
    pause();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const wasPlaying = state === 'play' || (state === 'paused' && resumeTo === 'play');
      layout();
      if (state === 'ready' || state === 'menu') restOnPaddle();
      if (wasPlaying) {
        // put the ball back in open space between the name and the paddle
        ball.x = Math.min(Math.max(ball.x, ball.r), W - ball.r);
        ball.y = Math.min(Math.max(ball.y, name.y + name.h + ball.r + 4), paddle.y - 40);
        ball.vy = Math.abs(ball.vy);
        ball.px = ball.x;
        ball.py = ball.y;
        trail.length = 0;
        if (state === 'play') pause('Paused because the window changed size.');
        else $('pause-note').textContent = 'Paused because the window changed size.';
      }
    }, 120);
  });

  /* ---------- Render ---------- */
  function diamond(x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y - r * 1.25);
    ctx.lineTo(x + r * 1.25, y);
    ctx.lineTo(x, y + r * 1.25);
    ctx.lineTo(x - r * 1.25, y);
    ctx.closePath();
    ctx.fill();
  }

  function render(alpha, t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = FIELD;
    ctx.fillRect(0, 0, W, H);

    if (shake > 0 && !reduceMotion) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }

    ctx.drawImage(nameLayer, name.x, name.y, name.w, name.h);

    // the last few bricks pulse so they're easy to find
    if (left > 0 && left <= 5 && state === 'play') {
      ctx.strokeStyle = CHALK;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.35 + Math.sin(t * 6) * 0.25;
      for (let i = 0; i < alive.length; i++) {
        if (!alive[i]) continue;
        const pad = 4 + Math.sin(t * 6) * 2;
        ctx.strokeRect(name.x + (i % cols) * cell - pad, name.y + Math.floor(i / cols) * cell - pad, cell + pad * 2, cell + pad * 2);
      }
      ctx.globalAlpha = 1;
    }

    // falling chunks of the name
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life / 0.5);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.drawImage(p.img, -cell / 2, -cell / 2, cell, cell);
      ctx.restore();
    }

    // paddle
    ctx.fillStyle = CHALK;
    const sq = paddle.squash;
    const ph = paddle.h * (1 - sq * 0.35);
    const pw = paddle.w * (1 + sq * 0.06);
    ctx.fillRect(paddle.x - (pw - paddle.w) / 2, paddle.y + (paddle.h - ph), pw, ph);

    // ball
    if (state !== 'over' && state !== 'won') {
      const bx = ball.px + (ball.x - ball.px) * alpha;
      const by = ball.py + (ball.y - ball.py) * alpha;
      trail.forEach(([x, y], i) => {
        ctx.globalAlpha = ((i + 1) / trail.length) * 0.25;
        diamond(x, y, ball.r * (0.6 + (i / trail.length) * 0.4));
      });
      ctx.globalAlpha = 1;
      diamond(bx, by, ball.r);
    }

    // score pops
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of popups) {
      ctx.globalAlpha = Math.min(1, p.life / 0.4);
      ctx.font = `${p.big ? 900 : 700} ${p.big ? 34 : 14}px Archivo, system-ui, sans-serif`;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- Loop ---------- */
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    dt = Math.min(dt, 0.1);
    if (state !== 'paused') {
      acc += dt;
      while (acc >= DT) {
        step(DT);
        acc -= DT;
      }
    }
    render(state === 'play' ? acc / DT : 1, now / 1000);
  }

  /* ---------- Boot ---------- */
  function boot() {
    layout();
    restOnPaddle();
    const best = readBest();
    if (best > 0) {
      const el = $('best-start');
      el.textContent = `Your best so far: ${fmt(best)}.`;
      el.hidden = false;
    }
    show('screen-start');
    requestAnimationFrame((t) => {
      last = t;
      frame(t);
    });
  }
  function failed() {
    const start = $('screen-start');
    start.querySelector('p').textContent = "The game couldn't load its pieces. Refresh the page to try again.";
    start.querySelector('[data-action="play"]').hidden = true;
    show('screen-start');
  }
  nameImg.onload = () =>
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
      try {
        boot();
      } catch (e) {
        failed();
      }
    });
  nameImg.onerror = failed;
  nameImg.src = 'img/name.webp';
})();
