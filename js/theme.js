/* ============================================
   THEME TOGGLE & COLOR PICKER
   ============================================ */
(function () {
  const root = document.documentElement;

  // --- Theme (dark / light) ---
  const stored = localStorage.getItem('theme');
  if (stored) {
    root.setAttribute('data-theme', stored);
  } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    root.setAttribute('data-theme', 'light');
  }
  // else default data-theme="dark" already set on <html>

  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
  }

  // --- Color theme ---
  const storedColor = localStorage.getItem('color');
  if (storedColor) {
    root.setAttribute('data-color', storedColor);
  }
  // else default data-color="green" already set on <html>

  // Mark the active dot on load
  function updateActiveDot() {
    const current = root.getAttribute('data-color');
    document.querySelectorAll('.color-dot').forEach(dot => {
      dot.classList.toggle('active', dot.getAttribute('data-color') === current);
    });
  }

  document.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const color = dot.getAttribute('data-color');
      root.setAttribute('data-color', color);
      localStorage.setItem('color', color);
      updateActiveDot();
    });
  });

  updateActiveDot();
})();
