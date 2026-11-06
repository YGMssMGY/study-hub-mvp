import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/study.js';

async function call({ method = 'POST', headers = {}, body = {} } = {}) {
  const req = { method, headers: { host: 'study.example', 'content-type': 'application/json', ...headers }, body };
  let data;
  const res = { statusCode: 200, setHeader() {}, end(value) { data = JSON.parse(value); } };
  await handler(req, res); return { status: res.statusCode, data };
}
test('status reveals setup state without returning server secrets', async () => {
  const old = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = 'private-test-key';
  try { const result = await call({ method: 'GET' }); assert.equal(result.status, 200); assert.equal(result.data.configured, true); assert.ok(!JSON.stringify(result).includes('private-test-key')); }
  finally { if (old === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = old; }
});
test('cross-origin writes are rejected before any AI request', async () => {
  const result = await call({ headers: { origin: 'https://other.example' } }); assert.equal(result.status, 403);
});
test('deployed AI is locked until a tester access code is configured', async () => {
  const oldVercel = process.env.VERCEL, oldCode = process.env.APP_ACCESS_CODE;
  process.env.VERCEL = '1'; delete process.env.APP_ACCESS_CODE;
  try { const result = await call(); assert.equal(result.status, 503); assert.match(result.data.error, /APP_ACCESS_CODE/); }
  finally { if (oldVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = oldVercel; if (oldCode === undefined) delete process.env.APP_ACCESS_CODE; else process.env.APP_ACCESS_CODE = oldCode; }
});
test('incorrect access codes are rejected', async () => {
  const oldCode = process.env.APP_ACCESS_CODE; process.env.APP_ACCESS_CODE = 'test-access';
  try { const result = await call({ headers: { 'x-study-access': 'wrong-code' } }); assert.equal(result.status, 401); }
  finally { if (oldCode === undefined) delete process.env.APP_ACCESS_CODE; else process.env.APP_ACCESS_CODE = oldCode; }
});
test('unsupported HTTP methods are rejected', async () => { assert.equal((await call({ method: 'DELETE' })).status, 405); });
test('malformed JSON produces a client error', async () => { assert.equal((await call({ body: '{broken' })).status, 400); });
