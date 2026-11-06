// Site-wide style switch: "hub" (Study Hub look) or "classic" (the study tool's own look).
// Loaded as a classic script in <head> so each page paints in the saved style without a flash.
const THEME_KEY = 'site-theme';
const root = document.documentElement;
let savedTheme = null;
try { savedTheme = localStorage.getItem(THEME_KEY); } catch { /* Storage unavailable: use the default. */ }
root.dataset.theme = savedTheme === 'classic' ? 'classic' : 'hub';

document.addEventListener('DOMContentLoaded', () => {
  const bar = document.createElement('div');
  bar.className = 'theme-bar';
  bar.innerHTML = `<div class="theme-bar-inner">
    <a class="theme-home" href="/">Study Hub home</a>
    <div class="theme-switch" role="group" aria-label="Site style">
      <span class="theme-switch-label">Style</span>
      <button type="button" data-set-theme="hub">Study Hub</button>
      <button type="button" data-set-theme="classic">Study tool</button>
    </div>
  </div>`;
  document.body.prepend(bar);
  const sync = () => bar.querySelectorAll('[data-set-theme]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.setTheme === root.dataset.theme)));
  bar.addEventListener('click', event => {
    const button = event.target.closest('[data-set-theme]');
    if (!button) return;
    root.dataset.theme = button.dataset.setTheme;
    try { localStorage.setItem(THEME_KEY, button.dataset.setTheme); } catch { /* The choice lasts for this page only. */ }
    sync();
  });
  sync();
});
