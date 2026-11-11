/* ==========================================================
   glyphs.js: five Adinkra symbols as stroked line art on a
   100 x 100 box. Kept geometric on purpose: simple circles,
   squares and one heart, so nothing is mis-drawn.
     Adinkrahene  "chief of adinkra": greatness, leadership
     Mate Masie   "what I hear, I keep": wisdom, knowledge
     Nsoromma     "child of the heavens": guardianship
     Akoma        "the heart": patience, endurance
     Eban         "fence": safety, home
   ========================================================== */
(function () {
  function circle(cx, cy, r) {
    return `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`;
  }
  function poly(points) {
    return 'M' + points.map((p) => p.join(',')).join('L') + 'Z';
  }

  window.ADINKRA_GLYPHS = [
    { name: 'Adinkrahene', d: circle(50, 50, 44) + circle(50, 50, 28) + circle(50, 50, 11) },
    {
      name: 'Mate Masie',
      d:
        circle(29, 29, 18) +
        circle(71, 29, 18) +
        circle(29, 71, 18) +
        circle(71, 71, 18) +
        circle(50, 50, 4),
    },
    {
      name: 'Nsoromma',
      d:
        poly([[22, 22], [78, 22], [78, 78], [22, 78]]) +
        poly([[50, 10], [90, 50], [50, 90], [10, 50]]) +
        circle(50, 50, 9),
    },
    {
      name: 'Akoma',
      d:
        'M50,88C22,68 8,50 8,33C8,19 18,10 30,10C40,10 47,16 50,25' +
        'C53,16 60,10 70,10C82,10 92,19 92,33C92,50 78,68 50,88Z',
    },
    {
      name: 'Eban',
      d:
        poly([[8, 8], [92, 8], [92, 92], [8, 92]]) +
        poly([[32, 32], [68, 32], [68, 68], [32, 68]]) +
        'M8,8L32,32M92,8L68,32M92,92L68,68M8,92L32,68',
    },
  ];
})();
