/* ==========================================================
   adinkra.js: Adinkra symbols drifting down behind the page.
   - Three depth layers, blur baked into sprites once (no per-frame filters).
   - Dimmed inside the reading column so text keeps its contrast.
   - Fades out near the bottom of the screen once the footer is in view.
   - Pauses when the tab is hidden; a still scatter under reduced motion.
   Density: <body data-glyph-density="0.4"> (default 1).
   ========================================================== */
(function () {
  const canvas = document.getElementById('bg');
  const GLYPHS = window.ADINKRA_GLYPHS;
  if (!canvas || !canvas.getContext || !GLYPHS || !window.Path2D) return;

  try {
    const ctx = canvas.getContext('2d');
    const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    const density = parseFloat(document.body.dataset.glyphDensity || '1') || 1;
    const paths = GLYPHS.map((g) => new Path2D(g.d));

    // far, mid, near
    const LAYERS = [
      { min: 14, max: 22, blur: 3.5, alpha: 0.22, speed: 0.16, sway: 6 },
      { min: 24, max: 34, blur: 1.2, alpha: 0.32, speed: 0.3, sway: 10 },
      { min: 36, max: 52, blur: 0, alpha: 0.45, speed: 0.5, sway: 14 },
    ];
    const COLUMN_HALF = 280; // half of the dimmed band around the 520px column
    const COLUMN_EDGE = 70; // soft edge of that band
    const PUSH_RADIUS = 120;

    let W = 0, H = 0, dpr = 1;
    let sprites = []; // sprites[glyph][layer][colour]
    let particles = [];
    let raf = 0;
    let last = 0;
    let pointer = { x: -9999, y: -9999 };
    let footerVisible = false;
    let fade = 0; // eased 0..1 version of footerVisible

    function palette() {
      const s = getComputedStyle(document.documentElement);
      return ['--glyph-1', '--glyph-2', '--glyph-3'].map(
        (v) => s.getPropertyValue(v).trim() || '#d4a24c'
      );
    }

    function buildSprites() {
      const colours = palette();
      const supportsFilter = 'filter' in ctx;
      sprites = paths.map((path) =>
        LAYERS.map((layer) =>
          colours.map((colour) => {
            const pad = Math.ceil(layer.blur * 3) + 4;
            const size = Math.ceil((layer.max + pad * 2) * dpr);
            const c = document.createElement('canvas');
            c.width = c.height = size;
            const g = c.getContext('2d');
            if (supportsFilter && layer.blur) g.filter = `blur(${layer.blur * dpr}px)`;
            const scale = (layer.max * dpr) / 100;
            g.translate(pad * dpr, pad * dpr);
            g.scale(scale, scale);
            g.strokeStyle = colour;
            g.lineWidth = 6.5;
            g.lineCap = 'round';
            g.lineJoin = 'round';
            g.stroke(path);
            return { canvas: c, pad };
          })
        )
      );
    }

    function rand(a, b) {
      return a + Math.random() * (b - a);
    }

    function spawn(p, anywhere) {
      const layerIndex = Math.random() < 0.45 ? 0 : Math.random() < 0.6 ? 1 : 2;
      const layer = LAYERS[layerIndex];
      p.layer = layerIndex;
      p.glyph = (Math.random() * paths.length) | 0;
      p.colour = (Math.random() * 3) | 0;
      p.size = rand(layer.min, layer.max);
      p.x = rand(-20, W + 20);
      p.y = anywhere ? rand(-60, H) : rand(-120, -60);
      p.ox = 0; // pointer offset, eases back to 0
      p.phase = rand(0, Math.PI * 2);
      p.freq = rand(0.0006, 0.0012);
      p.rot = rand(0, Math.PI * 2);
      p.vr = rand(-0.004, 0.004);
      p.vy = layer.speed * rand(0.8, 1.2);
      return p;
    }

    function targetCount() {
      return Math.round((W < 640 ? 20 : 45) * density);
    }

    function resize(force) {
      const nw = innerWidth;
      const nh = innerHeight;
      const ndpr = Math.min(devicePixelRatio || 1, 2);
      // Phones fire resize as the address bar slides; ignore small height-only changes.
      if (!force && nw === W && Math.abs(nh - H) < 120 && ndpr === dpr) return;
      const dprChanged = ndpr !== dpr;
      W = nw;
      H = nh;
      dpr = ndpr;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      if (dprChanged || !sprites.length) buildSprites();
      const want = targetCount();
      while (particles.length < want) particles.push(spawn({}, true));
      particles.length = want;
      for (const p of particles) if (p.x > W + 40) p.x = rand(0, W);
      if (!running()) drawFrame(0, 0);
    }

    function alphaFor(p, x, y) {
      let a = LAYERS[p.layer].alpha;
      // Dim inside the reading column.
      const dx = Math.abs(x - W / 2);
      if (dx < COLUMN_HALF + COLUMN_EDGE) {
        const t = Math.max(0, Math.min(1, (dx - COLUMN_HALF) / COLUMN_EDGE));
        a *= 0.35 + 0.65 * t;
      }
      // Fade toward the bottom when the footer is on screen.
      if (fade > 0) {
        const start = H * 0.82;
        if (y > start) a *= 1 - fade * Math.min(1, (y - start) / (H * 0.18));
      }
      return a;
    }

    function drawFrame(dt, now) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const k = dt / 16.67;
      if (k) fade += ((footerVisible ? 1 : 0) - fade) * Math.min(1, 0.05 * k);
      else fade = footerVisible ? 1 : 0;

      for (const p of particles) {
        const layer = LAYERS[p.layer];
        if (k) {
          p.y += p.vy * k;
          p.rot += p.vr * k;
          if (p.layer === 2) {
            const dx = p.x + p.ox - pointer.x;
            const dy = p.y - pointer.y;
            const d = Math.hypot(dx, dy);
            if (d < PUSH_RADIUS && d > 0.01) p.ox += (dx / d) * (PUSH_RADIUS - d) * 0.04 * k;
          }
          p.ox *= Math.pow(0.97, k);
          if (p.y > H + 70) spawn(p, false);
        }
        const x = p.x + p.ox + Math.sin(now * p.freq + p.phase) * layer.sway;
        const y = p.y;
        const a = alphaFor(p, x, y);
        if (a <= 0.01) continue;

        const s = sprites[p.glyph][p.layer][p.colour];
        const scale = p.size / layer.max;
        const full = (layer.max + s.pad * 2) * scale; // css px
        ctx.globalAlpha = a;
        ctx.setTransform(dpr, 0, 0, dpr, x * dpr, y * dpr);
        ctx.rotate(p.rot);
        ctx.drawImage(s.canvas, -full / 2, -full / 2, full, full);
      }
      ctx.globalAlpha = 1;
    }

    function loop(now) {
      const dt = last ? Math.min(now - last, 50) : 16.67;
      last = now;
      try {
        drawFrame(dt, now);
      } catch (err) {
        raf = 0;
        canvas.style.display = 'none';
        return;
      }
      raf = requestAnimationFrame(loop);
    }

    function running() {
      return raf !== 0;
    }
    function start() {
      if (running() || motionQuery.matches || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(loop);
    }
    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    // ---- wiring ----
    resize(true);
    if (motionQuery.matches) drawFrame(0, 0);
    start();

    let resizeTimer = 0;
    addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => resize(false), 150);
    });
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    motionQuery.addEventListener?.('change', () => {
      if (motionQuery.matches) {
        stop();
        drawFrame(0, 0);
      } else start();
    });
    addEventListener(
      'pointermove',
      (e) => {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
      },
      { passive: true }
    );
    const clearPointer = () => {
      pointer.x = pointer.y = -9999;
    };
    addEventListener('pointerup', (e) => e.pointerType !== 'mouse' && clearPointer(), { passive: true });
    addEventListener('pointercancel', clearPointer, { passive: true });
    document.addEventListener('pointerout', (e) => !e.relatedTarget && clearPointer());
    addEventListener('themechange', () => {
      buildSprites();
      if (!running()) drawFrame(0, 0);
    });

    const footer = document.querySelector('.footer');
    if (footer && 'IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        footerVisible = entries[0].isIntersecting;
        if (!running()) drawFrame(0, 0);
      }).observe(footer);
    }
  } catch (err) {
    canvas.style.display = 'none';
  }
})();
