/* ==========================================================
   site.js: shared by every page.
   Theme toggle, nav backdrop on scroll, copy-email button.
   ========================================================== */
(function () {
  const root = document.documentElement;

  /* ---------- Theme ---------- */
  const toggle = document.getElementById('theme-toggle');
  function syncToggle() {
    if (!toggle) return;
    const dark = root.getAttribute('data-theme') === 'dark';
    toggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  }
  if (toggle) {
    syncToggle();
    toggle.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try {
        localStorage.setItem('theme', next);
      } catch (e) {}
      syncToggle();
      window.dispatchEvent(new Event('themechange'));
    });
  }

  /* ---------- Nav backdrop once scrolled ---------- */
  const nav = document.querySelector('.nav-wrap');
  if (nav) {
    const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 8);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Paintings: fan the stack out on hover ----------
     Each card takes its painting's own shape, so nothing is letterboxed.
     The fan is kept on screen and flips below the stack near the top. */
  document.querySelectorAll('.arts').forEach((stack) => {
    const arts = Array.from(stack.querySelectorAll('.art'));
    const fan = document.createElement('span');
    fan.className = 'fan';
    fan.setAttribute('aria-hidden', 'true');
    const cards = arts.map((art) => {
      const card = document.createElement('span');
      card.className = 'fan-card';
      card.style.setProperty('--art', art.style.getPropertyValue('--art'));
      fan.appendChild(card);
      art.addEventListener('pointerenter', () => card.classList.add('is-hot'));
      art.addEventListener('pointerleave', () => card.classList.remove('is-hot'));
      art.addEventListener('focus', () => card.classList.add('is-hot'));
      art.addEventListener('blur', () => card.classList.remove('is-hot'));
      return card;
    });
    stack.appendChild(fan);

    const ratios = arts.map(() => 0.8);
    arts.forEach((art, i) => {
      const src = (art.getAttribute('href') || '').trim();
      if (!src) return;
      const img = new Image();
      img.onload = () => {
        if (!img.naturalWidth || !img.naturalHeight) return;
        ratios[i] = img.naturalWidth / img.naturalHeight;
        art.style.setProperty('--ar', ratios[i].toFixed(3));
        cards[i].style.setProperty('--ar', ratios[i].toFixed(3));
        layout();
      };
      img.src = src;
    });

    function layout() {
      const h = Math.round(Math.min(130, innerWidth * 0.28));
      stack.style.setProperty('--h', h + 'px');
      const widths = ratios.map((r) => r * h);
      const overlap = Math.min(...widths) * 0.22;
      // Lay the cards left to right, overlapping, then centre the row on the stack.
      let x = 0;
      const centres = widths.map((w, i) => {
        if (i) x -= overlap;
        const c = x + w / 2;
        x += w;
        return c;
      });
      const span = x;
      centres.forEach((c, i) => cards[i].style.setProperty('--fx', (c - span / 2).toFixed(1) + 'px'));

      // Keep the whole fan on screen.
      const r = stack.getBoundingClientRect();
      const mid = r.left + r.width / 2;
      const pad = 12 + h * 0.22; // room for the outer cards' tilt
      let shift = 0;
      if (mid - span / 2 < pad) shift = pad - (mid - span / 2);
      else if (mid + span / 2 > innerWidth - pad) shift = innerWidth - pad - (mid + span / 2);
      stack.style.setProperty('--sx', shift.toFixed(1) + 'px');

      // Open downward when there's no room above (the sticky nav covers the top).
      const nav = document.querySelector('.nav-wrap');
      const navBottom = nav ? nav.getBoundingClientRect().bottom : 0;
      stack.classList.toggle('arts--down', r.top - h - 36 < navBottom + 8);
    }
    layout();
    stack.addEventListener('pointerenter', layout);
    stack.addEventListener('focusin', layout);
  });

  /* ---------- Copy email ---------- */
  const copy = document.getElementById('copy');
  const status = document.getElementById('copy-status');
  if (copy && status) {
    let timer = 0;
    const say = (msg) => {
      status.textContent = msg;
      clearTimeout(timer);
      timer = setTimeout(() => (status.textContent = ''), 2500);
    };
    copy.addEventListener('click', async () => {
      const text = copy.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
        say('Copied');
      } catch (e) {
        const link = document.querySelector('.footer-email');
        if (link) {
          const range = document.createRange();
          range.selectNodeContents(link);
          const sel = getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
        say('Press Ctrl+C to copy');
      }
    });
  }
})();
