/* ============================================
   NAVIGATION
   ============================================ */
const nav = document.getElementById('nav');
const navToggle = document.getElementById('nav-toggle');
const mobileMenu = document.getElementById('mobile-menu');

// Scrolled style + hide on scroll down / show on scroll up
let lastScrollY = window.scrollY;
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  nav.classList.toggle('scrolled', y > 50);
  if (y > 200 && y > lastScrollY + 4) {
    nav.classList.add('is-hidden');
  } else if (y < lastScrollY - 4 || y <= 200) {
    nav.classList.remove('is-hidden');
  }
  lastScrollY = y;
});

// Mobile toggle
navToggle.addEventListener('click', () => {
  navToggle.classList.toggle('active');
  mobileMenu.classList.toggle('open');
  const open = mobileMenu.classList.contains('open');
  document.body.style.overflow = open ? 'hidden' : '';
  if (window.__lenis) open ? window.__lenis.stop() : window.__lenis.start();
});

// Close mobile menu on link click
document.querySelectorAll('.mobile-link').forEach(link => {
  link.addEventListener('click', () => {
    navToggle.classList.remove('active');
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
    if (window.__lenis) window.__lenis.start();
  });
});

// Active nav link on scroll
const sections = document.querySelectorAll('.section, .hero, .projects');
const navLinks = document.querySelectorAll('.nav-link');

function updateActiveNav() {
  let current = '';
  sections.forEach(section => {
    const top = section.offsetTop - 120;
    if (window.scrollY >= top) {
      current = section.getAttribute('id');
    }
  });

  // Highlight Contact when scrolled to the very bottom even if the section is short
  if ((window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 2) {
    current = 'contact';
  }

  navLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === '#' + current);
  });
}

window.addEventListener('scroll', updateActiveNav);
