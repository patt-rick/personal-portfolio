/* ============================================
   FLIP-TEXT — Split-flap reveal for section
   tags and timeline dates
   ============================================ */
;(function () {
  var FLAP_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/';
  var FLAP_DIGITS = '0123456789';

  // Prepare elements
  var els = document.querySelectorAll('.section-tag, .timeline-date');

  els.forEach(function (el) {
    el.setAttribute('aria-label', el.textContent);
    var isDigitHeavy = /^\d/.test(el.textContent.trim());
    wrapChars(el, isDigitHeavy);
    el.dataset.flipReady = 'true';
  });

  function wrapChars(node, digitsOnly) {
    var text = node.textContent;
    node.textContent = '';
    for (var i = 0; i < text.length; i++) {
      var span = document.createElement('span');
      span.className = 'flip-char';
      span.dataset.target = text[i];
      if (digitsOnly) span.dataset.digits = '1';
      span.textContent = '\u00a0';
      if (text[i] === ' ') span.style.width = '0.35em';
      node.appendChild(span);
    }
  }

  function flipChar(span, delay) {
    var target = span.dataset.target;
    if (target === ' ' || target === '-') {
      setTimeout(function () { span.textContent = target === ' ' ? '\u00a0' : target; }, delay);
      return;
    }

    var pool = span.dataset.digits ? FLAP_DIGITS : FLAP_CHARS;
    var flips = 6 + Math.floor(Math.random() * 6);
    var interval = 120 + Math.random() * 40;
    var count = 0;

    setTimeout(function () {
      function tick() {
        count++;
        span.style.transform = 'rotateX(-90deg)';

        setTimeout(function () {
          if (count < flips) {
            span.textContent = pool[Math.floor(Math.random() * pool.length)];
          } else {
            span.textContent = target;
          }
          span.style.transform = 'rotateX(0deg)';

          if (count < flips) {
            setTimeout(tick, interval * 0.7);
          }
        }, interval * 0.5);
      }
      tick();
    }, delay);
  }

  function flipElement(el) {
    if (el.dataset.flipped) return;
    el.dataset.flipped = 'true';
    var chars = el.querySelectorAll('.flip-char');
    chars.forEach(function (span, i) {
      flipChar(span, i * 80);
    });
  }

  // Observe reveal parents for visibility
  function findRevealParent(el) {
    var node = el;
    while (node) {
      if (node.classList && node.classList.contains('reveal')) return node;
      node = node.parentElement;
    }
    return null;
  }

  var observed = new Map();

  els.forEach(function (el) {
    var parent = findRevealParent(el);
    if (!parent) return;

    if (!observed.has(parent)) {
      observed.set(parent, []);

      var obs = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          if (!m.target.classList.contains('visible')) return;
          var targets = observed.get(m.target);
          if (!targets) return;
          targets.forEach(function (t, idx) {
            setTimeout(function () { flipElement(t); }, idx * 150);
          });
        });
      });

      obs.observe(parent, { attributes: true, attributeFilter: ['class'] });

      // Already visible
      if (parent.classList.contains('visible')) {
        setTimeout(function () {
          var targets = observed.get(parent);
          if (!targets) return;
          targets.forEach(function (t, idx) {
            setTimeout(function () { flipElement(t); }, idx * 150);
          });
        }, 0);
      }
    }

    observed.get(parent).push(el);
  });
})();
