/* ============================================
   ACCENT COLOR PICKER (experience is dark-only)
   ============================================ */
(function () {
  const root = document.documentElement;
  root.setAttribute('data-theme', 'dark');

  const storedColor = localStorage.getItem('color');
  if (storedColor) {
    root.setAttribute('data-color', storedColor);
  }
  // else default data-color="purple" already set on <html>

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
      window.dispatchEvent(new CustomEvent('themechange'));
    });
  });

  updateActiveDot();
})();
