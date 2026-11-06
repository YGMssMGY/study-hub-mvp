import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { unseal } from '../lib/security.mjs';

const base = process.env.SMOKE_URL || 'http://127.0.0.1:3000';
async function request(data) {
  const r = await fetch(`${base}/api/study`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Study-Access': process.env.APP_ACCESS_CODE || '' }, body: JSON.stringify(data), signal: AbortSignal.timeout(120000) });
  const result = await r.json();
  if (!r.ok) throw new Error(result.error || `HTTP ${r.status}`);
  return result;
}
const text = `Lecture notes: Reliable experiments\nAn independent variable is deliberately changed by the researcher. A dependent variable is measured as the outcome. A control group provides a comparison without the experimental treatment. Random assignment helps distribute confounding variables across groups. Replication tests whether a result can be reproduced. Correlation alone does not establish causation.\nPractice problem: A researcher changes light exposure and measures plant growth. Identify the independent and dependent variables. Answer: light exposure is the independent variable; plant growth is the dependent variable.\nPractice problem: Why use a control group? Answer: It provides a comparison that helps isolate the effect of the treatment.`;
console.log('Testing live file analysis with synthetic lecture notes…');
const study = await request({ action: 'analyze', files: [{ name: 'experiment-lecture.txt', data: Buffer.from(text).toString('base64') }] });
assert.ok(study.topics.length > 0 && study.questions.length >= 2);
assert.ok(study.questions.every(q => !('answer' in q) && !('explanation' in q)));
const mc = study.questions.find(q => q.kind === 'multiple-choice'), written = study.questions.find(q => q.kind === 'written');
assert.ok(mc && written, 'Expected both answer types');
const mcKey = (await unseal(mc.token, 'question')).answer;
assert.equal((await request({ action: 'grade', questionToken: mc.token, answer: mcKey })).correct, true);
assert.equal((await request({ action: 'grade', questionToken: mc.token, answer: mc.options.find(o => o !== mcKey) })).correct, false);
console.log('Multiple-choice grading passed for correct and incorrect answers.');
const writtenKey = (await unseal(written.token, 'question')).answer;
assert.equal((await request({ action: 'grade', questionToken: written.token, answer: writtenKey })).correct, true);
console.log('Live written-answer grading passed.');
const generated = await request({ action: 'generate', contextToken: study.contextToken, subtopicIds: [written.subtopicId], previousPrompts: study.questions.map(q => q.prompt).slice(-20) });
assert.ok(generated.questions.length > 0);
assert.ok(generated.questions.every(q => q.subtopicId === written.subtopicId));
await writeFile('/private/tmp/study-desk-smoke-session.json', JSON.stringify({ ...study, version: 1, attempts: [], drafts: {}, demo: false, files: ['experiment-lecture.txt'] }));
console.log(JSON.stringify({ liveAI: 'passed', topics: study.topics.length, initialQuestions: study.questions.length, additionalQuestions: generated.questions.length, answerKeysHidden: true }));
