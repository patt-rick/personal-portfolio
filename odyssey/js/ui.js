/* ============================================
   UI — preloader, smooth scroll, overlay + HUD sync
   The 3D module (experience.js) dispatches:
   'scene-progress' {detail: 0..1}, 'scene-ready', 'scene-failed'
   ============================================ */
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasLibs = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  const preloader = document.getElementById('preloader');

  function enterFallback() {
    document.documentElement.classList.add('no-3d');
    if (preloader) preloader.remove();
  }

  // file:// blocks ES module loading (CORS), so the 3D engine can never
  // start — drop to the static page immediately instead of waiting.
  if (!hasLibs || reduceMotion || location.protocol === 'file:') {
    enterFallback();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Preloader driven by real asset progress ---------- */
  const countEl = document.getElementById('preloader-count');
  const barEl = document.getElementById('preloader-bar-fill');
  const labelEl = document.getElementById('preloader-label');
  let assetProgress = 0;
  let shown = { value: 0 };
  let sceneReady = false;
  let started = false;

  window.addEventListener('scene-progress', (e) => {
    assetProgress = e.detail;
  });

  const floorTween = gsap.to(shown, {
    value: 100,
    duration: 2.2,
    ease: 'power1.inOut',
    onUpdate: render,
    paused: true,
  });
  floorTween.play();

  function render() {
    // never show more than real progress allows, but keep a steady floor
    const v = Math.round(Math.min(shown.value, Math.max(assetProgress * 100, shown.value * 0.85)));
    if (countEl) countEl.textContent = String(v).padStart(3, '0');
    if (barEl) barEl.style.width = v + '%';
    if (v > 60 && labelEl) labelEl.textContent = 'Entering orbit';
    if (shown.value >= 99.5 && sceneReady && !started) begin();
  }

  window.addEventListener('scene-ready', () => {
    sceneReady = true;
    assetProgress = 1;
    if (shown.value >= 99.5 && !started) begin();
  });

  window.addEventListener('scene-failed', () => {
    floorTween.kill();
    enterFallback();
  });

  // safety: if the scene never reports in, fall back rather than trap the user
  setTimeout(() => {
    if (!sceneReady && !started) {
      window.dispatchEvent(new Event('scene-failed'));
    }
  }, 12000);

  /* ---------- Begin the experience ---------- */
  let lenis;

  function begin() {
    started = true;
    gsap.to(preloader, {
      opacity: 0,
      duration: 0.8,
      ease: 'power2.inOut',
      onComplete: () => {
        preloader.remove();
        ScrollTrigger.refresh();
      },
    });
    window.dispatchEvent(new Event('experience-begin'));
    initScroll();
  }

  function initScroll() {
    lenis = new Lenis({ lerp: 0.09 });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    /* anchor + HUD navigation */
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const target = document.querySelector(a.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { duration: 1.8 });
      });
    });

    document.querySelectorAll('.hud-zone').forEach((z) => {
      z.addEventListener('click', () => {
        const target = document.getElementById(z.dataset.target);
        if (target) lenis.scrollTo(target, { duration: 1.8 });
      });
    });

    /* overlay fade choreography — driven per stop for exact sticky sync */
    const stops = document.querySelectorAll(
      '#hero, #about, #skills, #contact, .project-stop, .xp-stop'
    );
    const zonesList = Array.from(stops);
    const smooth = (a, b, x) => {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };

    zonesList.forEach((el, idx) => {
      const content = el.querySelector('[data-fade]')
        ? el.querySelector('.zone-content')
        : null;
      if (!content) return;
      const first = idx === 0;
      const last = idx === zonesList.length - 1;

      ScrollTrigger.create({
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate(self) {
          const vh = window.innerHeight;
          const H = el.offsetHeight;
          const p = self.progress;
          const s0 = vh / (H + vh); // progress where content pins
          const s1 = H / (H + vh); // progress where content unpins
          let o = 1;
          let y = 0;
          if (!first) {
            const a = s0 - 0.02;
            const b = Math.max(Math.min(s0 + 0.09, s1 - 0.05), a + 0.02);
            const fin = smooth(a, b, p);
            o *= fin;
            y += (1 - fin) * 48;
          }
          if (!last) {
            const b = s1 + 0.02;
            const a = Math.min(Math.max(s1 - 0.09, s0 + 0.05), b - 0.02);
            const fout = 1 - smooth(a, b, p);
            o *= fout;
            y -= (1 - fout) * 48;
          }
          gsap.set(content, { opacity: o, y });
        },
      });
    });

    /* hero overlay is visible immediately, fades on first scroll stretch */
    gsap.set('.zone-content-hero', { opacity: 1 });

    /* HUD active zone */
    const hudItems = document.querySelectorAll('.hud-zone');
    const navLinks = document.querySelectorAll('.nav-link');
    document.querySelectorAll('.zone').forEach((section) => {
      ScrollTrigger.create({
        trigger: section,
        start: 'top 45%',
        end: 'bottom 45%',
        onToggle(self) {
          if (!self.isActive) return;
          hudItems.forEach((z) =>
            z.classList.toggle('active', z.dataset.target === section.id)
          );
          navLinks.forEach((l) =>
            l.classList.toggle('active', l.getAttribute('href') === '#' + section.id)
          );
        },
      });
    });

    /* progress readout + scroll cue */
    const progressEl = document.getElementById('hud-progress-value');
    const scrollCue = document.getElementById('hud-scroll');
    ScrollTrigger.create({
      start: 0,
      end: () => ScrollTrigger.maxScroll(window),
      onUpdate(self) {
        if (progressEl)
          progressEl.textContent = String(Math.round(self.progress * 100)).padStart(3, '0');
        if (scrollCue) scrollCue.style.opacity = self.progress > 0.02 ? 0 : 1;
      },
    });
  }
})();
