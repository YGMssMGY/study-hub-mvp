import { environment } from './config.mjs';

export class AppError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const encoder = new TextEncoder(), decoder = new TextDecoder();
const concatBytes = (...arrays) => {
  const output = new Uint8Array(arrays.reduce((n, a) => n + a.length, 0));
  let offset = 0; for (const array of arrays) { output.set(array, offset); offset += array.length; }
  return output;
};
function decodeBase64(value) { return Uint8Array.from(atob(value), char => char.charCodeAt(0)); }
function encodeBase64(bytes) {
  let text = ''; for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function key(values) {
  const env = environment(values), secret = env.APP_SECRET || env.OPENAI_API_KEY;
  if (!secret) throw new AppError('Add OPENAI_API_KEY to the server environment to enable AI.', 503);
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function seal(data, purpose, values) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = encoder.encode(JSON.stringify({ purpose, data, created: Date.now() }));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(values), plain));
  return encodeBase64(concatBytes(iv, encrypted.slice(-16), encrypted.slice(0, -16)));
}
export async function unseal(token, purpose, values) {
  if (typeof token !== 'string' || token.length > 150000) throw new AppError('Invalid study session. Please upload your material again.');
  try {
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/'); base64 += '='.repeat((4 - base64.length % 4) % 4);
    const bytes = decodeBase64(base64);
    if (bytes.length < 29) throw new Error('Invalid token');
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.subarray(0, 12) }, await key(values), concatBytes(bytes.subarray(28), bytes.subarray(12, 28)));
    const data = JSON.parse(decoder.decode(decrypted));
    if (data.purpose !== purpose) throw new Error('Wrong token purpose');
    return data.data;
  } catch { throw new AppError('This study session cannot be verified. The server key may have changed; upload your material again.'); }
}
export async function equalSecret(a, b) {
  const [left, right] = await Promise.all([a, b].map(value => crypto.subtle.digest('SHA-256', encoder.encode(String(value || '')))));
  const x = new Uint8Array(left), y = new Uint8Array(right); let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const mimeTypes = { pdf: 'application/pdf', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', txt: 'text/plain', md: 'text/markdown' };
export function validateFiles(files) {
  if (!Array.isArray(files) || files.length < 1 || files.length > 4) throw new AppError('Choose between one and four PDF, PPTX, or text files.');
  let total = 0;
  return files.map(file => {
    if (!file || typeof file.name !== 'string' || file.name.length > 200) throw new AppError('Invalid file name.');
    const ext = file.name.split('.').pop().toLowerCase();
    if (!mimeTypes[ext]) throw new AppError('Use PDF, PPTX, TXT, or MD files. Export older PowerPoint files as PDF.');
    if (typeof file.data !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(file.data) || file.data.length % 4 !== 0) throw new AppError('A file is empty or could not be read.');
    const bytes = decodeBase64(file.data);
    total += bytes.length;
    if (!bytes.length || total > MAX_UPLOAD_BYTES) throw new AppError('Keep the combined upload under 3 MB for this prototype.', 413);
    if (ext === 'pdf' && !decoder.decode(bytes.subarray(0, 1024)).includes('%PDF-')) throw new AppError(`${file.name} is not a valid PDF.`);
    if (ext === 'pptx' && decoder.decode(bytes.subarray(0, 2)) !== 'PK') throw new AppError(`${file.name} is not a valid PowerPoint file.`);
    return { type: 'input_file', filename: file.name, file_data: `data:${mimeTypes[ext]};base64,${file.data}` };
  });
}
