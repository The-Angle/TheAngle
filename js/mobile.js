document.addEventListener('DOMContentLoaded', function () {
  if (window.__angleMobileMenuBound) return;
  window.__angleMobileMenuBound = true;

  var btn = document.querySelector('.mobile-menu-btn');
  var nav = document.querySelector('nav');
  var tabs = document.querySelector('.tabs-container');

  if (!btn || (!nav && !tabs)) return;

  btn.addEventListener('click', function () {
    var isOpen = false;
    if (nav) {
      nav.classList.toggle('open');
      nav.classList.toggle('active');
      isOpen = nav.classList.contains('open') || nav.classList.contains('active');
    }

    if (tabs) {
      tabs.classList.toggle('active', isOpen || !tabs.classList.contains('active'));
      isOpen = isOpen || tabs.classList.contains('active');
    }

    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

    var icon = btn.querySelector('i');
    if (icon) {
      icon.classList.toggle('fa-bars', !isOpen);
      icon.classList.toggle('fa-times', isOpen);
    }
  });

  // Close nav on resize to desktop
  window.addEventListener('resize', function () {
    if (window.innerWidth > 980) {
      if (nav) {
        nav.classList.remove('open');
        nav.classList.remove('active');
      }
      if (tabs) tabs.classList.remove('active');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
});
