/* ==========================================================
   glyphs.js: the background symbols, as stroked line art on a
   100 x 100 box. Kept geometric on purpose so nothing is
   mis-drawn. A mix of the things I care about:
     Adinkra      Adinkrahene (greatness), Akoma (the heart)
     Tech         terminal, </>, { }, git branch
     Photography  camera, aperture
     Painting     brush, palette
   ========================================================== */
(function () {
  function circle(cx, cy, r) {
    return `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`;
  }
  function poly(points) {
    return 'M' + points.map((p) => p.join(',')).join('L') + 'Z';
  }
  function round(n) {
    return Math.round(n * 10) / 10;
  }
  // Six aperture blades: an inner hexagon, each corner swept out to the rim.
  function aperture() {
    let d = circle(50, 50, 40);
    const inner = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      const ix = round(50 + 15 * Math.cos(a));
      const iy = round(50 + 15 * Math.sin(a));
      const b = a + 1.25;
      inner.push([ix, iy]);
      d += `M${ix},${iy}L${round(50 + 40 * Math.cos(b))},${round(50 + 40 * Math.sin(b))}`;
    }
    return d + poly(inner);
  }

  window.ADINKRA_GLYPHS = [
    // Adinkra
    { name: 'Adinkrahene', d: circle(50, 50, 44) + circle(50, 50, 28) + circle(50, 50, 11) },
    {
      name: 'Akoma',
      d:
        'M50,88C22,68 8,50 8,33C8,19 18,10 30,10C40,10 47,16 50,25' +
        'C53,16 60,10 70,10C82,10 92,19 92,33C92,50 78,68 50,88Z',
    },
    // Tech
    {
      name: 'Terminal',
      d: poly([[10, 18], [90, 18], [90, 82], [10, 82]]) + 'M10,32H90M24,46L36,56L24,66M44,66H60',
    },
    { name: 'Code', d: 'M34,28L12,50L34,72M66,28L88,50L66,72M58,20L42,80' },
    {
      name: 'Braces',
      d:
        'M38,12C26,12 28,24 28,34C28,44 24,48 16,50C24,52 28,56 28,66C28,76 26,88 38,88' +
        'M62,12C74,12 72,24 72,34C72,44 76,48 84,50C76,52 72,56 72,66C72,76 74,88 62,88',
    },
    {
      name: 'Branch',
      d:
        circle(30, 18, 8) +
        circle(30, 82, 8) +
        circle(70, 34, 8) +
        'M30,26V74M70,42C70,60 30,54 30,70',
    },
    // Photography
    {
      name: 'Camera',
      d:
        poly([[10, 32], [32, 32], [38, 22], [62, 22], [68, 32], [90, 32], [90, 80], [10, 80]]) +
        circle(50, 56, 15) +
        circle(78, 46, 3),
    },
    { name: 'Aperture', d: aperture() },
    // Painting
    {
      name: 'Brush',
      d:
        poly([[80, 8], [92, 20], [58, 54], [46, 42]]) +
        'M46,42C34,46 28,56 24,66C20,76 16,84 10,90C22,88 34,82 42,74C50,66 56,60 58,54',
    },
    {
      name: 'Palette',
      d:
        'M50,10C76,10 92,28 92,48C92,62 82,66 72,62C62,58 56,66 60,76' +
        'C64,88 56,92 46,92C24,92 8,74 8,50C8,26 26,10 50,10Z' +
        circle(30, 36, 6) +
        circle(50, 26, 6) +
        circle(70, 34, 6) +
        circle(24, 58, 6),
    },
  ];
})();
