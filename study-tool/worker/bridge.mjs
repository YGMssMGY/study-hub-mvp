import handler from '../api/study.js';

export function createWorker(assets) {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      if (url.pathname === '/api/study') {
        let body;
        if (request.method === 'POST') {
          const reader = request.body?.getReader(); let length = 0; const chunks = [];
          while (reader) {
            const next = await reader.read(); if (next.done) break;
            length += next.value.length;
            if (length > 4400000) { await reader.cancel(); return Response.json({ error: 'Keep combined uploads under 3 MB.' }, { status: 413 }); }
            chunks.push(next.value);
          }
          const bytes = new Uint8Array(length); let offset = 0;
          for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
          body = new TextDecoder().decode(bytes);
        }
        const headers = Object.fromEntries(request.headers); headers.host ||= url.host;
        let responseBody = '', status = 200; const responseHeaders = new Headers();
        const req = { method: request.method, headers, body, socket: { remoteAddress: headers['cf-connecting-ip'] || 'site' } };
        const res = { setHeader(name, value) { responseHeaders.set(name, value); }, set statusCode(value) { status = value; }, end(value) { responseBody = value; } };
        await handler(req, res, env || {});
        return new Response(responseBody, { status, headers: responseHeaders });
      }
      const asset = assets[url.pathname === '/' ? '/index.html' : url.pathname];
      if (!asset || !['GET', 'HEAD'].includes(request.method)) return new Response('Not found', { status: 404 });
      return new Response(request.method === 'HEAD' ? null : asset.body, { headers: {
        'Content-Type': asset.type, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'"
      } });
    }
  };
}
