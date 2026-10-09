/* ==========================================================
   main.js: theme toggle, the poster entrance, the poster
   receding on scroll, the work plate, and copy-to-clipboard.
   ========================================================== */
(function () {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  const motion = hasGsap && !reduceMotion && root.classList.contains('motion');

  /* ---------- Theme ---------- */
  const toggle = document.getElementById('theme-toggle');
  function paintToggle() {
    const dark = root.getAttribute('data-theme') === 'dark';
    toggle.textContent = dark ? 'Lights on' : 'Lights off';
    toggle.setAttribute('aria-pressed', String(dark));
  }
  toggle.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    paintToggle();
  });
  paintToggle();

  /* ---------- Fit the name to the poster width ---------- */
  const nameEl = document.getElementById('name');
  const lines = nameEl.querySelectorAll('.name-inner');
  function fitName() {
    nameEl.style.removeProperty('--name-size');
    const probe = parseFloat(getComputedStyle(nameEl).fontSize);
    const poster = document.getElementById('poster');
    const gutter = parseFloat(getComputedStyle(root).getPropertyValue('--gutter')) || 16;
    const available = poster.clientWidth - gutter * 2;
    const widest = Math.max(...Array.from(lines, (l) => l.offsetWidth));
    if (!widest) return;
    // PATRICK fills the width; ACKOM keeps the same size.
    const size = Math.min(probe * (available / widest), window.innerHeight * 0.3);
    nameEl.style.setProperty('--name-size', size.toFixed(2) + 'px');
  }
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  fontsReady.then(fitName);
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitName, 120);
  });

  /* ---------- Copy email ---------- */
  const copyBtn = document.getElementById('copy');
  const copyStatus = document.getElementById('copy-status');
  copyBtn.addEventListener('click', async () => {
    const text = copyBtn.dataset.copy;
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      ta.remove();
      copyBtn.focus();
    }
    copyStatus.textContent = ok ? 'Copied' : 'Copy failed. Select the address above instead.';
    clearTimeout(copyBtn._t);
    copyBtn._t = setTimeout(() => (copyStatus.textContent = ''), 2600);
  });

  /* ---------- Work plate ---------- */
  const items = Array.from(document.querySelectorAll('.work-item'));
  const plate = document.getElementById('plate');
  const plateImg = document.getElementById('plate-img');
  const caption = document.getElementById('plate-caption');
  const wide = window.matchMedia('(min-width: 1024px)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let active = 0;
  let gl = null;
  let glLoading = false;

  function setActive(i) {
    if (i === active && caption.textContent) return;
    const changed = i !== active;
    active = i;
    items.forEach((el, n) => el.classList.toggle('is-active', n === i));
    caption.textContent = items[i].querySelector('.work-desc').textContent.trim().replace(/\s+/g, ' ');
    if (!changed) return;
    if (gl) {
      gl.show(i);
    } else {
      plateImg.classList.add('is-swapping');
      setTimeout(() => {
        plateImg.src = items[i].dataset.img;
        plateImg.classList.toggle('is-light', items[i].classList.contains('is-light'));
        plateImg.classList.remove('is-swapping');
      }, reduceMotion ? 0 : 200);
    }
  }

  function loadGL() {
    if (gl || glLoading || reduceMotion || !wide.matches || !finePointer.matches) return;
    glLoading = true;
    import('./plate-gl.js')
      .then((mod) => {
        const startedOn = active;
        return mod
          .createPlate(plate, items.map((el) => ({ src: el.dataset.img, invert: el.classList.contains('is-light') })), startedOn, () => {
            // GPU reset: drop back to the CSS print.
            gl = null;
            glLoading = false;
            plate.classList.remove('has-gl');
            plateImg.src = items[active].dataset.img;
            plateImg.classList.toggle('is-light', items[active].classList.contains('is-light'));
          })
          .then((instance) => {
            gl = instance;
            if (!gl) return;
            plate.classList.add('has-gl');
            if (active !== startedOn) gl.show(active);
          });
      })
      .catch(() => { /* the CSS print stays in place */ });
  }

  items.forEach((el, i) => {
    el.addEventListener('pointerenter', () => { if (wide.matches) setActive(i); });
    el.addEventListener('focusin', () => setActive(i));
  });
  setActive(0);

  const workList = document.getElementById('work-list');
  workList.addEventListener('pointerenter', loadGL, { once: false });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        loadGL();
        io.disconnect();
      }
    }, { rootMargin: '300px' });
    io.observe(plate);
  }

  /* ---------- Motion ---------- */
  if (!motion) {
    root.classList.remove('motion');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  let lenis = null;
  if (typeof Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.11 });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = id === '#top' ? document.body : document.querySelector(id);
      if (!target || !lenis) return;
      e.preventDefault();
      lenis.scrollTo(id === '#top' ? 0 : target, { duration: 1.3 });
      if (id !== '#top') target.setAttribute('tabindex', '-1'), target.focus({ preventScroll: true });
    });
  });

  /* The one entrance: the field wipes up, the name rises, the portrait follows. */
  const poster = document.getElementById('poster');
  const portrait = document.getElementById('portrait');
  const portraitImg = document.getElementById('portrait-img');

  const imgReady = portraitImg.decode ? portraitImg.decode().catch(() => {}) : Promise.resolve();
  const timeout = new Promise((r) => setTimeout(r, 1800));
  Promise.race([Promise.all([imgReady, fontsReady]), timeout]).then(() => {
    if (!root.classList.contains('motion')) return; // failsafe already showed the page
    window.__introStarted = true;
    fitName();
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.fromTo(poster, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.inOut' })
      .to('.name-inner', { y: 0, duration: 1.3, stagger: 0.12 }, '-=0.35')
      .to(portrait, { opacity: 1, y: 0, duration: 1.4 }, '-=1.15')
      .to(['.nav', '.hero-line'], { opacity: 1, duration: 0.8, ease: 'power2.out' }, '-=0.9')
      .add(() => {
        root.classList.add('intro-done');
        gsap.set(poster, { clearProps: 'clipPath' });
      });
  });

  /* On scroll the poster recedes into a framed print, the portrait sinks, and
     the two halves of the name drift apart. */
  const recede = gsap.timeline({
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });
  recede
    .to(poster, { scale: 0.86, borderRadius: 22, ease: 'none' }, 0)
    .to('.name-line--back .name-inner', { xPercent: -10, ease: 'none' }, 0)
    .to('.name-line--front .name-inner', { xPercent: 10, ease: 'none' }, 0)
    .to(portraitImg, { yPercent: 10, ease: 'none' }, 0);
})();
