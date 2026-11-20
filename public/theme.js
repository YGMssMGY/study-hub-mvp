// Site-wide style switch: "hub" (shown as USC, the Study Hub look), "classic" (shown as Lockin, the study tool's own look)
// or "immersive" (the night-sky world of /immersive/).
// Loaded as a classic script in <head> so each page paints in the saved style without a flash.
const THEME_KEY = 'site-theme';
const THEMES = ['hub', 'classic', 'immersive'];
const toTheme = value => THEMES.includes(value) ? value : 'hub';
const root = document.documentElement;
let savedTheme = null;
try { savedTheme = localStorage.getItem(THEME_KEY); } catch { /* Storage unavailable: use the default. */ }
root.dataset.theme = toTheme(savedTheme);
// Inside the Prof. AI side panel: no switch of its own; follow the page around it instead.
const framed = window.self !== window.top;
if (framed) root.classList.add('framed');

// Immersive's home page is /immersive/, so the landing page forwards there. Only ever in that one
// direction (the immersive page never forwards back), so there is no loop. Landing-page anchors map
// to the matching immersive scene.
const onHome = location.pathname === '/' || location.pathname === '/index.html';
const onImmersiveHome = /^\/immersive(\/|\/index\.html)?$/.test(location.pathname);
const IMMERSIVE_HASH = { '#classes': '#classes', '#how-it-works': '#guide', '#study-tool': '#guide' };
const goImmersiveHome = () => location.replace(`/immersive/${IMMERSIVE_HASH[location.hash] || ''}`);
if (onHome && !framed && root.dataset.theme === 'immersive') {
  root.style.visibility = 'hidden'; // don't flash the USC landing page on the way out
  goImmersiveHome();
}

let syncSwitch = () => {};
window.addEventListener('storage', event => {
  if (event.key !== THEME_KEY) return;
  root.dataset.theme = toTheme(event.newValue);
  syncSwitch();
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
    <button type="button" data-set-theme="classic">Lockin</button>
    <button type="button" data-set-theme="immersive">Immersive</button>`;
  slot.append(group);
  syncSwitch = () => group.querySelectorAll('[data-set-theme]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.setTheme === root.dataset.theme)));
  group.addEventListener('click', event => {
    const button = event.target.closest('[data-set-theme]');
    if (!button) return;
    const theme = button.dataset.setTheme;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* The choice lasts for this page only. */ }
    // Each style has its own home: leaving the immersive page for USC or Lockin lands on /, and
    // choosing Immersive on / goes to the immersive page.
    if (onImmersiveHome && theme !== 'immersive') { location.assign('/'); return; }
    if (onHome && theme === 'immersive') { goImmersiveHome(); return; }
    root.dataset.theme = theme;
    syncSwitch();
  });
  syncSwitch();
});
