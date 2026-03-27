/* ============================================
   VESTABOARD — Split-flap display animation
   Cycles through random characters before
   landing on the target, like a real board.
   ============================================ */
;(function () {
  var COLS = 18;
  var STATIC_ROWS = [
    "HI, I'M PATRICK",
    "I BUILD THINGS FOR"
  ];
  var PREFIX = 'THE ';
  var WORDS = ['WEB.', 'MOBILE.', 'CLOUD.', 'FUTURE.'];
  var FLAP_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.!?,\' ';
  var currentWordIndex = 0;
  var cycling = false;
  var entered = false;

  var board = document.getElementById('vestaboard');
  if (!board) return;

  // Build tile grid
  for (var r = 0; r < 3; r++) {
    var row = document.getElementById('vesta-row-' + r);
    for (var c = 0; c < COLS; c++) {
      var tile = document.createElement('div');
      tile.className = 'vesta-tile';
      var ch = document.createElement('span');
      ch.className = 'vesta-char';
      tile.appendChild(ch);
      row.appendChild(tile);
    }
  }

  /**
   * Flip a single tile through several random characters
   * before landing on the target character.
   */
  function flipTile(tile, targetChar, flips, onDone) {
    var charEl = tile.querySelector('.vesta-char');
    var count = 0;
    var flipInterval = 70 + Math.random() * 30; // ms per flap

    function doFlip() {
      count++;
      tile.classList.add('flipping');

      setTimeout(function () {
        if (count < flips) {
          // Show a random intermediate character
          charEl.textContent = FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)];
        } else {
          // Final character
          charEl.textContent = targetChar;
        }
        tile.classList.remove('flipping');

        if (count < flips) {
          setTimeout(doFlip, flipInterval * 0.3);
        } else if (onDone) {
          onDone();
        }
      }, flipInterval * 0.5);
    }

    doFlip();
  }

  function setRow(rowIndex, text, animate, accentStart, accentEnd) {
    var row = document.getElementById('vesta-row-' + rowIndex);
    var tiles = row.children;
    var padded = text;
    while (padded.length < COLS) padded += ' ';

    for (var i = 0; i < COLS; i++) {
      (function (idx) {
        var tile = tiles[idx];
        var charEl = tile.querySelector('.vesta-char');
        var newChar = padded[idx];

        if (accentStart !== undefined && idx >= accentStart && idx < accentEnd) {
          tile.classList.add('accent');
        } else {
          tile.classList.remove('accent');
        }

        if (charEl.textContent === newChar) return;

        if (animate) {
          // Stagger each tile, plus randomize flip count for realism
          var delay = idx * 60 + Math.random() * 40;
          var flips = newChar === ' ' ? 2 : 4 + Math.floor(Math.random() * 5);
          setTimeout(function () {
            flipTile(tile, newChar, flips);
          }, delay);
        } else {
          charEl.textContent = newChar;
        }
      })(i);
    }
  }

  function showWord(index, animate) {
    var word = WORDS[index];
    var text = PREFIX + word;
    setRow(2, text, animate, PREFIX.length, PREFIX.length + word.length);
  }

  function startCycling() {
    if (cycling) return;
    cycling = true;
    setInterval(function () {
      currentWordIndex = (currentWordIndex + 1) % WORDS.length;
      showWord(currentWordIndex, true);
    }, 3500);
  }

  function entrance() {
    if (entered) return;
    entered = true;
    setTimeout(function () { setRow(0, STATIC_ROWS[0], true); }, 100);
    setTimeout(function () { setRow(1, STATIC_ROWS[1], true); }, 1200);
    setTimeout(function () {
      showWord(0, true);
      setTimeout(startCycling, 3500);
    }, 2200);
  }

  // Wait for scroll-reveal to make the board visible
  var observer = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      if (board.classList.contains('visible')) {
        observer.disconnect();
        entrance();
        return;
      }
    }
  });

  observer.observe(board, { attributes: true, attributeFilter: ['class'] });

  // Fallback if already visible on load
  if (board.classList.contains('visible')) {
    entrance();
  }
})();
