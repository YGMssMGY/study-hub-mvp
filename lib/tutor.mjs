import { AppError } from './security.mjs';
import { askAI } from './ai.mjs';
import { tutorReplySchema, tutorQuizSchema } from './schema.mjs';
import { environment } from './config.mjs';
import { PROFS } from '../public/prof-ai/profs.js';

const TUTOR_UPLOAD_CHARS = 40000;

function checkTutorRequest({ prof, steps, uploads = [] }) {
  if (!Object.hasOwn(PROFS, prof)) throw new AppError('Choose a valid professor.');
  if (typeof steps !== 'boolean') throw new AppError('Invalid tutor settings.');
  if (!Array.isArray(uploads) || uploads.length > 4 || uploads.some(u => !u || !/^U\d{1,3}$/.test(u.id) || typeof u.name !== 'string' || u.name.length > 200 || typeof u.text !== 'string' || u.text.length > TUTOR_UPLOAD_CHARS)) throw new AppError('Attach up to four readable files.');
  return PROFS[prof];
}

function tutorInstructions(p, steps, uploads) {
  let kb = p.sources.map(s => `[${s.id}] ${s.title}\n${s.text}`).join('\n\n');
  if (uploads.length) kb += '\n\n=== STUDENT-UPLOADED MATERIALS (highest priority if relevant) ===\n' + uploads.filter(u => u.text).map(u => `[${u.id}] ${u.name}\n${u.text}`).join('\n\n');
  return `You are "Prof. ${p.short} AI", a study bot inside a student-built study tool called Study Hub, for USC's ECON 351 (Microeconomics for Business). The student is in Professor ${p.name}'s section.

ABOUT THIS PROFESSOR (match how they teach – their examples, vocabulary, emphasis and exam style – but do not pretend to BE them; you are a tutor trained on their materials):
${p.style}

COURSE MATERIALS (each starts with a source ID in brackets):
${kb}

RULES
1. Ground answers in the materials above. After any fact, formula, example or topic-list claim taken from them, cite the source ID in square brackets like [${p.sources[0].id}] or [${(p.sources[4] || p.sources[0]).id}]. For uploaded files with page/slide markers, cite like [U1 p.3] or [U1 slide 4]. Cite at most 2 IDs in the whole reply, placed at the end of the sentence they support. Never invent IDs.
2. If something is not in the materials, you may explain it from general micro knowledge, but say clearly that it is not from ${p.short}'s materials and suggest checking lecture/office hours.
3. Prefer this professor's own worked examples and wording. If ${p.short} teaches something differently from a textbook, go with ${p.short}.
4. ${steps ? 'STEP-BY-STEP MODE IS ON: for a calculation, use at most 4 numbered steps, ONE short line each (formula → numbers → result, e.g. "Set MR = MC: 100 − 4Q = 20 → Q = 20"). No explanations inside steps. Then the result on its own line starting exactly with "Answer: ". Optionally one short line of intuition after it.' : 'STEP-BY-STEP MODE IS OFF: skip the steps. Give the result on a line starting exactly with "Answer: " plus one sentence on how you got it.'}
5. Write math in plain text (e.g., MR = 100 – 4Q, DWL = ½ × base × height). No LaTeX.
6. TALK LIKE A CHATBOT, NOT A TEXTBOOK. Default reply = 2–4 short sentences (about 60 words). Hard cap about 120 words, even for problems. Lead with the direct answer in the first sentence. One idea per reply: if a topic is big, give the core idea and let the student ask for more (the app has buttons for "Explain it more simply", "Give me a similar problem", "Quiz me", "How would this show up on the exam?"). Use at most 3 bullets, no headings, no long paragraphs, bold only 1–2 key terms. Only go longer if the student explicitly asks for detail or a full walkthrough. Never end with a question or an offer.
7. Never help cheat on a live graded exam or problem set submission; tutoring and practice are fine.`;
}

export async function tutorChat({ prof, steps, uploads = [], messages }, values) {
  const p = checkTutorRequest({ prof, steps, uploads });
  if (!Array.isArray(messages) || !messages.length || messages.length > 12 || messages.some(m => !m || !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string' || !m.content.trim() || m.content.length > 8000) || messages.at(-1).role !== 'user') throw new AppError('Invalid conversation.');
  const result = await askAI({
    name: 'tutor_reply', schema: tutorReplySchema, maxTokens: 1500,
    instructions: tutorInstructions(p, steps, uploads) + '\nReply to the last student message in the conversation. Put the whole reply in the "reply" field.',
    content: [{ type: 'input_text', text: JSON.stringify({ conversation: messages.map(({ role, content }) => ({ role, content })) }) }]
  }, environment(values));
  return { reply: result.reply };
}

export async function tutorQuiz({ prof, steps, uploads = [], topic, recent = [] }, values) {
  const p = checkTutorRequest({ prof, steps, uploads });
  if (typeof topic !== 'string' || !topic.trim() || topic.length > 600) throw new AppError('Choose a quiz topic.');
  if (!Array.isArray(recent) || recent.length > 5 || recent.some(r => typeof r !== 'string' || r.length > 100)) throw new AppError('Invalid quiz history.');
  const q = await askAI({
    name: 'tutor_quiz', schema: tutorQuizSchema, maxTokens: 1500,
    instructions: tutorInstructions(p, steps, uploads) + `\n\nTASK: Write ONE new multiple-choice practice question in Prof. ${p.short}'s exam style (similar to their practice sets: numeric problems with clean numbers, or concept questions; about 1 in 4 should be "mark all that apply"). Do not copy a practice question word for word; change the numbers or scenario. Double-check the math so exactly the listed correct choices are right. Choices have no letter prefixes. "correct" lists the 0-based indices of ALL correct choices. The explanation is 2–3 short lines max (key step and result), plain text, citing source IDs like [${p.sources[0].id}]. "source" is the single most relevant source ID.`,
    content: [{ type: 'input_text', text: JSON.stringify({ topic, avoidRepeating: recent }) }]
  }, environment(values));
  const correct = [...new Set(q.correct.map(Number))].filter(i => Number.isInteger(i) && i >= 0 && i < q.choices.length);
  if (!correct.length) throw new AppError('Couldn\'t write a question that time. Try again.', 502);
  return { ...q, correct, choices: q.choices.map(c => c.replace(/^\s*[a-eA-E][).]\s*/, '')) };
}
