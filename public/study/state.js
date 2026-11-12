export const STORAGE_KEY = 'study-desk-v1';
export function allSubtopics(study) { return study.topics.flatMap(topic => topic.subtopics); }
export function correctCount(study, subtopicId) {
  return new Set(study.attempts.filter(a => a.subtopicId === subtopicId && a.correct).map(a => a.questionId)).size;
}
export function isMastered(study, subtopicId) { return correctCount(study, subtopicId) >= 2; }
export function recordAttempt(study, question, answer, result) {
  if (study.attempts.some(a => a.questionId === question.id)) return false;
  study.attempts.push({ questionId: question.id, subtopicId: question.subtopicId, answer, ...result, at: new Date().toISOString() });
  study.attempts = study.attempts.slice(-300);
  return true;
}
export function prioritizedQuestions(study, rng = Math.random) {
  const answered = new Set(study.attempts.map(a => a.questionId));
  const ranked = study.questions.filter(q => !answered.has(q.id)).map(q => {
    const count = correctCount(study, q.subtopicId);
    const weight = count >= 2 ? 1 : count === 1 ? 5 : 7;
    return { q, score: -Math.log(Math.max(rng(), 0.000001)) / weight };
  }).sort((a, b) => a.score - b.score);
  // Interleave: unmastered concepts still come first, but neighbours come from different concepts.
  return interleave(ranked, item => item.q.subtopicId).map(item => item.q.id);
}
export function focusIds(study) {
  const subs = allSubtopics(study);
  const unfinished = subs.filter(s => !isMastered(study, s.id));
  return (unfinished.length ? unfinished : subs).sort((a, b) => correctCount(study, a.id) - correctCount(study, b.id)).slice(0, 3).map(s => s.id);
}
export function validSession(value) {
  if (!value || value.version !== 1 || typeof value.title !== 'string' || !Array.isArray(value.topics) || !Array.isArray(value.questions) || !Array.isArray(value.attempts)) return false;
  if (!value.topics.length || !value.questions.length || value.topics.length > 20 || value.questions.length > 200 || value.attempts.length > 300) return false;
  const subs = new Set(), questionIds = new Set();
  for (const t of value.topics) {
    if (!t || typeof t.title !== 'string' || !Array.isArray(t.subtopics) || !t.subtopics.length || t.subtopics.length > 20) return false;
    for (const s of t.subtopics) {
      if (!s || typeof s.id !== 'string' || !s.id || subs.has(s.id) || typeof s.title !== 'string' || typeof s.content !== 'string' || typeof s.source !== 'string') return false;
      if (s.section !== undefined && typeof s.section !== 'string') return false;
      if (s.outline !== undefined && (!Array.isArray(s.outline) || s.outline.length > 10 || s.outline.some(p => !p || typeof p.text !== 'string' || !Array.isArray(p.children) || p.children.length > 10 || p.children.some(c => !c || typeof c.text !== 'string' || !Array.isArray(c.children) || c.children.length > 10 || c.children.some(text => typeof text !== 'string'))))) return false;
      subs.add(s.id);
    }
  }
  for (const q of value.questions) {
    if (!q || typeof q.id !== 'string' || !q.id || questionIds.has(q.id) || typeof q.prompt !== 'string' || !['written', 'multiple-choice'].includes(q.kind) || !Array.isArray(q.options) || !q.options.every(o => typeof o === 'string') || !subs.has(q.subtopicId)) return false;
    if (!value.demo && typeof q.token !== 'string') return false;
    questionIds.add(q.id);
  }
  if (!value.demo && typeof value.contextToken !== 'string') return false;
  return value.attempts.every(a => a && questionIds.has(a.questionId) && subs.has(a.subtopicId) && typeof a.answer === 'string' && typeof a.correct === 'boolean' && typeof a.feedback === 'string');
}

// Interleaving: keep the given order as far as possible, but avoid two neighbours with the same key.
// A key that fills more than half of what is left has to go next, or it would end up bunched at the end.
export function interleave(items, keyOf) {
  const rest = [...items], out = [], left = new Map();
  for (const item of rest) left.set(keyOf(item), (left.get(keyOf(item)) || 0) + 1);
  while (rest.length) {
    const last = out.length ? keyOf(out[out.length - 1]) : undefined;
    const crowded = [...left].find(([key, count]) => count * 2 > rest.length && key !== last)?.[0];
    let i = rest.findIndex(item => crowded !== undefined ? keyOf(item) === crowded : keyOf(item) !== last);
    if (i < 0) i = 0;
    const [item] = rest.splice(i, 1);
    left.set(keyOf(item), left.get(keyOf(item)) - 1); out.push(item);
  }
  return out;
}

// Spaced repetition: every answered question becomes a card in a review deck that outlives the session.
// A correct answer pushes the card out along REVIEW_DAYS; a miss brings it back in RETRY_MINUTES.
export const DECK_KEY = 'study-review-v1';
export const REVIEW_DAYS = [1, 3, 7, 14, 30];
export const RETRY_MINUTES = 10;
const MAX_CARDS = 400;
export function emptyDeck() { return { version: 1, cards: [] }; }
export function validDeck(value) {
  return Boolean(value && value.version === 1 && Array.isArray(value.cards) && value.cards.length <= MAX_CARDS && value.cards.every(c =>
    c && typeof c.id === 'string' && typeof c.prompt === 'string' && ['written', 'multiple-choice'].includes(c.kind) && Array.isArray(c.options) &&
    typeof c.session === 'string' && typeof c.concept === 'string' && Number.isInteger(c.streak) && !Number.isNaN(Date.parse(c.due))));
}
export function schedule(card, correct, now = Date.now()) {
  card.streak = correct ? card.streak + 1 : 0;
  const wait = correct ? REVIEW_DAYS[Math.min(card.streak, REVIEW_DAYS.length) - 1] * 86400000 : RETRY_MINUTES * 60000;
  card.due = new Date(now + wait).toISOString(); card.last = new Date(now).toISOString();
  return card;
}
export function addCard(deck, study, question, correct, now = Date.now()) {
  if (deck.cards.some(c => c.id === question.id)) return null;
  const { id, prompt, kind, options, source, subtopicId, token, demoAnswer, demoExplanation } = question;
  const card = schedule({
    id, prompt, kind, options, source, subtopicId, token, demoAnswer, demoExplanation, demo: Boolean(study.demo),
    session: study.title, concept: allSubtopics(study).find(s => s.id === subtopicId)?.title || '', streak: 0
  }, correct, now);
  deck.cards.push(card);
  // When the deck is full, drop the cards that are furthest from needing review.
  if (deck.cards.length > MAX_CARDS) deck.cards = deck.cards.sort((a, b) => Date.parse(a.due) - Date.parse(b.due)).slice(0, MAX_CARDS);
  return card;
}
export function dueCards(deck, now = Date.now()) {
  const due = deck.cards.filter(c => Date.parse(c.due) <= now).sort((a, b) => Date.parse(a.due) - Date.parse(b.due));
  return interleave(due, c => `${c.session}\n${c.subtopicId}`);
}
export function nextDue(deck, now = Date.now()) {
  const later = deck.cards.map(c => Date.parse(c.due)).filter(t => t > now);
  return later.length ? Math.min(...later) : null;
}
export function waitLabel(ms) {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) { const h = Math.round(minutes / 60); return `${h} hour${h === 1 ? '' : 's'}`; }
  const d = Math.round(minutes / 1440); return `${d} day${d === 1 ? '' : 's'}`;
}
