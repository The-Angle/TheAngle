document.addEventListener('DOMContentLoaded', function () {
  var btn = document.querySelector('.mobile-menu-btn');
  var nav = document.querySelector('nav');

  if (!btn || !nav) return;

  btn.addEventListener('click', function () {
    nav.classList.toggle('open');
  });

  // Close nav on resize to desktop
  window.addEventListener('resize', function () {
    if (window.innerWidth > 768) {
      nav.classList.remove('open');
    }
  });
});
