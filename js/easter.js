/* ==========================================================
   easter.js: the door to /odyssey/.
   Ways in:
     - press and hold the ultramarine square in the footer
     - type "odyssey" anywhere, or enter the Konami code
     - the wristwatch in the hero photo points you to the square
   Screen reader and reduced-motion users can open it with a plain
   click or Enter; nobody has to hold anything to get through.
   ========================================================== */
(function () {
  const DEST = 'odyssey/';
  const HOLD_MS = 1200;
  const ODYSSEY_BG = '#2f36e0';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const square = document.getElementById('egg-square');
  const status = document.getElementById('egg-status');
  const watch = document.getElementById('watch');
  let warping = false;

  console.log(
    '%cPA%c\nThis page has a back door. Hold the blue square in the footer, or just type %codyssey%c.',
    'font: 900 28px Archivo, sans-serif; color: #2f36e0;',
    'font: 14px sans-serif;',
    'font: bold 14px monospace; color: #2f36e0;',
    'font: 14px sans-serif;'
  );

  /* ---------- The warp: the square grows to fill the screen ---------- */
  function warp() {
    if (warping) return;
    warping = true;
    if (status) status.textContent = 'Opening the hidden page.';

    if (reduceMotion || !square) {
      window.location.href = DEST;
      return;
    }

    const r = square.getBoundingClientRect();
    const size = 16;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const el = document.createElement('div');
    el.className = 'warp';
    el.style.cssText = `left:${cx - size / 2}px;top:${cy - size / 2}px;width:${size}px;height:${size}px;`;
    document.body.appendChild(el);

    const reach = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy));
    const scale = (reach * 2.2) / size;
    el.animate(
      [
        { transform: 'rotate(45deg) scale(1)', background: '#2f36e0' },
        { transform: `rotate(45deg) scale(${scale * 0.6})`, background: '#2f36e0', offset: 0.55 },
        { transform: `rotate(45deg) scale(${scale})`, background: ODYSSEY_BG },
      ],
      { duration: 1000, easing: 'cubic-bezier(0.7, 0, 0.2, 1)', fill: 'forwards' }
    ).finished.then(() => {
      window.location.href = DEST;
    });
  }

  /* ---------- Press and hold the square ---------- */
  if (square) {
    let start = 0;
    let p = 0;
    let raf = 0;
    let holding = false;
    let pointerUsed = false;
    let pointerType = '';
    let downAt = 0;
    let announced = 0;

    function render() {
      square.style.setProperty('--p', p.toFixed(3));
    }

    function loop(now) {
      if (holding) {
        p = Math.min(1, (now - start) / HOLD_MS);
      } else {
        p = Math.max(0, p - 0.04);
      }
      render();
      const step = Math.floor(p * 4);
      if (holding && step > announced && step < 4) {
        announced = step;
        status.textContent = `${step * 25}%`;
      }
      if (p >= 1) {
        holding = false;
        raf = 0;
        warp();
        return;
      }
      raf = p > 0 || holding ? requestAnimationFrame(loop) : 0;
      if (!raf) square.classList.remove('is-holding');
    }

    function begin() {
      if (warping || holding) return;
      holding = true;
      announced = 0;
      start = performance.now() - p * HOLD_MS;
      square.classList.add('is-holding');
      if (!raf) raf = requestAnimationFrame(loop);
    }
    function end() {
      if (!holding) return;
      holding = false;
      if (p < 1 && status) status.textContent = 'Keep holding to open it.';
    }

    square.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      pointerUsed = true;
      pointerType = e.pointerType;
      downAt = performance.now();
      square.setPointerCapture(e.pointerId);
      begin();
    });
    square.addEventListener('pointerup', end);
    square.addEventListener('pointercancel', end);
    square.addEventListener('lostpointercapture', end);
    square.addEventListener('contextmenu', (e) => e.preventDefault());

    square.addEventListener('keydown', (e) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      e.preventDefault(); // stops the synthetic click, so holding is required
      if (e.repeat) return;
      if (reduceMotion) return warp();
      begin();
    });
    square.addEventListener('keyup', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        end();
      }
    });

    window.addEventListener('blur', end);

    // A click that didn't come from a held mouse or key opens the door
    // straight away: screen readers (VoiceOver and TalkBack send a quick
    // synthetic tap), switch access, and a plain tap on a touch screen.
    square.addEventListener('click', (e) => {
      const quickTap = pointerType !== 'mouse' && performance.now() - downAt < 300;
      const fromPointer = pointerUsed;
      pointerUsed = false;
      if (!fromPointer || e.detail === 0 || quickTap || reduceMotion) warp();
    });

    // Coming back with the Back button restores this page from the cache,
    // mid-warp. Put everything back the way it was.
    window.addEventListener('pageshow', (e) => {
      if (!e.persisted) return;
      document.querySelectorAll('.warp').forEach((el) => el.remove());
      warping = false;
      holding = false;
      p = 0;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      render();
      square.classList.remove('is-holding');
      if (status) status.textContent = '';
    });
  }

  /* ---------- The watch points to the door ---------- */
  if (watch && square) {
    watch.addEventListener('click', () => {
      const go = () => {
        square.focus({ preventScroll: true });
        square.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(1.6)' }, { transform: 'scale(1)' }],
          { duration: 700, easing: 'ease-in-out', iterations: 2 }
        );
      };
      if (window.__lenis) {
        window.__lenis.scrollTo(document.body.scrollHeight, { duration: 2, onComplete: go });
      } else {
        square.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        setTimeout(go, reduceMotion ? 0 : 900);
      }
    });
  }

  /* ---------- Typed triggers ---------- */
  const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  let buffer = '';
  let konamiAt = 0;
  window.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key.toLowerCase();

    if (/^[a-z]$/.test(key)) {
      buffer = (buffer + key).slice(-7);
      if (buffer === 'odyssey') warp();
    }
    if (key === KONAMI[konamiAt]) {
      konamiAt++;
      if (konamiAt === KONAMI.length) warp();
    } else {
      konamiAt = key === KONAMI[0] ? 1 : 0;
    }
  });
})();
