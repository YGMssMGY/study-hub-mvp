import './check.mjs';
import { readFile, writeFile, readdir, mkdir, rm, cp } from 'node:fs/promises';
import assert from 'node:assert/strict';

const modules = ['lib/config.mjs', 'lib/schema.mjs', 'lib/security.mjs', 'lib/ai.mjs', 'public/study/demo.js', 'lib/study.mjs', 'public/prof-ai/profs.js', 'lib/tutor.mjs', 'api/study.js', 'worker/bridge.mjs'];
let source = '// Built from the shared backend and browser assets. Do not edit this generated file.\n';
for (const path of modules) {
  source += `\n// ${path}\n` + (await readFile(path, 'utf8')).replace(/^import .*;\n/gm, '').replace(/^export default /gm, '').replace(/^export /gm, '');
}
const assets = {}, mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
for (const file of await readdir('public', { recursive: true, withFileTypes: true })) {
  if (!file.isFile() || file.name.startsWith('.')) continue;
  const path = `${file.parentPath}/${file.name}`;
  assets[path.slice('public'.length)] = { body: await readFile(path, 'utf8'), type: mime[file.name.slice(file.name.lastIndexOf('.'))] || 'text/plain' };
}
source += `\nconst embeddedAssets = ${JSON.stringify(assets)};\nexport default createWorker(embeddedAssets);\n`;
await mkdir('worker', { recursive: true });
await writeFile('worker/index.js', source);
await rm('dist', { recursive: true, force: true });
await mkdir('dist/server', { recursive: true }); await mkdir('dist/.openai', { recursive: true });
await cp('worker/index.js', 'dist/server/index.js'); await cp('.openai/hosting.json', 'dist/.openai/hosting.json');
const worker = (await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)).default;
assert.equal(typeof worker.fetch, 'function');
const page = await worker.fetch(new Request('https://study.example/'), {});
assert.equal(page.status, 200); assert.ok((await page.text()).includes('id="classes"'));
const studyPage = await worker.fetch(new Request('https://study.example/study/'), {});
assert.equal(studyPage.status, 200); assert.ok((await studyPage.text()).includes('id="main"'));
const script = await worker.fetch(new Request('https://study.example/study/app.js'), {});
assert.ok((await script.text()).includes('Upload materials'));
const status = await (await worker.fetch(new Request('https://study.example/api/study'), { OPENAI_API_KEY: 'verification-only' })).json();
assert.equal(status.configured, true);
console.log('Sites Worker built and validated with embedded assets and the shared AI endpoint.');
