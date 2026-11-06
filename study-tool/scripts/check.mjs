import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
async function check(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ['node_modules', 'dist'].includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await check(path);
    else if (/\.(mjs|js)$/.test(entry.name)) {
      const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
      if (result.status !== 0) { console.error(result.stderr); process.exit(1); }
    }
  }
}
await check('.');
JSON.parse(await readFile('vercel.json', 'utf8'));
const html = await readFile('public/index.html', 'utf8');
if (!html.includes('src="/app.js"') || !html.includes('href="/styles.css"')) throw new Error('Missing application assets');
console.log('JavaScript syntax, configuration, and application entry point verified.');
