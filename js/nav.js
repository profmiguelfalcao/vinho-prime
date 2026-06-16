/* ============================================================
   Vinho Prime — Menu Mobile (compartilhado entre todas as páginas)
   ============================================================ */
function toggleMobileNav() {
  var nav    = document.getElementById('mobile-nav');
  var toggle = document.getElementById('menu-toggle');
  if (!nav || !toggle) return;
  var isOpen = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
}
function closeMobileNav() {
  var nav    = document.getElementById('mobile-nav');
  var toggle = document.getElementById('menu-toggle');
  if (!nav || !toggle) return;
  nav.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}
function closeMobileNavOutside(e) {
  if (e.target === document.getElementById('mobile-nav')) closeMobileNav();
}
