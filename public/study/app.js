import { STORAGE_KEY, allSubtopics, correctCount, isMastered, recordAttempt, prioritizedQuestions, focusIds, validSession, DECK_KEY, emptyDeck, validDeck, schedule, addCard, dueCards, nextDue, waitLabel } from './state.js';
import { demoStudy } from './demo.js';

const $ = (selector, root = document) => root.querySelector(selector);
const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let study = null, files = [], queue = [], tab = 'practice', busy = false, apiStatus = null, toastTimer, saveTimer;
const pending = new Set(), mastering = new Set(), reviewed = new Map();
let deck = emptyDeck(), reviewQueue = [];
try { const saved = JSON.parse(localStorage.getItem(DECK_KEY)); if (validDeck(saved)) deck = saved; } catch { /* No review deck yet. */ }
try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (validSession(saved)) study = saved; } catch { /* Fresh browser or unavailable storage. */ }

// Layout: the dividers between the three panels can be dragged, and "Full page" drops the page chrome
// so the panels fill the window. Both are remembered in this browser.
const LAYOUT_KEY = 'study-layout-v1', DEFAULT_LAYOUT = { x: 50, y: 70, full: false };
let layout = { ...DEFAULT_LAYOUT };
try { const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY)); if (saved && typeof saved === 'object') layout = { ...layout, ...saved }; } catch { /* Default layout. */ }
const clampSplit = value => Math.min(80, Math.max(20, Number(value) || 50));
function applyLayout(save = false) {
  layout.x = clampSplit(layout.x); layout.y = clampSplit(layout.y);
  document.body.style.setProperty('--split-x', `${layout.x}%`); document.body.style.setProperty('--split-y', `${layout.y}%`);
  document.body.classList.toggle('full-page', Boolean(layout.full));
  if (save) try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)); } catch { /* Not remembered. */ }
}
function bindSplit(handle, axis) {
  const box = handle.parentElement;
  const percent = event => { const r = box.getBoundingClientRect(); return axis === 'x' ? (event.clientX - r.left) / r.width * 100 : (event.clientY - r.top) / r.height * 100; };
  let active = false;
  handle.addEventListener('pointerdown', event => {
    event.preventDefault(); active = true; handle.classList.add('dragging');
    try { handle.setPointerCapture(event.pointerId); } catch { /* Dragging still works while the pointer stays on the handle. */ }
  });
  handle.addEventListener('pointermove', event => { if (active) { layout[axis] = percent(event); applyLayout(); } });
  const stop = () => { if (!active) return; active = false; handle.classList.remove('dragging'); applyLayout(true); };
  handle.addEventListener('pointerup', stop); handle.addEventListener('pointercancel', stop);
  handle.addEventListener('dblclick', () => { layout[axis] = DEFAULT_LAYOUT[axis]; applyLayout(true); });
  handle.addEventListener('keydown', event => {
    const step = (axis === 'x' ? { ArrowLeft: -3, ArrowRight: 3 } : { ArrowUp: -3, ArrowDown: 3 })[event.key];
    if (step) { event.preventDefault(); layout[axis] += step; applyLayout(true); }
  });
}
function toggleFullPage() { layout.full = !layout.full; applyLayout(true); const b = $('#full-page'); if (b) { b.innerHTML = fullPageLabel(); b.setAttribute('aria-pressed', layout.full); } }
function fullPageLabel() { return layout.full ? 'Exit full page <span>×</span>' : 'Full page <span>⤢</span>'; }
document.addEventListener('keydown', event => { if (event.key === 'Escape' && layout.full && document.body.classList.contains('in-workspace') && !$('#settings-dialog').open) toggleFullPage(); });
applyLayout();

function toast(message) {
  const box = $('#toast'); box.textContent = message; box.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { box.hidden = true; }, 4500);
}
function persist() {
  try { if (study) localStorage.setItem(STORAGE_KEY, JSON.stringify(study)); }
  catch { toast('This browser could not save progress. Download a study backup in Settings.'); }
}
function persistDeck() { try { localStorage.setItem(DECK_KEY, JSON.stringify(deck)); } catch { /* persist() already warns about storage. */ } }
function openReview() { reviewQueue = dueCards(deck).map(c => c.id); reviewed.clear(); tab = 'review'; renderWorkspace(); }
function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(persist, 500); }
async function api(action, data = {}) {
  let response;
  try {
    response = await fetch('/api/study', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Study-Access': sessionStorage.getItem('study-access') || '' },
      body: JSON.stringify({ action, ...data }), signal: AbortSignal.timeout(115000)
    });
  } catch (error) { throw new Error(error.name === 'TimeoutError' ? 'This is taking longer than expected. Try fewer pages.' : 'Could not connect. Check your connection and try again.'); }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'The AI request failed. Refresh and try again.');
  return body;
}
async function checkConnection() {
  try { const r = await fetch('/api/study'); if (r.ok) apiStatus = await r.json(); } catch { /* Static Sites preview. */ }
  $('#connection-label').textContent = apiStatus?.configured ? 'AI connected' : apiStatus ? 'AI not configured' : 'AI unavailable';
}

function renderLanding() {
  document.body.classList.remove('in-workspace');
  $('#main').innerHTML = `<section class="landing">
    <section class="upload-panel" aria-labelledby="upload-title">
      <h1 id="upload-title">Upload materials</h1>
      <div class="drop-zone" id="drop-zone">
        <svg class="drop-icon" viewBox="0 0 34 38" fill="none" aria-hidden="true"><path d="M6 1h15l7 7v29H6V1Z" stroke="currentColor"/><path d="M21 1v8h7M17 29V15m-5 5 5-5 5 5" stroke="currentColor"/></svg>
        <div class="drop-title">Drop files or <u>browse</u></div>
        <div class="drop-help">PDF, PPTX, TXT, MD · 3 MB total · up to 4 files</div>
        <input class="file-input" id="file-input" type="file" accept=".pdf,.pptx,.txt,.md" multiple aria-label="Upload study materials">
      </div>
      <div class="file-list" id="file-list"></div>
      <button class="button primary upload-action" id="build-study" disabled>Create session <span>→</span></button>
      <div id="upload-feedback" aria-live="polite"></div>
      <p class="privacy-note">Files are processed by AI. Progress is saved in this browser.<br>For diagrams, export slides as PDF.</p>
      <div class="upload-links">${study ? `<button id="resume-study" class="text-button">Resume ${e(study.title)}</button>${dueCards(deck).length ? `<button id="open-review" class="text-button">Review ${dueCards(deck).length} due</button>` : ''}` : ''}<button class="text-button" id="explore-sample">Open sample</button></div>
    </section>
  </section>`;
  $('#file-input').addEventListener('change', event => addFiles([...event.target.files]));
  const zone = $('#drop-zone');
  for (const name of ['dragenter', 'dragover']) zone.addEventListener(name, event => { event.preventDefault(); zone.classList.add('dragging'); });
  for (const name of ['dragleave', 'drop']) zone.addEventListener(name, event => { event.preventDefault(); zone.classList.remove('dragging'); });
  zone.addEventListener('drop', event => addFiles([...event.dataTransfer.files]));
  $('#build-study').addEventListener('click', buildStudy);
  $('#explore-sample').addEventListener('click', () => {
    if (study && !study.demo && !confirm('Replace the saved study session with the sample? Download a backup in Settings to keep it.')) return;
    study = demoStudy(); queue = prioritizedQuestions(study); tab = 'practice'; persist(); renderWorkspace();
  });
  $('#resume-study')?.addEventListener('click', () => { if (!queue.length) queue = prioritizedQuestions(study); renderWorkspace(); });
  $('#open-review')?.addEventListener('click', openReview);
  renderFiles();
}
function uploadError(message) { if ($('#upload-feedback')) $('#upload-feedback').innerHTML = `<p class="upload-error" role="alert">${e(message)}</p>`; }
function addFiles(incoming) {
  if (busy) return;
  const combined = [...files];
  for (const f of incoming) {
    if (!/\.(pdf|pptx|txt|md)$/i.test(f.name)) return uploadError('Choose PDF, PPTX, TXT, or MD files. Export older slides as PDF.');
    if (!f.size) return uploadError(`${f.name} is empty.`);
    if (!combined.some(old => old.name === f.name && old.size === f.size)) combined.push(f);
  }
  if (combined.length > 4) return uploadError('Choose up to four files for this session.');
  if (combined.reduce((sum, f) => sum + f.size, 0) > 3 * 1024 * 1024) return uploadError('Keep the combined upload under 3 MB. Try exporting a smaller section as PDF.');
  files = combined; $('#upload-feedback').textContent = ''; renderFiles();
}
function renderFiles() {
  $('#file-list').innerHTML = files.map((file, i) => `<div class="file-row"><span class="file-ext">${e(file.name.split('.').pop().toUpperCase())}</span><span class="file-name">${e(file.name)}</span><span class="muted">${Math.ceil(file.size / 1024)} KB</span><button class="icon-button" data-remove="${i}" aria-label="Remove ${e(file.name)}">×</button></div>`).join('');
  $('#build-study').disabled = !files.length || busy;
  document.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => { if (!busy) { files.splice(Number(button.dataset.remove), 1); renderFiles(); } }));
}
function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.onload = () => resolve({ name: file.name, data: reader.result.split(',')[1] }); reader.readAsDataURL(file);
  });
}
async function buildStudy() {
  if (busy || !files.length) return;
  if (apiStatus?.requiresAccessCode && !sessionStorage.getItem('study-access')) { openSettings(); return; }
  busy = true; renderFiles(); $('#file-input').disabled = true; $('#explore-sample').disabled = true;
  const stages = ['Reading files…', 'Identifying topics…', 'Creating questions…']; let stage = 0;
  const loading = () => { $('#upload-feedback').innerHTML = `<div class="loading-block"><span class="loading-indicator"></span><div><p>${stages[stage]}</p><small>This can take a minute. Keep this page open.</small></div></div>`; };
  loading(); const timer = setInterval(() => { stage = Math.min(stage + 1, 2); loading(); }, 14000);
  try {
    const result = await api('analyze', { files: await Promise.all(files.map(readFile)) });
    study = { ...result, version: 1, attempts: [], drafts: {}, files: files.map(f => f.name), demo: false };
    if (!validSession(study)) throw new Error('The study set could not be loaded. Please try again.');
    deck.cards = deck.cards.filter(c => !c.demo); persistDeck(); clearTimeout(saveTimer); persist(); files = []; queue = prioritizedQuestions(study); tab = 'practice'; renderWorkspace(); toast('Session created.');
  } catch (error) { uploadError(error.message); }
  finally { clearInterval(timer); busy = false; if ($('#file-input')) { $('#file-input').disabled = false; $('#explore-sample').disabled = false; renderFiles(); } }
}

function subtopic(id) { return allSubtopics(study).find(s => s.id === id); }
function renderWorkspace() {
  document.body.classList.add('in-workspace');
  const total = allSubtopics(study).length, mastered = allSubtopics(study).filter(s => isMastered(study, s.id)).length;
  const originalCount = study.questions.filter(q => q.origin === 'uploaded').length;
  $('#main').innerHTML = `<section class="workspace">
    <div class="workspace-heading"><h1>${e(study.title)}</h1><p>${e(study.files?.join(' · ') || '')}</p></div>
    <div class="workspace-tools"><button class="button secondary" id="new-material">Upload materials <span>+</span></button><div class="workspace-tools-right"><button class="button secondary" id="full-page" aria-pressed="${Boolean(layout.full)}" title="Fill the window with the study panels (Esc to exit)">${fullPageLabel()}</button><details class="export-menu"><summary class="button secondary">Export notes <span>↓</span></summary><div class="export-options"><button id="export-pdf">Print / Save as PDF</button><button id="export-markdown">Markdown</button><button id="export-backup">Study backup</button></div></details></div></div>
    ${study.demo ? `<div class="sample-banner"><span>Sample materials · Written answers are graded by AI.</span><button id="sample-upload" class="text-button">Upload materials →</button></div>` : ''}
    <div class="desk-grid"><div class="split-handle split-x" role="separator" aria-orientation="vertical" tabindex="0" aria-label="Resize notes and practice. Drag, or use the arrow keys; double-click to reset." title="Drag to resize · double-click to reset"></div>
      <section class="desk-panel review-panel"><div class="panel-header"><h2>Review notes <span class="panel-counter">${new Set(study.attempts.map(a => a.subtopicId)).size}</span></h2></div><div class="panel-content" id="review-content"></div></section>
    <aside class="practice-column" aria-label="Practice and to-do"><div class="split-handle split-y" role="separator" aria-orientation="horizontal" tabindex="0" aria-label="Resize practice and to-do. Drag, or use the arrow keys; double-click to reset." title="Drag to resize · double-click to reset"></div><section class="practice-panel" aria-label="Practice problems">
      <div class="panel-header practice-header"><h2>Practice problems</h2></div>
      <div class="tab-bar" role="tablist" aria-label="Practice views"><button class="tab" role="tab" data-tab="practice" aria-selected="${tab === 'practice'}">Practice <span class="tab-count">${study.questions.length}</span></button><button class="tab" role="tab" data-tab="uploaded" aria-selected="${tab === 'uploaded'}">Uploaded <span class="tab-count">${originalCount}</span></button><button class="tab" role="tab" data-tab="review" aria-selected="${tab === 'review'}">Review <span class="tab-count">${dueCards(deck).length}</span></button>${tab.startsWith('examples:') ? `<button class="tab" role="tab" data-tab="${e(tab)}" aria-selected="true">${e(subtopic(tab.slice(9))?.title)} · Examples</button>` : ''}</div>
      <div class="practice-toolbar"><span class="muted small" id="feed-label">${tab.startsWith('examples:') ? 'Completed examples' : tab === 'review' ? 'Due now · all your topics, mixed' : `${study.attempts.length} answered · concepts mixed`}</span><button id="shuffle" class="text-button">Shuffle <span>⇄</span></button></div>
      <div class="practice-feed" id="practice-feed" role="tabpanel"></div>
    </section><section class="desk-panel todo-panel"><div class="panel-header"><h2>To-do <span class="panel-counter">${total - mastered}</span></h2></div><div class="panel-content" id="todo-content"></div></section></aside></div>
    <div class="workspace-notice"><span>Mastery: 2 correct answers per topic. Answered questions come back in Review after 1, 3, 7, 14 and 30 days; missed ones after 10 minutes.</span><span>Saved locally · Check AI feedback</span></div>
  </section>`;
  renderTodo(); renderNotes(); renderFeed();
  bindSplit($('.split-x'), 'x'); bindSplit($('.split-y'), 'y'); $('#full-page').addEventListener('click', toggleFullPage);
  $('#new-material').addEventListener('click', renderLanding); $('#sample-upload')?.addEventListener('click', renderLanding);
  document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => { if (button.dataset.tab === 'review') return openReview(); tab = button.dataset.tab; renderWorkspace(); }));
  $('#shuffle').addEventListener('click', () => { queue = prioritizedQuestions(study); tab = 'practice'; renderWorkspace(); toast('Shuffled. Concepts mixed, unmastered ones first.'); });
  $('#export-pdf').addEventListener('click', printNotes); $('#export-markdown').addEventListener('click', exportMarkdown); $('#export-backup').addEventListener('click', downloadBackup);
}
function renderTodo() {
  const total = allSubtopics(study).length, mastered = allSubtopics(study).filter(s => isMastered(study, s.id)).length;
  const progress = `<div class="progress-meta"><span>${mastered} of ${total} concepts mastered</span><span>${Math.round(mastered / total * 100)}%</span></div><progress class="progress-track" value="${mastered}" max="${total}" aria-label="Concepts mastered">${mastered}/${total}</progress>`;
  const due = dueCards(deck).length, upcoming = nextDue(deck);
  const review = due ? `<button class="text-button review-callout" id="todo-review">${due} question${due === 1 ? '' : 's'} due for review →</button>` : upcoming ? `<p class="review-callout muted small">Next review in ${waitLabel(upcoming - Date.now())}.</p>` : '';
  $('#todo-content').innerHTML = progress + review + (mastered === total && !mastering.size ? `<div class="mastered-all"><h3>All topics mastered.</h3><p>Continue practicing or export your notes.</p></div>` : study.topics.map(topic => {
    const subs = topic.subtopics.filter(s => !isMastered(study, s.id) || mastering.has(s.id));
    if (!subs.length) return '';
    return `<div class="topic-group"><h3 class="topic-title">${e(topic.title)}</h3>${subs.map(s => `<div class="todo-item ${correctCount(study, s.id) === 1 ? 'practiced' : ''} ${mastering.has(s.id) ? 'mastering' : ''}" data-todo="${e(s.id)}"><span class="todo-square" aria-hidden="true"></span><div class="todo-text"><div class="todo-item-title">${e(s.title)}</div><div class="todo-source">${e(s.source)}</div></div><span class="todo-score">${Math.min(correctCount(study, s.id), 2)}/2</span></div>`).join('')}</div>`;
  }).join(''));
  $('#todo-review')?.addEventListener('click', openReview);
}
function renderNotes(flashId) {
  const attempted = new Set(study.attempts.map(a => a.subtopicId));
  $('#review-content').innerHTML = `<article class="notes-document" role="document">` + (attempted.size ? study.topics.map(topic => {
    const subs = topic.subtopics.filter(s => attempted.has(s.id)); if (!subs.length) return '';
    let lastSection = '';
    return `<section class="review-topic"><h2 class="chapter-heading">${e(topic.title)}</h2>${subs.map(s => {
      const wrong = study.attempts.filter(a => a.subtopicId === s.id && !a.correct && a.clarification);
      const notes = [...new Set(wrong.map(a => a.clarification))].slice(-3);
      const section = s.section && s.section !== lastSection ? `<h3 class="section-heading">${e(s.section)}</h3>` : ''; lastSection = s.section || '';
      return `${section}<details open class="review-note ${s.id === flashId ? 'note-flash' : ''}" data-note="${e(s.id)}"><summary><h4>${e(s.title)}${isMastered(study, s.id) ? ' ✓' : ''}</h4></summary>${outlineHTML(s)}${notes.map(n => `<div class="clarification"><strong>Clarification</strong><p>${e(n)}</p></div>`).join('')}<div class="note-tools"><span class="source-label">${e(s.source)}</span><button class="text-button example-button" data-examples="${e(s.id)}">Examples <span>↗</span></button></div></details>`;
    }).join('')}</section>`;
  }).join('') : `<div class="empty-panel"><p>Complete a question to add review notes.</p></div>`) + `</article>`;
  document.querySelectorAll('[data-examples]').forEach(button => button.addEventListener('click', () => { tab = `examples:${button.dataset.examples}`; renderWorkspace(); }));
  if (flashId) {
    const note = [...document.querySelectorAll('[data-note]')].find(n => n.dataset.note === flashId), container = $('#review-content');
    if (note) container.scrollTo({ top: note.offsetTop - container.offsetTop - 15, behavior: 'smooth' });
  }
}
function outlineHTML(concept) {
  const outline = concept.outline?.length ? concept.outline : [{ text: concept.content, children: [] }];
  return `<ul class="notes-outline">${outline.map(point => `<li>${e(point.text)}${point.children?.length ? `<ul>${point.children.map(child => `<li>${e(child.text)}${child.children?.length ? `<ul>${child.children.map(text => `<li>${e(text)}</li>`).join('')}</ul>` : ''}</li>`).join('')}</ul>` : ''}</li>`).join('')}</ul>`;
}
function questionCard(q, index, completedOnly = false) {
  const attempt = study.attempts.find(a => a.questionId === q.id), draft = study.drafts?.[q.id] || '';
  return `<article class="question-card" data-qid="${e(q.id)}"><div class="question-topline"><span class="question-index">${String(index + 1).padStart(2, '0')}.</span><span class="question-tag">${q.origin === 'uploaded' ? 'UPLOADED' : 'GENERATED'} · ${q.kind === 'written' ? 'WRITTEN' : 'MULTIPLE CHOICE'}</span></div><h3>${e(q.prompt)}</h3><div class="concept-label">${e(subtopic(q.subtopicId)?.title)}</div>
    ${attempt ? `<div class="attempt-answer"><span>Your answer</span>${e(attempt.answer)}</div>${feedbackHTML(attempt)}` : `<form data-answer-form="${e(q.id)}">${q.kind === 'multiple-choice' ? `<div class="answer-options">${q.options.map((option, i) => `<label class="option"><input type="radio" name="answer" value="${e(option)}" ${draft === option ? 'checked' : ''} required><span class="option-letter">${String.fromCharCode(65 + i)}</span><span class="option-text">${e(option)}</span></label>`).join('')}</div>` : `<label class="answer-label" for="answer-${e(q.id)}">Your answer</label><textarea class="written-answer" name="answer" id="answer-${e(q.id)}" placeholder="Type your answer…" maxlength="8000" required>${e(draft)}</textarea>`}<div class="question-bottom"><span class="question-source">↳ ${e(q.source)}</span><button type="submit" class="button primary">Check answer <span>↗</span></button></div><div class="answer-feedback" aria-live="polite"></div></form>`}
  </article>`;
}
function feedbackHTML(result) {
  return `<div class="feedback ${result.correct ? '' : 'incorrect'}"><div class="feedback-title">${result.correct ? '✓ Correct' : 'Incorrect'}</div><div>${e(result.feedback)}</div>${!result.correct && result.referenceAnswer ? `<div class="reference-answer"><span>Reference answer</span>${e(result.referenceAnswer)}</div>` : ''}</div>`;
}
function reviewCard(card, index) {
  const result = reviewed.get(card.id);
  return `<article class="question-card" data-rid="${e(card.id)}"><div class="question-topline"><span class="question-index">${String(index + 1).padStart(2, '0')}.</span><span class="question-tag">REVIEW · ${card.kind === 'written' ? 'WRITTEN' : 'MULTIPLE CHOICE'}</span></div><h3>${e(card.prompt)}</h3><div class="concept-label">${e(card.session)} · ${e(card.concept)}</div>
    ${result ? `<div class="attempt-answer"><span>Your answer</span>${e(result.answer)}</div>${feedbackHTML(result)}<p class="review-next">${result.correct ? 'Comes back' : 'Try it again'} in ${waitLabel(Date.parse(card.due) - Date.parse(card.last))}.</p>` : `<form data-review-form="${e(card.id)}">${card.kind === 'multiple-choice' ? `<div class="answer-options">${card.options.map((option, i) => `<label class="option"><input type="radio" name="answer" value="${e(option)}" required><span class="option-letter">${String.fromCharCode(65 + i)}</span><span class="option-text">${e(option)}</span></label>`).join('')}</div>` : `<label class="answer-label" for="review-${e(card.id)}">Your answer</label><textarea class="written-answer" name="answer" id="review-${e(card.id)}" placeholder="Type your answer…" maxlength="8000" required></textarea>`}<div class="question-bottom"><span class="question-source">↳ ${e(card.source)}</span><button type="submit" class="button primary">Check answer <span>↗</span></button></div><div class="answer-feedback" aria-live="polite"></div></form>`}
  </article>`;
}
function renderReview() {
  const cards = reviewQueue.map(id => deck.cards.find(c => c.id === id)).filter(Boolean), upcoming = nextDue(deck);
  const next = upcoming ? ` Next review in ${waitLabel(upcoming - Date.now())}.` : '';
  $('#practice-feed').innerHTML = cards.length
    ? cards.map(reviewCard).join('') + (cards.every(c => reviewed.has(c.id)) ? `<div class="practice-end"><p>Review done.${next}</p></div>` : '')
    : `<div class="empty-panel"><p>${deck.cards.length ? `Nothing is due.${next}` : 'Nothing to review yet. Questions you answer in Practice come back here after 1, 3, 7, 14 and 30 days, mixed across all your topics.'}</p></div>`;
  document.querySelectorAll('[data-review-form]').forEach(form => form.addEventListener('submit', event => { event.preventDefault(); submitReview(form); }));
}
async function submitReview(form) {
  const card = deck.cards.find(c => c.id === form.dataset.reviewForm), answer = String(new FormData(form).get('answer') || '').trim();
  if (!card || !answer || pending.has(card.id)) return;
  const output = $('.answer-feedback', form), submit = $('button[type=submit]', form);
  const finish = result => {
    pending.delete(card.id); schedule(card, result.correct); persistDeck(); reviewed.set(card.id, { ...result, answer });
    if (tab !== 'review' || !$('#practice-feed')) return;
    const scroll = $('#practice-feed').scrollTop; renderWorkspace(); $('#practice-feed').scrollTop = scroll;
  };
  if (card.demo && card.kind === 'multiple-choice') return finish({ correct: answer === card.demoAnswer, feedback: card.demoExplanation, referenceAnswer: card.demoAnswer });
  pending.add(card.id); submit.disabled = true; submit.textContent = 'Checking…'; output.textContent = '';
  try { finish(await api(card.demo ? 'grade-demo' : 'grade', card.demo ? { questionId: card.id, answer } : { questionToken: card.token, answer })); }
  catch (error) { output.innerHTML = `<p class="inline-error" role="alert">${e(error.message)}</p>`; pending.delete(card.id); submit.disabled = false; submit.innerHTML = 'Check answer <span>↗</span>'; }
}
function renderFeed() {
  if (tab === 'review') return renderReview();
  let questions;
  if (tab.startsWith('examples:')) {
    const attempted = new Set(study.attempts.map(a => a.questionId));
    questions = study.questions.filter(q => q.subtopicId === tab.slice(9) && attempted.has(q.id));
  } else if (tab === 'uploaded') questions = study.questions.filter(q => q.origin === 'uploaded');
  else {
    const ordered = new Map(queue.map((id, i) => [id, i]));
    questions = study.questions.filter(q => ordered.has(q.id)).sort((a, b) => ordered.get(a.id) - ordered.get(b.id));
  }
  const remaining = study.questions.filter(q => !study.attempts.some(a => a.questionId === q.id)).length;
  const ending = tab.startsWith('examples:') ? '' : `<div class="practice-end">${!remaining ? '<p>All questions completed.</p>' : ''}<button id="generate-more" class="button ${study.demo ? 'secondary' : 'primary'}">${study.demo ? 'Upload materials' : 'Generate questions'} <span>+</span></button><div id="generate-feedback" aria-live="polite"></div></div>`;
  $('#practice-feed').innerHTML = (questions.length ? questions.map((q, i) => questionCard(q, i)).join('') : `<div class="empty-panel"><p>${tab === 'uploaded' ? 'No uploaded practice problems found. See Practice for generated questions.' : 'No unanswered questions. Generate more or view completed examples in your notes.'}</p></div>`) + ending;
  document.querySelectorAll('[data-answer-form]').forEach(form => {
    form.addEventListener('input', () => { study.drafts ||= {}; study.drafts[form.dataset.answerForm] = new FormData(form).get('answer') || ''; scheduleSave(); });
    form.addEventListener('submit', event => { event.preventDefault(); submitAnswer(form); });
  });
  $('#generate-more')?.addEventListener('click', study.demo ? renderLanding : generateMore);
}
async function submitAnswer(form) {
  const activeStudy = study;
  const q = study.questions.find(q => q.id === form.dataset.answerForm), answer = String(new FormData(form).get('answer') || '').trim();
  if (!answer || pending.has(q.id)) return;
  const output = $('.answer-feedback', form), submit = $('button[type=submit]', form);
  const finish = result => {
    pending.delete(q.id);
    if (study !== activeStudy) return;
    const before = isMastered(study, q.subtopicId);
    if (recordAttempt(study, q, answer, result)) { addCard(deck, study, q, result.correct); persistDeck(); } if (study.drafts) delete study.drafts[q.id];
    const justMastered = !before && isMastered(study, q.subtopicId);
    if (justMastered) mastering.add(q.subtopicId);
    persist(); const scroll = $('#practice-feed').scrollTop; renderWorkspace(); $('#practice-feed').scrollTop = scroll; renderNotes(q.subtopicId);
    if (justMastered) {
      const container = $('#todo-content'), item = [...document.querySelectorAll('[data-todo]')].find(n => n.dataset.todo === q.subtopicId);
      if (item) container.scrollTo({ top: item.offsetTop - container.offsetTop - 40, behavior: 'smooth' });
      toast(`${subtopic(q.subtopicId).title} mastered. `);
      setTimeout(() => { const el = [...document.querySelectorAll('[data-todo]')].find(n => n.dataset.todo === q.subtopicId); el?.classList.add('removing'); }, 1000);
      setTimeout(() => { mastering.delete(q.subtopicId); if ($('#todo-content')) renderTodo(); }, 1800);
    }
  };
  if (study.demo && q.kind === 'multiple-choice') return finish({ correct: answer === q.demoAnswer, feedback: q.demoExplanation, clarification: answer === q.demoAnswer ? '' : q.demoExplanation, referenceAnswer: q.demoAnswer });
  pending.add(q.id); submit.disabled = true; submit.textContent = 'Checking…'; output.textContent = '';
  try { finish(await api(study.demo ? 'grade-demo' : 'grade', study.demo ? { questionId: q.id, answer } : { questionToken: q.token, answer })); }
  catch (error) { output.innerHTML = `<p class="inline-error" role="alert">${e(error.message)}</p>`; pending.delete(q.id); submit.disabled = false; submit.innerHTML = 'Check answer <span>↗</span>'; }
}
async function generateMore() {
  if (busy) return;
  if (study.questions.length >= 180) { toast('This session is full. Export your notes and start a new session.'); return; }
  const activeStudy = study;
  busy = true; const button = $('#generate-more'); button.disabled = true; button.textContent = 'Generating…';
  try {
    const result = await api('generate', { contextToken: study.contextToken, subtopicIds: focusIds(study), previousPrompts: study.questions.slice(-20).map(q => q.prompt) });
    if (study !== activeStudy) return;
    study.questions.push(...result.questions); queue.push(...result.questions.map(q => q.id)); persist();
    tab = 'practice'; renderWorkspace();
    const card = [...document.querySelectorAll('[data-qid]')].find(el => el.dataset.qid === result.questions[0]?.id), feed = $('#practice-feed');
    if (card) feed.scrollTo({ top: card.offsetTop - feed.offsetTop - 10, behavior: 'smooth' });
    toast('Questions added.');
  } catch (error) { if ($('#generate-feedback')) $('#generate-feedback').innerHTML = `<p class="inline-error" role="alert">${e(error.message)}</p>`; button.disabled = false; button.innerHTML = 'Generate questions <span>↗</span>'; }
  finally { busy = false; }
}

function notesMarkdown() {
  const attempted = new Set(study.attempts.map(a => a.subtopicId));
  return `# ${study.title}\n\nPersonalized review notes · ${new Date().toLocaleDateString()}\n\n` + study.topics.map(t => {
    const subs = t.subtopics.filter(s => attempted.has(s.id)); if (!subs.length) return '';
    let lastSection = '';
    return `## ${t.title}\n\n` + subs.map(s => {
      const section = s.section && s.section !== lastSection ? `### ${s.section}\n\n` : ''; lastSection = s.section || '';
      const outline = s.outline?.length ? s.outline.map(p => `- ${p.text}\n` + p.children.map(c => `  - ${c.text}\n` + c.children.map(text => `    - ${text}\n`).join('')).join('')).join('') : `- ${s.content}\n`;
      return `${section}${s.section ? '####' : '###'} ${s.title}${isMastered(study, s.id) ? ' [Mastered]' : ''}\n\n${outline}\nSource: ${s.source}\n\n` + [...new Set(study.attempts.filter(a => a.subtopicId === s.id && !a.correct && a.clarification).map(a => a.clarification))].map(n => `> Clarification: ${n}\n\n`).join('');
    }).join('');
  }).join('');
}
function download(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type })), a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportMarkdown() { if (!study.attempts.length) return toast('Answer a question first to start your review notes.'); download(notesMarkdown(), 'study-notes.md', 'text/markdown;charset=utf-8'); }
function printNotes() {
  if (!study.attempts.length) return toast('Answer a question first to start your review notes.');
  const details = [...document.querySelectorAll('.review-note')], openState = details.map(d => d.open); details.forEach(d => { d.open = true; });
  window.print(); details.forEach((d, i) => { d.open = openState[i]; });
}
function downloadBackup() { if (!study) return toast('Start a study session first.'); download(JSON.stringify(study, null, 2), 'study-backup.json', 'application/json'); }
function openSettings() {
  $('#access-code').value = sessionStorage.getItem('study-access') || '';
  $('#access-settings').hidden = !apiStatus?.requiresAccessCode;
  $('#settings-status').textContent = apiStatus?.configured ? 'AI connected.' : apiStatus ? 'Add a server API key to enable uploads.' : 'AI connection unavailable. Refresh and try again.';
  $('#settings-dialog').showModal();
}
$('#settings-button').addEventListener('click', openSettings);
$('#save-settings').addEventListener('click', () => { try { sessionStorage.setItem('study-access', $('#access-code').value.trim()); $('#settings-dialog').close(); toast('Settings saved.'); } catch { toast('Browser storage is unavailable.'); } });
$('#download-session').addEventListener('click', downloadBackup);
$('#restore-session').addEventListener('click', () => $('#backup-input').click());
$('#backup-input').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 3 * 1024 * 1024) throw new Error('This backup is too large.');
    const backup = JSON.parse(await file.text()); if (!validSession(backup)) throw new Error('Invalid study backup.');
    if (study && !confirm('Replace the current study session with this backup?')) return;
    study = backup; queue = prioritizedQuestions(study); tab = 'practice'; persist(); $('#settings-dialog').close(); renderWorkspace(); toast('Study session restored.');
  } catch (error) { toast(error.message); } finally { event.target.value = ''; }
});
$('#clear-progress').addEventListener('click', () => {
  if (!confirm('Clear the study session and review schedule saved in this browser? Download a backup first if you want to keep it.')) return;
  clearTimeout(saveTimer); localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(DECK_KEY); deck = emptyDeck(); study = null; files = []; queue = []; $('#settings-dialog').close(); renderLanding(); toast('Browser progress cleared.');
});
$('#settings-dialog').addEventListener('click', event => { if (event.target === $('#settings-dialog')) { const r = event.target.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) event.target.close(); } });
if (study) {
  queue = prioritizedQuestions(study);
  if (new URLSearchParams(location.search).has('review')) { history.replaceState(null, '', location.pathname); openReview(); } else renderWorkspace();
} else renderLanding();
checkConnection();
