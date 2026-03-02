/* ============================================
   TYPING ANIMATION
   ============================================ */
const typedElement = document.getElementById('typed-text');
const words = ['web.', 'mobile.', 'cloud.', 'future.'];
let wordIndex = 0;
let charIndex = 0;
let isDeleting = false;

function type() {
  const currentWord = words[wordIndex];

  if (isDeleting) {
    charIndex--;
    typedElement.textContent = currentWord.substring(0, charIndex);
  } else {
    charIndex++;
    typedElement.textContent = currentWord.substring(0, charIndex);
  }

  let speed = isDeleting ? 50 : 100;

  if (!isDeleting && charIndex === currentWord.length) {
    speed = 2000;
    isDeleting = true;
  } else if (isDeleting && charIndex === 0) {
    isDeleting = false;
    wordIndex = (wordIndex + 1) % words.length;
    speed = 500;
  }

  setTimeout(type, speed);
}

type();
