/**
 * Inline theme init: runs before first paint to avoid flash.
 * Reads adab-theme from localStorage or system preference and sets class on <html>.
 */
(function () {
  var stored = localStorage.getItem('adab-theme');
  var dark =
    stored === 'dark' ||
    (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
})();
