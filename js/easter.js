/* ============================================
   EASTER EGG — a hidden dimension
   Type "odyssey", enter the Konami code, or tap
   the footer logo 5 times to warp to /odyssey/.
   ============================================ */
(function () {
  const DEST = 'odyssey/';
  let warping = false;

  /* a hint for the curious */
  console.log(
    '%cPA.%c\n\nYou found the console. There is more than one dimension to this site…\nType %codyssey%c anywhere on the page.',
    'font-family: monospace; font-size: 28px; font-weight: bold;',
    'font-family: monospace; color: #8b8b9e;',
    'font-family: monospace; color: #a3e635; font-weight: bold;',
    'font-family: monospace; color: #8b8b9e;'
  );

  function warp() {
    if (warping) return;
    warping = true;

    const style = document.createElement('style');
    style.textContent = `
      .warp-overlay {
        position: fixed; inset: 0; z-index: 99999;
        background: #050508;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 18px; opacity: 0; animation: warp-in 0.45s ease forwards;
      }
      .warp-overlay span {
        font-family: 'JetBrains Mono', monospace; font-size: 0.8rem;
        letter-spacing: 0.4em; text-transform: uppercase; color: #e8e8ed;
        animation: warp-flicker 0.12s steps(2) infinite;
      }
      .warp-overlay i {
        width: 8px; height: 8px; border-radius: 50%;
        border: 1px solid var(--accent, #9ca3af);
        animation: warp-ring 0.9s ease-out infinite;
      }
      @keyframes warp-in { to { opacity: 1; } }
      @keyframes warp-flicker { 50% { opacity: 0.55; } }
      @keyframes warp-ring {
        from { transform: scale(1); opacity: 1; }
        to { transform: scale(30); opacity: 0; }
      }
      @media (prefers-reduced-motion: reduce) {
        .warp-overlay, .warp-overlay span, .warp-overlay i { animation: none; opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.className = 'warp-overlay';
    overlay.innerHTML = '<i></i><span>Entering the odyssey</span>';
    document.body.appendChild(overlay);

    setTimeout(() => {
      window.location.href = DEST;
    }, 1100);
  }

  /* --- trigger 1: type "odyssey" --- */
  let buffer = '';
  /* --- trigger 2: the Konami code --- */
  const KONAMI = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a',
  ];
  let konamiAt = 0;

  window.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

    if (/^[a-z]$/i.test(e.key)) {
      buffer = (buffer + e.key.toLowerCase()).slice(-7);
      if (buffer === 'odyssey') warp();
    }

    const expected = KONAMI[konamiAt];
    if (e.key === expected || e.key.toLowerCase() === expected) {
      konamiAt++;
      if (konamiAt === KONAMI.length) warp();
    } else {
      konamiAt = e.key === KONAMI[0] ? 1 : 0;
    }
  });

  /* --- trigger 3 (touch): 5 quick taps on the footer logo --- */
  const footerLogo = document.querySelector('.footer-logo');
  if (footerLogo) {
    let taps = 0;
    let lastTap = 0;
    footerLogo.addEventListener('click', () => {
      const now = Date.now();
      taps = now - lastTap < 600 ? taps + 1 : 1;
      lastTap = now;
      if (taps >= 5) warp();
    });
  }
})();
