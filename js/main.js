/**
 * PUBG PC Tactical Wiki - Main Application Controller
 * Handles global navigation, mobile drawer, keyboard shortcuts, and i18n bootup
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize i18n Engine
  if (window.i18n) {
    await window.i18n.init();
  }

  // 2. Mobile Drawer Navigation
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const mobileDrawer = document.getElementById('mobileDrawer');
  if (mobileToggle && mobileDrawer) {
    mobileToggle.addEventListener('click', () => {
      mobileDrawer.classList.toggle('open');
    });

    // Close when clicking any nav link in drawer
    mobileDrawer.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        mobileDrawer.classList.remove('open');
      });
    });
  }

  // 3. Highlight Active Navigation Item
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach((link) => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // 4. Global Keyboard Shortcuts (Press '/' to focus search)
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      const searchInput = document.getElementById('weaponSearchInput') || document.getElementById('globalSearchInput');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      } else {
        window.location.href = 'weapons.html';
      }
    }
  });
});
