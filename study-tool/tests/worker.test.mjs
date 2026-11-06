import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorker } from '../worker/bridge.mjs';

test('Sites Worker serves assets and responds to HEAD without a body', async () => {
  const worker = createWorker({ '/index.html': { body: '<main>Study</main>', type: 'text/html' } });
  assert.equal(await (await worker.fetch(new Request('https://study.example/'), {})).text(), '<main>Study</main>');
  assert.equal(await (await worker.fetch(new Request('https://study.example/', { method: 'HEAD' }), {})).text(), '');
  assert.equal((await worker.fetch(new Request('https://study.example/missing'), {})).status, 404);
});
test('Sites runtime secrets are scoped to the current request', async () => {
  const worker = createWorker({});
  const [configured, empty] = await Promise.all([
    worker.fetch(new Request('https://study.example/api/study'), { OPENAI_API_KEY: 'private-first-key' }),
    worker.fetch(new Request('https://study.example/api/study'), {})
  ]);
  assert.equal((await configured.json()).configured, true); assert.equal((await empty.json()).configured, false);
});
test('Sites Worker passes body validation and access checks to the API', async () => {
  const worker = createWorker({}), req = new Request('https://study.example/api/study', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{invalid' });
  assert.equal((await worker.fetch(req, {})).status, 400);
});
