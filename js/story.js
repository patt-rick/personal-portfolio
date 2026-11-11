/* ==========================================================
   story.js: the home page intro.
   The name draws itself on, then the bio appears word by word while
   everything below it waits, blurred. Fast forward, Skip, Esc, scrolling,
   following a link or tabbing into the page all end it at once.

   The head script adds html.story-pending before first paint when the
   intro should play (motion allowed, not played this session, no #hash).
   This script swaps it for html.story-playing. If this script never runs,
   the head script's 3s safety net removes story-pending.
   Hidden words use opacity, so screen readers can read the whole bio.
   ========================================================== */
(function () {
  const root = document.documentElement;
  if (!root.classList.contains('story-pending')) return;

  const story = document.getElementById('story');
  const intro = document.querySelector('.intro');
  if (!story || !intro) return finishQuietly();

  window.__storyStarted = true;

  const WORD_MS = 28;
  const UNIT_PAUSE_MS = 110; // after a chip or highlighted phrase
  const PARA_PAUSE_MS = 420;
  const NAME_MS = 1300;

  let units = [];
  let speed = 1;
  let timer = 0;
  let done = false;
  let controls = null;
  let ffButton = null;

  try {
    units = tokenise(story);
  } catch (e) {
    return finishQuietly();
  }

  root.classList.add('story-playing');
  root.classList.remove('story-pending');
  try {
    buildControls();
    addListeners();
    timer = setTimeout(next, NAME_MS);
  } catch (e) {
    finish();
  }

  /* ---------- Split paragraphs into reveal units ---------- */
  function tokenise(container) {
    const list = [];
    container.querySelectorAll('p').forEach((p) => {
      const children = Array.from(p.childNodes);
      children.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const parts = node.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(part));
            } else {
              const span = document.createElement('span');
              span.className = 'u';
              span.textContent = part;
              frag.appendChild(span);
              list.push({ el: span, pause: WORD_MS });
            }
          });
          p.replaceChild(frag, node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          node.classList.add('u');
          list.push({ el: node, pause: UNIT_PAUSE_MS });
        }
      });
      if (list.length) list[list.length - 1].pause += PARA_PAUSE_MS;
    });
    return list;
  }

  /* ---------- Reveal loop ---------- */
  let i = 0;
  function next() {
    if (done) return;
    if (i >= units.length) return finish();
    const unit = units[i++];
    unit.el.classList.add('on');
    timer = setTimeout(next, unit.pause / speed);
  }

  function finish() {
    if (done) return;
    done = true;
    clearTimeout(timer);
    units.forEach((u) => u.el.classList.add('on'));
    root.classList.remove('story-playing');
    root.classList.add('story-done');
    try {
      sessionStorage.setItem('storyPlayed', '1');
    } catch (e) {}
    removeListeners();
    if (controls) {
      // Keep focus somewhere sensible if it was on a control.
      if (controls.contains(document.activeElement)) {
        story.setAttribute('tabindex', '-1');
        story.focus({ preventScroll: true });
      }
      controls.remove();
    }
  }

  function finishQuietly() {
    root.classList.remove('story-pending');
  }

  /* ---------- Controls: placed right after the intro in the DOM ---------- */
  function buildControls() {
    controls = document.createElement('div');
    controls.className = 'story-controls';
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', 'Intro');

    ffButton = document.createElement('button');
    ffButton.type = 'button';
    ffButton.className = 'story-btn';
    ffButton.setAttribute('aria-pressed', 'false');
    ffButton.innerHTML =
      '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M1 3l6 5-6 5zM8 3l6 5-6 5z" fill="currentColor"/></svg><span>Fast forward</span>';
    ffButton.addEventListener('click', () => {
      speed = speed === 1 ? 4 : 1;
      ffButton.setAttribute('aria-pressed', String(speed > 1));
    });

    const skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'story-btn';
    skip.textContent = 'Skip';
    skip.addEventListener('click', finish);

    controls.append(ffButton, skip);
    intro.after(controls);
  }

  /* ---------- Things that end the intro ---------- */
  const lockedSelector = '#story, #after-story, .footer, .nav';

  function onKey(e) {
    if (e.key === 'Escape') return finish();
    const onControl = e.target.closest && e.target.closest('button, a, input, textarea, select');
    if ((e.key === 'Enter' || e.key === ' ') && !onControl) {
      e.preventDefault();
      finish();
    }
  }
  function onScroll() {
    if (scrollY > 4) finish();
  }
  function onFocusIn(e) {
    if (e.target.closest && e.target.closest('#after-story, .footer, #story a')) finish();
  }
  function onClick(e) {
    const link = e.target.closest && e.target.closest('a[href]');
    if (link && link.closest(lockedSelector)) finish();
  }

  function addListeners() {
    addEventListener('keydown', onKey);
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('hashchange', finish);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('click', onClick, true);
  }
  function removeListeners() {
    removeEventListener('keydown', onKey);
    removeEventListener('scroll', onScroll);
    removeEventListener('hashchange', finish);
    document.removeEventListener('focusin', onFocusIn);
    document.removeEventListener('click', onClick, true);
  }
})();
