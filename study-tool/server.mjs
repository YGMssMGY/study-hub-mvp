import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import handler from './api/study.js';

const publicDir = fileURLToPath(new URL('./public/', import.meta.url));
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/study') return handler(req, res);
  try {
    const path = resolve(publicDir, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!path.startsWith(publicDir.endsWith(sep) ? publicDir : publicDir + sep)) throw new Error('Invalid path');
    const data = await readFile(path);
    res.setHeader('Content-Type', `${mime[extname(path)] || 'application/octet-stream'}; charset=utf-8`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(data);
  } catch { res.statusCode = 404; res.end('Not found'); }
});
server.listen(Number(process.env.PORT) || 3000, '127.0.0.1', () => console.log(`Study Tool: http://127.0.0.1:${server.address().port}`));
