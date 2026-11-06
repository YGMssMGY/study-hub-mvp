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
  return study.questions.filter(q => !answered.has(q.id)).map(q => {
    const count = correctCount(study, q.subtopicId);
    const weight = count >= 2 ? 1 : count === 1 ? 5 : 7;
    return { q, score: -Math.log(Math.max(rng(), 0.000001)) / weight };
  }).sort((a, b) => a.score - b.score).map(item => item.q.id);
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
