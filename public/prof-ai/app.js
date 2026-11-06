// Prof. AI: ported from the "Study Hub · Prof. AI" Claude artifact.
// The artifact called Claude through claude.ai; on this site, chat and quiz go through /api/study.
import { PROFS } from './profs.js';

/* ============================================================
   STATE
   ============================================================ */
const startProf = new URLSearchParams(location.search).get('prof');
const S = {
  prof: Object.hasOwn(PROFS, startProf) ? startProf : 'hill',
  mode: 'chat',          // chat | quiz
  steps: true,
  uploads: [],           // {id, name, kind, text, status}
  history: { hill: [], kaplan: [] }, // [{role, content}]
  busy: false,
  quiz: { score: 0, total: 0, current: null, topic: '' },
};
let apiStatus = null;

/* ============================================================
   HELPERS
   ============================================================ */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function allSources() { return PROFS[S.prof].sources; }
function findSource(id) {
  const s = allSources().find(x => x.id === id);
  if (s) return s;
  const u = S.uploads.find(x => x.id === id);
  if (u) return { id: u.id, title: u.name, url: null };
  // allow citing the other professor if user switched mid-chat
  for (const p of Object.values(PROFS)) { const m = p.sources.find(x => x.id === id); if (m) return m; }
  return null;
}

function md(raw) {
  // very small markdown renderer + citation chips
  let t = esc(raw);
  t = t.replace(/```([\s\S]*?)```/g, (_, c) => '<pre>' + c.trim() + '</pre>');
  t = t.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>');
  t = t.replace(/\[((?:H|K|U)\d+)(?:[,\s]*((?:p\.|pg\.|page|slide)\s*\d+))?\]/g, (m, id, loc) => {
    const s = findSource(id);
    if (!s) return m;
    const label = s.title.replace(/\s*\((Hill|Kaplan)[^)]*\)/, '') + (loc ? ', ' + loc : '');
    const ic = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/></svg>';
    return s.url
      ? `<a class="cite" href="${s.url}" target="_blank" rel="noopener" title="Open: ${esc(s.title)}">${ic}${esc(label)}</a>`
      : `<span class="cite" title="Your upload">${ic}${esc(label)}</span>`;
  });
  // highlighted final answer line
  t = t.replace(/^\s*(?:<b>)?(?:Final answer|Answer):?(?:<\/b>)?:?\s*(.+)$/gim, (m, rest) => `@@ANS@@${rest}`);
  const lines = t.split('\n'); const out = []; let list = null;
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const ln of lines) {
    let m;
    if (ln.startsWith('@@ANS@@')) { close(); out.push(`<div class="answer"><span class="lbl">Answer</span>${ln.slice(7)}</div>`); }
    else if ((m = ln.match(/^\s*#{1,4}\s+(.*)/))) { close(); out.push(`<h4>${m[1]}</h4>`); }
    else if ((m = ln.match(/^\s*[-•*]\s+(.*)/))) { if (list !== 'ul') { close(); out.push('<ul>'); list = 'ul'; } out.push(`<li>${m[1]}</li>`); }
    else if ((m = ln.match(/^\s*\d+[.)]\s+(.*)/))) { if (list !== 'ol') { close(); out.push('<ol>'); list = 'ol'; } out.push(`<li>${m[1]}</li>`); }
    else if (ln.trim() === '') { close(); out.push(''); }
    else { close(); out.push(`<p>${ln}</p>`); }
  }
  close();
  return out.join('\n').replace(/<\/p>\n<p>/g, '<br>');
}

function scrollDown() { const f = $('#feed'); f.scrollTop = f.scrollHeight; }

/* ============================================================
   SERVER CALLS (same endpoint and access code as the study tool)
   ============================================================ */
class TutorError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
async function api(action, data) {
  let response;
  try {
    response = await fetch('/api/study', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Study-Access': sessionStorage.getItem('study-access') || '' },
      body: JSON.stringify({ action, prof: S.prof, steps: S.steps, uploads: S.uploads.filter(u => u.text).map(({ id, name, text }) => ({ id, name, text })), ...data }),
      signal: AbortSignal.timeout(115000)
    });
  } catch (error) {
    throw new TutorError(error.name === 'TimeoutError' ? 'That took too long. Try again.' : 'Could not connect. Check your connection and try again.', 0);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new TutorError(body.error || 'That answer didn\'t come through.', response.status);
  return body;
}
async function checkConnection() {
  try { const r = await fetch('/api/study'); if (r.ok) apiStatus = await r.json(); } catch { /* Static preview without the API. */ }
  if (!apiStatus?.configured) $('#inner').insertAdjacentHTML('beforeend', `<div class="notice">${apiStatus ? 'AI isn\'t set up on this server yet: add OPENAI_API_KEY.' : 'AI is unavailable in this preview. It works on the deployed site.'}</div>`);
}
// Error row; a 401 adds an access-code field so the student can unlock the AI right there.
function errorHTML(error) {
  const needsCode = error.status === 401 || /access code/i.test(error.message);
  return `<div class="err">${esc(error.message)} <button class="retry">Retry</button>${needsCode ? `<div class="access"><input type="password" class="access-code" placeholder="Study access code" aria-label="Study access code" autocomplete="off"><button class="save-code">Save code</button></div>` : ''}</div>`;
}
function wireError(row, retry) {
  row.querySelector('.retry').onclick = () => { row.remove(); retry(); };
  const save = row.querySelector('.save-code');
  if (save) save.onclick = () => {
    try { sessionStorage.setItem('study-access', row.querySelector('.access-code').value.trim()); } catch { /* Code lasts until reload only. */ }
    row.remove(); retry();
  };
}

/* ============================================================
   RENDER
   ============================================================ */
function renderProfs() {
  const p = PROFS[S.prof];
  $('#pickBtn').innerHTML = `<span class="av">${p.initials}</span>Prof. ${p.short}'s section <span class="chev">▾</span>`;
  $('#menu').innerHTML = `<div class="mh">Choose your professor · ECON 351x</div>` +
    Object.entries(PROFS).map(([k, q]) => `
    <button class="opt-p ${S.prof === k ? 'on' : ''}" data-k="${k}" role="option" aria-selected="${S.prof === k}">
      <span class="av">${q.initials}</span>
      <span><b>Prof. ${q.name}</b><span class="sub">${q.blurb}</span></span>
      ${S.prof === k ? '<span class="tick">✓</span>' : ''}
    </button>`).join('') + `<div class="more">More classes after the pilot.</div>`;
  document.querySelectorAll('.opt-p').forEach(b => b.onclick = () => {
    closeMenu();
    if (S.busy || b.dataset.k === S.prof) return;
    S.prof = b.dataset.k; S.quiz.current = null; renderAll();
  });
}
function closeMenu() { $('#pickWrap').classList.remove('open'); $('#pickBtn').setAttribute('aria-expanded', 'false'); }
$('#pickBtn').onclick = e => { e.stopPropagation(); const o = $('#pickWrap').classList.toggle('open'); $('#pickBtn').setAttribute('aria-expanded', String(o)); };
document.addEventListener('click', e => { if (!$('#pickWrap').contains(e.target)) closeMenu(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

function renderFiles() {
  $('#files').innerHTML = S.uploads.map(u => `
    <div class="file"><span class="tag">${u.id}</span><span class="nm" title="${esc(u.name)}">${esc(u.name)}</span>
    <span class="st">${u.status || ''}</span>
    <button data-id="${u.id}" title="Remove" aria-label="Remove ${esc(u.name)}">×</button></div>`).join('');
  document.querySelectorAll('.file button').forEach(b => b.onclick = () => {
    S.uploads = S.uploads.filter(u => u.id !== b.dataset.id); renderFiles();
  });
}

function heroHTML(showChips) {
  const p = PROFS[S.prof];
  const greet = `Hi! I'm **Prof. ${p.short} AI**, built from ${p.short}'s slides and practice sets. Ask me anything from ECON 351x, or paste a problem.`;
  const chips = showChips ? `<div class="chips">
      <button class="chip hot" data-q="${esc(p.demo.q)}">Solve a practice problem →</button>
      ${p.starters.slice(0, 3).map(s => `<button class="chip" data-q="${esc(s.q)}">${esc(s.short || s.q)}</button>`).join('')}
    </div>` : '';
  return botHTML(greet) + chips;
}

function renderChat() {
  const h = S.history[S.prof];
  let html = heroHTML(!h.length);
  h.forEach((m, i) => {
    if (m.role === 'user') html += `<div class="msg user"><div class="bubble">${esc(m.content)}</div></div>`;
    else html += botHTML(m.content) + (i === h.length - 1 ? actionsHTML() : '');
  });
  $('#inner').innerHTML = html;
  wireChat();
  if (h.length) scrollDown(); else $('#feed').scrollTop = 0;
}
function wireChat() {
  document.querySelectorAll('[data-q]').forEach(c => c.onclick = () => ask(c.dataset.q));
  document.querySelectorAll('[data-act]').forEach(c => c.onclick = () => followUp(c.dataset.act));
}
function actionsHTML() {
  return `<div class="chips">
    <button class="act" data-act="quiz">Quiz me on this</button>
    <button class="act" data-act="simpler">Explain simpler</button>
    <button class="act" data-act="deeper">Go deeper</button>
  </div>`;
}
function followUp(kind) {
  if (kind === 'quiz') {
    const last = [...S.history[S.prof]].reverse().find(m => m.role === 'user');
    S.quiz.topic = '__about__'; S.quiz.about = last ? last.content.slice(0, 300) : '';
    S.mode = 'quiz'; S.quiz.current = null; renderAll(); newQuestion(); return;
  }
  const q = {
    simpler: 'Explain that more simply in 2–3 sentences with an everyday example.',
    deeper: 'Go deeper on that: give me the full explanation with every step and the reasoning behind it.',
  }[kind];
  ask(q);
}
function botHTML(text) {
  const p = PROFS[S.prof];
  const body = text ? md(text) : `<div class="loading"><span class="dots"><i></i><i></i><i></i></span>Checking ${p.short}'s slides and practice sets…</div>`;
  return `<div class="msg bot"><div class="av">${p.initials}</div><div class="bubble">${body}</div></div>`;
}

function renderAll() {
  renderProfs();
  $('#tabChat').classList.toggle('on', S.mode === 'chat');
  $('#tabQuiz').classList.toggle('on', S.mode === 'quiz');
  $('#composer').hidden = S.mode !== 'chat';
  $('#q').placeholder = `Message Prof. ${PROFS[S.prof].short} AI…`;
  if (S.mode === 'chat') renderChat(); else renderQuiz();
}

/* ============================================================
   CHAT
   ============================================================ */
async function ask(text) {
  text = (text || '').trim();
  if (!text || S.busy) return;
  if (S.mode !== 'chat') { S.mode = 'chat'; renderAll(); }
  const h = S.history[S.prof];
  h.push({ role: 'user', content: text });
  renderChat();
  S.busy = true; $('#send').disabled = true;
  $('#inner').insertAdjacentHTML('beforeend', botHTML(''));
  const bubble = $('#inner').lastElementChild.querySelector('.bubble');
  scrollDown();
  try {
    const { reply } = await api('tutor-chat', { messages: h.slice(-12).map(m => ({ role: m.role, content: m.content })) });
    const out = reply || '(No answer came back. Try again.)';
    bubble.innerHTML = md(out);
    h.push({ role: 'assistant', content: out });
    $('#inner').insertAdjacentHTML('beforeend', actionsHTML());
    wireChat();
  } catch (error) {
    h.pop(); // drop the unanswered question
    const row = bubble.closest('.msg');
    row.insertAdjacentHTML('afterend', errorHTML(error));
    const err = row.nextElementSibling; row.remove();
    wireError(err, () => ask(text));
  } finally {
    S.busy = false; $('#send').disabled = false; scrollDown();
  }
}

/* ============================================================
   QUIZ MODE
   ============================================================ */
function renderQuiz() {
  const p = PROFS[S.prof], Q = S.quiz;
  const topicOpts = ['Any topic', ...p.topics, ...(S.uploads.length ? ['My uploaded materials'] : [])];
  if (Q.topic === '__about__') topicOpts.unshift('__about__');
  const optLabel = t => t === '__about__' ? 'What we just discussed' : t;
  let html = `<div class="quiz main-card">
    <div class="qhead"><h3>Quick check · ${p.short}'s exam style</h3><span class="score">${Q.score} / ${Q.total} correct</span></div>
    <div class="qcontrols">
      <select id="qTopic" aria-label="Quiz topic">${topicOpts.map(t => `<option value="${esc(t)}" ${t === Q.topic ? 'selected' : ''}>${esc(optLabel(t))}</option>`).join('')}</select>
      <button class="btn pri" id="newQ">${Q.current ? 'Next question' : 'Start quiz'}</button>
    </div></div>`;
  if (!Q.current && !Q.loading && !Q.error) html += `<div class="quiz empty"><b>Ready when you are</b>Pick a topic and start. Questions are new each time, written in the same style as ${p.short}'s practice sets, and graded instantly.</div>`;
  if (Q.loading) html += `<div class="quiz"><div class="loading"><span class="dots"><i></i><i></i><i></i></span>Writing a question from ${p.short}'s materials…</div></div>`;
  if (Q.error) html += errorHTML(Q.error);
  if (Q.current && !Q.loading) {
    const c = Q.current, multi = c.correct.length > 1;
    html += `<div class="quiz">
      <div class="qmeta"><span>${multi ? 'MARK ALL THAT APPLY' : 'Choose one'}</span><span>${c.source ? md('[' + c.source + ']') : ''}</span></div>
      <div class="qtext">${esc(c.question)}</div>
      ${c.choices.map((ch, i) => {
        let cls = 'opt';
        if (c.checked) { if (c.correct.includes(i)) cls += ' right'; else if (c.picked.includes(i)) cls += ' wrong'; }
        else if (c.picked.includes(i)) cls += ' sel';
        return `<button class="${cls}" data-i="${i}"><span class="k">${String.fromCharCode(97 + i)})</span><span>${esc(ch)}</span></button>`;
      }).join('')}
      <div class="qbar">
        ${c.checked ? '' : `<button class="btn pri" id="checkQ" ${c.picked.length ? '' : 'disabled'}>Check answer</button>`}
        ${c.checked ? `<button class="btn" id="explainQ">Walk me through it in chat</button>` : ''}
      </div>
      ${c.checked ? `<div class="verdict ${c.gotIt ? 'ok' : 'no'}"><b>${c.gotIt ? 'Correct!' : 'Not quite.'}</b> Answer: ${c.correct.map(i => String.fromCharCode(97 + i)).join(', ')}<div class="verdict-body">${md(c.explanation || '')}</div></div>` : ''}
    </div>`;
  }
  $('#inner').innerHTML = html;
  $('#qTopic').onchange = e => Q.topic = e.target.value;
  $('#newQ').onclick = newQuestion;
  const err = $('#inner .err'); if (err) wireError(err, newQuestion);
  document.querySelectorAll('.opt').forEach(b => b.onclick = () => {
    const c = Q.current; if (c.checked) return;
    const i = +b.dataset.i, multi = c.correct.length > 1;
    if (multi) c.picked = c.picked.includes(i) ? c.picked.filter(x => x !== i) : [...c.picked, i];
    else c.picked = [i];
    renderQuiz();
  });
  const ck = $('#checkQ'); if (ck) ck.onclick = () => {
    const c = Q.current;
    c.checked = true;
    c.gotIt = c.picked.length === c.correct.length && c.picked.every(i => c.correct.includes(i));
    Q.total++; if (c.gotIt) Q.score++;
    renderQuiz();
  };
  const ex = $('#explainQ'); if (ex) ex.onclick = () => {
    const c = Q.current;
    const letters = c.picked.map(i => String.fromCharCode(97 + i)).join(', ');
    const prompt = `Walk me through this practice question step by step.\n\n${c.question}\n${c.choices.map((ch, i) => String.fromCharCode(97 + i) + ') ' + ch).join('\n')}\n\nI picked: ${letters}. The answer is: ${c.correct.map(i => String.fromCharCode(97 + i)).join(', ')}.`;
    S.mode = 'chat'; renderAll(); ask(prompt);
  };
  scrollDown();
}

async function newQuestion() {
  const Q = S.quiz;
  if (Q.loading) return;
  Q.loading = true; Q.error = null; renderQuiz();
  const topic = Q.topic === '__about__' ? 'the concept in this student question (same idea, new numbers or scenario): ' + (Q.about || '')
    : !Q.topic || Q.topic === 'Any topic' ? 'any topic from the materials (vary topics)'
    : Q.topic === 'My uploaded materials' ? 'the student-uploaded materials'
    : Q.topic;
  try {
    const v = await api('tutor-quiz', { topic, recent: Q.recent || [] });
    v.picked = []; v.checked = false;
    Q.current = v;
    Q.recent = [...(Q.recent || []), v.question.slice(0, 60)].slice(-5);
  } catch (error) {
    Q.error = error;
  } finally {
    Q.loading = false; renderQuiz();
  }
}

/* ============================================================
   UPLOADS (read in the browser; only the extracted text is sent)
   ============================================================ */
let upCount = 0;
const MAX_CHARS = 40000;

async function extract(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) {
    const lib = window.pdfjsLib;
    const pdf = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
    let out = '';
    for (let i = 1; i <= pdf.numPages && out.length < MAX_CHARS; i++) {
      const pg = await pdf.getPage(i); const tc = await pg.getTextContent();
      out += `\n[p.${i}] ` + tc.items.map(x => x.str).join(' ');
    }
    return { kind: 'pdf', text: out };
  }
  if (name.endsWith('.docx')) {
    const r = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return { kind: 'docx', text: r.value };
  }
  if (name.endsWith('.pptx')) {
    const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
    const slides = Object.keys(zip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
      .sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0]);
    let out = '';
    for (const f of slides) {
      const xml = await zip.file(f).async('string');
      const txt = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(m => m[1]).join(' ');
      out += `\n[slide ${f.match(/\d+/)[0]}] ` + txt;
      if (out.length > MAX_CHARS) break;
    }
    return { kind: 'pptx', text: out };
  }
  return { kind: 'text', text: await file.text() };
}

async function addFiles(list) {
  for (const file of list.slice(0, Math.max(0, 4 - S.uploads.length))) {
    const u = { id: 'U' + (++upCount), name: file.name, status: 'reading…' };
    S.uploads.push(u); renderFiles();
    try {
      Object.assign(u, await extract(file));
      u.text = u.text.replace(/\s+\n/g, '\n').slice(0, MAX_CHARS);
      u.status = u.text.trim() ? 'ready' : 'no text found';
    } catch { u.status = 'couldn\'t read'; }
    renderFiles();
  }
  if (S.mode === 'quiz') renderQuiz();
}

/* ============================================================
   WIRING
   ============================================================ */
$('#send').onclick = () => { const v = $('#q').value; $('#q').value = ''; autosize(); ask(v); };
$('#q').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#send').click(); } });
function autosize() { const t = $('#q'); t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 160) + 'px'; }
$('#q').addEventListener('input', autosize);
$('#tabChat').onclick = () => { S.mode = 'chat'; renderAll(); };
$('#tabQuiz').onclick = () => { S.mode = 'quiz'; renderAll(); };
$('#stepTgl').onclick = () => { S.steps = !S.steps; $('#stepTgl').classList.toggle('on', S.steps); $('#stepTgl').setAttribute('aria-pressed', String(S.steps)); };
$('#pick').onclick = () => $('#fileIn').click();
$('#fileIn').onchange = e => { addFiles([...e.target.files]); e.target.value = ''; };
const drop = $('#drop');
['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('hover'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('hover'); }));
drop.addEventListener('drop', e => addFiles([...e.dataTransfer.files]));

renderAll();
checkConnection();
