/* ============================================
   HERO PHOTO REVEAL
   Mouse-driven mask reveal with smooth lerping
   ============================================ */
;(function () {
  const container = document.getElementById('hero-photo-container');
  const photo = document.getElementById('hero-photo');
  const hint = document.getElementById('hero-photo-hint');

  if (!container || !photo) return;

  let mouseX = 0;
  let mouseY = 0;
  let currentX = 0;
  let currentY = 0;
  let currentSize = 0;
  let targetSize = 0;
  let isHovering = false;
  let hasHovered = false;
  let animating = false;

  const MAX_SIZE = 180;
  const POSITION_LERP = 0.12;
  const SIZE_LERP_IN = 0.08;
  const SIZE_LERP_OUT = 0.06;

  function setMask(x, y, size) {
    const mask = `radial-gradient(circle ${size}px at ${x}px ${y}px, black 40%, transparent 100%)`;
    photo.style.webkitMaskImage = mask;
    photo.style.maskImage = mask;
  }

  function animate() {
    // Lerp position toward mouse
    currentX += (mouseX - currentX) * POSITION_LERP;
    currentY += (mouseY - currentY) * POSITION_LERP;

    // Lerp size toward target
    const sizeLerp = isHovering ? SIZE_LERP_IN : SIZE_LERP_OUT;
    currentSize += (targetSize - currentSize) * sizeLerp;

    // Apply mask
    setMask(currentX, currentY, currentSize);

    // Keep animating until size is essentially 0 after mouse leaves
    if (!isHovering && currentSize < 0.5) {
      currentSize = 0;
      setMask(currentX, currentY, 0);
      animating = false;

      // Show hint again after fully hidden
      if (hint) hint.style.opacity = '1';
      return;
    }

    requestAnimationFrame(animate);
  }

  function startAnimation() {
    if (!animating) {
      animating = true;
      requestAnimationFrame(animate);
    }
  }

  container.addEventListener('mouseenter', function (e) {
    const rect = container.getBoundingClientRect();
    // Snap position immediately on first enter to avoid lerp from 0,0
    if (!hasHovered) {
      currentX = e.clientX - rect.left;
      currentY = e.clientY - rect.top;
      hasHovered = true;
    }

    isHovering = true;
    targetSize = MAX_SIZE;

    // Hide hint
    if (hint) hint.style.opacity = '0';

    startAnimation();
  });

  container.addEventListener('mousemove', function (e) {
    const rect = container.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });

  container.addEventListener('mouseleave', function () {
    isHovering = false;
    targetSize = 0;
  });

  // Touch support for mobile
  container.addEventListener('touchstart', function (e) {
    const rect = container.getBoundingClientRect();
    const touch = e.touches[0];
    mouseX = touch.clientX - rect.left;
    mouseY = touch.clientY - rect.top;
    currentX = mouseX;
    currentY = mouseY;

    isHovering = true;
    targetSize = MAX_SIZE;
    hasHovered = true;

    if (hint) hint.style.opacity = '0';
    startAnimation();
  });

  container.addEventListener('touchmove', function (e) {
    const rect = container.getBoundingClientRect();
    const touch = e.touches[0];
    mouseX = touch.clientX - rect.left;
    mouseY = touch.clientY - rect.top;
  });

  container.addEventListener('touchend', function () {
    isHovering = false;
    targetSize = 0;
  });
})();
