// Prof. AI side panel: a button that slides the tutor in from the right on any page that loads this script.
// The tutor runs in a same-site frame so its styles and state stay separate from the host page.
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'prof-ai-toggle';
  toggle.setAttribute('aria-controls', 'prof-ai-panel');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<span class="prof-ai-toggle-dot" aria-hidden="true">AI</span>Ask Prof. AI';

  const panel = document.createElement('aside');
  panel.id = 'prof-ai-panel';
  panel.className = 'prof-ai-panel';
  panel.setAttribute('aria-label', 'Prof. AI chat');
  panel.innerHTML = `<div class="prof-ai-panel-head">
      <span class="prof-ai-panel-title">Prof. AI</span>
      <a href="/prof-ai/" target="_blank" rel="noopener">Open full page</a>
      <button type="button" class="prof-ai-close" aria-label="Close Prof. AI">×</button>
    </div>`;

  let frame = null;
  const setOpen = open => {
    // Load the tutor on first open, then keep it so the conversation survives closing the panel.
    if (open && !frame) {
      frame = document.createElement('iframe');
      frame.title = 'Prof. AI chat';
      frame.src = '/prof-ai/';
      panel.append(frame);
    }
    panel.classList.toggle('open', open);
    document.body.classList.toggle('prof-ai-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open) frame.focus(); else toggle.focus();
  };

  toggle.addEventListener('click', () => setOpen(true));
  panel.querySelector('.prof-ai-close').addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && panel.classList.contains('open')) setOpen(false); });
  document.body.append(toggle, panel);
});
