const THEME_STORAGE_KEY = 'sitevision-utilities-color-scheme';

/**
 * @param {string | null} theme
 */
function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.dataset.theme = theme;
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

try {
  applyTheme(localStorage.getItem(THEME_STORAGE_KEY));

  window.addEventListener('storage', (event) => {
    if (event.key === THEME_STORAGE_KEY || event.key === null) {
      applyTheme(event.newValue);
    }
  });
} catch {
  applyTheme('auto');
}
