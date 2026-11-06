// Site-wide style switch: "hub" (shown as USC, the Study Hub look) or "classic" (shown as Lockin, the study tool's own look).
// Loaded as a classic script in <head> so each page paints in the saved style without a flash.
const THEME_KEY = 'site-theme';
const root = document.documentElement;
let savedTheme = null;
try { savedTheme = localStorage.getItem(THEME_KEY); } catch { /* Storage unavailable: use the default. */ }
root.dataset.theme = savedTheme === 'classic' ? 'classic' : 'hub';
// Inside the Prof. AI side panel: no switch of its own; follow the page around it instead.
const framed = window.self !== window.top;
if (framed) root.classList.add('framed');
window.addEventListener('storage', event => {
  if (event.key === THEME_KEY) root.dataset.theme = event.newValue === 'classic' ? 'classic' : 'hub';
});

// The switch goes inside the page's own header, at the element marked data-theme-slot.
document.addEventListener('DOMContentLoaded', () => {
  const slot = document.querySelector('[data-theme-slot]');
  if (framed || !slot) return;
  const group = document.createElement('div');
  group.className = 'theme-switch';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Site style');
  group.innerHTML = `<span class="theme-switch-label">Style</span>
    <button type="button" data-set-theme="hub">USC</button>
    <button type="button" data-set-theme="classic">Lockin</button>`;
  slot.append(group);
  const sync = () => group.querySelectorAll('[data-set-theme]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.setTheme === root.dataset.theme)));
  group.addEventListener('click', event => {
    const button = event.target.closest('[data-set-theme]');
    if (!button) return;
    root.dataset.theme = button.dataset.setTheme;
    try { localStorage.setItem(THEME_KEY, button.dataset.setTheme); } catch { /* The choice lasts for this page only. */ }
    sync();
  });
  sync();
});
