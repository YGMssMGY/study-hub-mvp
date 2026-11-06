import { AppError, equalSecret } from '../lib/security.mjs';
import { analyze, generate, grade, gradeDemo } from '../lib/study.mjs';
import { tutorChat, tutorQuiz } from '../lib/tutor.mjs';
import { environment } from '../lib/config.mjs';

const windows = new Map();
const readBody = async req => {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { throw new AppError('Invalid request body.'); } }
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 4400000) throw new AppError('The upload is too large. Keep the combined files under 3 MB.', 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw new AppError('Invalid request body.'); }
};
export default async function handler(req, res, values) {
  const env = environment(values);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  const send = (status, body) => { res.statusCode = status; res.end(JSON.stringify(body)); };
  if (req.method === 'GET') {
    return send(200, { configured: Boolean(env.OPENAI_API_KEY), requiresAccessCode: Boolean(env.APP_ACCESS_CODE), deploymentLocked: Boolean(env.VERCEL && !env.APP_ACCESS_CODE), maxUploadMB: 3 });
  }
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return send(405, { error: 'Method not allowed.' }); }
  try {
    const origin = req.headers.origin;
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    if (origin && new URL(origin).host !== host) throw new AppError('This request must come from the study website.', 403);
    if (env.VERCEL && !env.APP_ACCESS_CODE) throw new AppError('Set APP_ACCESS_CODE in Vercel to enable AI for your prototype testers.', 503);
    if (env.APP_ACCESS_CODE && !await equalSecret(req.headers['x-study-access'], env.APP_ACCESS_CODE)) throw new AppError('Enter the study access code in Settings.', 401);
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'local';
    const now = Date.now(), record = windows.get(ip);
    if (record && now - record.start < 60000 && record.count >= 15) throw new AppError('Please wait a moment before making more requests.', 429);
    windows.set(ip, record && now - record.start < 60000 ? { ...record, count: record.count + 1 } : { start: now, count: 1 });
    if (windows.size > 1000) for (const [key, value] of windows) if (now - value.start > 60000) windows.delete(key);
    if (!String(req.headers['content-type']).includes('application/json')) throw new AppError('Use a JSON request.', 415);
    const body = await readBody(req);
    if (!body || typeof body !== 'object') throw new AppError('Invalid request.');
    if (!env.OPENAI_API_KEY) throw new AppError('Add OPENAI_API_KEY to the server environment, then restart or redeploy to enable AI.', 503);
    if (body.action === 'analyze') return send(200, await analyze(body.files, env));
    if (body.action === 'generate') return send(200, await generate(body, env));
    if (body.action === 'grade') return send(200, await grade(body, env));
    if (body.action === 'grade-demo') return send(200, await gradeDemo(body, env));
    if (body.action === 'tutor-chat') return send(200, await tutorChat(body, env));
    if (body.action === 'tutor-quiz') return send(200, await tutorQuiz(body, env));
    throw new AppError('Unknown study action.');
  } catch (error) {
    const known = error instanceof AppError;
    if (!known) console.error('Study endpoint error:', error.name);
    return send(known ? error.status : 500, { error: known ? error.message : 'Something went wrong. Please try again.' });
  }
}
