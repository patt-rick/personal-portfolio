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

  /* ---------- Painting pop-outs: open downward when there's no room above ---------- */
  document.querySelectorAll('.art').forEach((art) => {
    const place = () => {
      const pop = Math.min(240, innerWidth * 0.62) + 10;
      const nav = document.querySelector('.nav-wrap');
      const top = nav ? nav.getBoundingClientRect().bottom : 0;
      art.classList.toggle('art--down', art.getBoundingClientRect().top - pop < top + 8);
    };
    art.addEventListener('pointerenter', place);
    art.addEventListener('focus', place);
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
