/* ============================================
   MOTION — Lenis smooth scroll + GSAP scroll experience
   ============================================ */
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasLibs = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';

  const preloader = document.getElementById('preloader');

  // Fallback: no libs or reduced motion — show everything, remove preloader.
  if (!hasLibs || reduceMotion) {
    if (preloader) preloader.remove();
    return;
  }

  document.documentElement.classList.add('has-motion');
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Lenis smooth scroll ---------- */
  const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
  window.__lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Anchor links scroll through Lenis (account for fixed nav)
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -71, duration: 1.4 });
    });
  });

  /* ---------- Text splitting helpers ---------- */
  function splitChars(el) {
    const text = el.textContent;
    el.textContent = '';
    const chars = [];
    for (const ch of text) {
      const span = document.createElement('span');
      span.className = 'char';
      span.innerHTML = ch === ' ' ? '&nbsp;' : ch;
      el.appendChild(span);
      chars.push(span);
    }
    return chars;
  }

  function splitWords(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    const inners = [];
    words.forEach((word, i) => {
      const outer = document.createElement('span');
      outer.className = 'word';
      const inner = document.createElement('span');
      inner.textContent = word;
      outer.appendChild(inner);
      el.appendChild(outer);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      inners.push(inner);
    });
    return inners;
  }

  /* ---------- Hero title split (primed before reveal) ---------- */
  const heroChars = [];
  document.querySelectorAll('.hero-title [data-split]').forEach((el) => {
    heroChars.push(...splitChars(el));
  });
  gsap.set(heroChars, { yPercent: 110 });

  /* ---------- Preloader + hero intro ---------- */
  function heroIntro() {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.to(heroChars, { yPercent: 0, duration: 1.1, stagger: 0.035 })
      .to(
        '#hero [data-intro]',
        { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, startAt: { y: 24 } },
        '-=0.7'
      );

    // Count up stats
    document.querySelectorAll('.stat-number').forEach((el) => {
      const target = +el.dataset.target;
      gsap.fromTo(
        el,
        { innerText: 0 },
        { innerText: target, duration: 1.6, delay: 0.5, snap: { innerText: 1 }, ease: 'power2.out' }
      );
    });

    startWordRotator();
  }

  const loaded = new Promise((resolve) => {
    if (document.readyState === 'complete') resolve();
    else window.addEventListener('load', resolve);
    setTimeout(resolve, 3500); // don't hold the site hostage to slow assets
  });

  const counter = { value: 0 };
  const countEl = document.getElementById('preloader-count');
  const barEl = document.getElementById('preloader-bar-fill');

  gsap.to(counter, {
    value: 100,
    duration: 1.4,
    ease: 'power2.inOut',
    onUpdate: () => {
      const v = Math.round(counter.value);
      if (countEl) countEl.textContent = String(v).padStart(2, '0');
      if (barEl) barEl.style.width = v + '%';
    },
    onComplete: async () => {
      await loaded;
      gsap.to(preloader, {
        yPercent: -100,
        duration: 0.9,
        ease: 'power4.inOut',
        onStart: heroIntro,
        onComplete: () => {
          preloader.remove();
          ScrollTrigger.refresh();
        },
      });
    },
  });

  /* ---------- Hero word rotator ---------- */
  function startWordRotator() {
    const words = gsap.utils.toArray('.hero-word');
    if (words.length < 2) return;
    let index = 0;
    setInterval(() => {
      const current = words[index];
      index = (index + 1) % words.length;
      const next = words[index];
      gsap.to(current, { y: -16, opacity: 0, duration: 0.4, ease: 'power2.in' });
      gsap.fromTo(
        next,
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, delay: 0.25, ease: 'power2.out' }
      );
    }, 2600);
  }

  /* ---------- Hero recedes as you scroll ---------- */
  gsap.to('.hero-inner', {
    y: -80,
    opacity: 0,
    ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom 35%', scrub: true },
  });

  /* ---------- Scroll progress bar ---------- */
  gsap.to('#scroll-progress', {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { start: 0, end: () => ScrollTrigger.maxScroll(window), scrub: 0.3 },
  });

  /* ---------- Section title reveals (word by word) ---------- */
  document.querySelectorAll('[data-title]').forEach((el) => {
    const inners = splitWords(el);
    gsap.to(inners, {
      y: 0,
      yPercent: 0,
      duration: 0.9,
      stagger: 0.06,
      ease: 'power4.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
      startAt: { yPercent: 110 },
    });
  });

  /* ---------- Generic reveals ---------- */
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%',
    once: true,
    onEnter: (batch) =>
      gsap.fromTo(
        batch,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out', overwrite: true }
      ),
  });

  /* ---------- Skill bars ---------- */
  document.querySelectorAll('.skill-fill').forEach((el) => {
    gsap.to(el, {
      scaleX: (+el.dataset.level || 100) / 100,
      duration: 1.2,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
    });
  });

  /* ---------- Projects: pinned horizontal rail (desktop) ---------- */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    const rail = document.getElementById('projects-rail');
    const slides = gsap.utils.toArray('.project-slide');
    const counterCurrent = document.getElementById('projects-counter-current');
    const getDistance = () => rail.scrollWidth - window.innerWidth;

    const railTween = gsap.to(rail, {
      x: () => -getDistance(),
      ease: 'none',
      scrollTrigger: {
        trigger: '#projects',
        start: 'top top',
        end: () => '+=' + getDistance(),
        scrub: 1,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const i = Math.round(self.progress * (slides.length - 1)) + 1;
          if (counterCurrent) counterCurrent.textContent = String(i).padStart(2, '0');
        },
      },
    });

    // Parallax drift inside each project visual while the rail moves
    gsap.utils.toArray('.project-visual img').forEach((img) => {
      gsap.fromTo(
        img,
        { y: '-8%' },
        {
          y: '0%',
          ease: 'none',
          scrollTrigger: {
            trigger: img.closest('.project-slide'),
            containerAnimation: railTween,
            start: 'left right',
            end: 'right left',
            scrub: true,
          },
        }
      );
    });
  });

  /* ---------- Experience timeline draws itself ---------- */
  gsap.to('#timeline-line-fill', {
    scaleY: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: '#timeline',
      start: 'top 75%',
      end: 'bottom 60%',
      scrub: 0.5,
    },
  });

  /* ---------- About photo tilt ---------- */
  const frame = document.getElementById('about-photo-frame');
  if (frame && window.matchMedia('(hover: hover)').matches) {
    const rx = gsap.quickTo(frame, 'rotationX', { duration: 0.5, ease: 'power3.out' });
    const ry = gsap.quickTo(frame, 'rotationY', { duration: 0.5, ease: 'power3.out' });
    gsap.set(frame, { transformPerspective: 800 });
    frame.addEventListener('mousemove', (e) => {
      const r = frame.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * 14);
      rx(-((e.clientY - r.top) / r.height - 0.5) * 14);
    });
    frame.addEventListener('mouseleave', () => {
      rx(0);
      ry(0);
    });
  }
})();
