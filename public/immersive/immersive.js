// Study Hub, immersive version. The page is one world: each <section class="scene"> is a stretch of
// scroll, and the scroll position s (0 = first scene, 6 = last) decides where every object is.
// Each object has a pose per scene and flies between them. The one authored moment is scene 1 → 2:
// the papers flatten into strips and land as the rows of the guide.

const $ = (q, root = document) => root.querySelector(q);
const $$ = (q, root = document) => [...root.querySelectorAll(q)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('js-ready');

const scenes = $$('.scene'), N = scenes.length;
// Within a scene, the copy holds for the first 42% of its scroll; the stage then moves to the next scene.
const MOVE_START = 0.42;
const stageT = f => ease(clamp((f - MOVE_START) / (1 - MOVE_START)));
// Each scene's objects fit inside this half-width and half-height (in u). The stage is centred in
// the free space beside that scene's copy and scaled down if the scene would not fit there.
const EXTENT = [[47, 31], [33, 21], [22, 20], [40, 21], [40, 16], [23, 18], [0, 0]];
let FRAME_AT = []; // per scene: { x, y, fit } in px / scale

// Sky per scene: top, bottom, copy color, accent, sun color. Night falls on the review scene.
const LIGHT = '#fff7ec', DARK = '#1c1917';
const SKY = [
  { top: '#3d0505', bottom: '#b3301c', fg: LIGHT, accent: '#ffcc00', sun: 'rgba(255,204,0,0.55)' },
  { top: '#fbeedd', bottom: '#f3d6bd', fg: DARK, accent: '#990000', sun: 'rgba(255,214,120,0.7)' },
  { top: '#f9e6df', bottom: '#fdf4ea', fg: DARK, accent: '#990000', sun: 'rgba(255,220,150,0.6)' },
  { top: '#ffe2a0', bottom: '#f2b083', fg: DARK, accent: '#990000', sun: 'rgba(255,190,90,0.75)', via: ['#b8473a', '#3f1838'] },
  { top: '#0b0918', bottom: '#2d0e22', fg: LIGHT, accent: '#ffcc00', sun: 'rgba(255,190,90,0)' },
  { top: '#f0c2ad', bottom: '#fde6d2', fg: DARK, accent: '#990000', sun: 'rgba(255,200,140,0.7)' },
  { top: '#8a0000', bottom: '#3d0000', fg: LIGHT, accent: '#ffcc00', sun: 'rgba(255,204,0,0.45)' }
];
const RINGS = [8, 13, 18, 23, 28], RING_DAYS = [1, 3, 7, 14, 30], RX = 1.3, RY = 0.5;

let vw, vh, u, mobile, sceneH, xs = 1, ys = 1;
function measure() {
  vw = innerWidth; vh = innerHeight; mobile = vw < 760;
  u = mobile ? vw / 58 : Math.min(vw * 0.0065, vh * 0.0105);
  xs = mobile ? 0.55 : 1; ys = mobile ? 0.8 : 1;
  sceneH = scenes[0].offsetHeight || vh * 1.7;
  document.documentElement.style.setProperty('--u', `${u}px`);
  frameScenes(); drawRings(); sizeCanvas(); dirty = true;
}

function frameScenes() {
  const top = 96, bottom = vh - 84, cy = (top + bottom) / 2, freeH = bottom - top, gap = 32, edge = 24;
  FRAME_AT = scenes.map((sc, i) => {
    if (mobile) return { x: vw / 2, y: vh * 0.25, fit: 0.64 };
    const kids = [...$('.copy', sc).children].map(el => el.getBoundingClientRect()).filter(r => r.width);
    const left = Math.min(...kids.map(r => r.left)), right = Math.max(...kids.map(r => r.right));
    const side = $('.copy', sc).classList.contains('copy--right') ? 'right' : $('.copy', sc).classList.contains('copy--left') ? 'left' : 'center';
    const [x0, x1] = side === 'left' ? [right + gap, vw - edge] : side === 'right' ? [edge, left - gap] : [edge, vw - edge];
    const [ew, eh] = EXTENT[i];
    const fit = ew ? Math.min(1, ((x1 - x0) / 2) / (ew * u), (freeH / 2) / (eh * u)) : 1;
    return { x: (x0 + x1) / 2, y: cy, fit };
  });
}

// ---------- Colour, mixed in OKLab so skies don't go muddy halfway ----------
const toLin = c => (c /= 255) <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const toSrgb = c => Math.round(255 * clamp(c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055));
function oklab(hex) {
  const [r, g, b] = [1, 3, 5].map(i => toLin(parseInt(hex.slice(i, i + 2), 16)));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function rgbOf([L, A, B]) {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return `rgb(${toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)},${toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)},${toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)})`;
}
const mixLab = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
for (const k of SKY) { k.topL = oklab(k.top); k.bottomL = oklab(k.bottom); if (k.via) k.viaL = k.via.map(oklab); }
const rgba = c => c.match(/[\d.]+/g).map(Number);
const mixRgba = (a, b, t) => { const x = rgba(a), y = rgba(b); return `rgba(${x.map((v, i) => i < 3 ? Math.round(lerp(v, y[i], t)) : lerp(v, y[i], t).toFixed(3)).join(',')})`; };

// ---------- Poses ----------
// x, y, z in stage units (u); rx, ry, rz in degrees; s scale (sx/sy stretch it); o opacity;
// fl how much it bobs; abs = ignore the mobile squeeze.
const pose = (x, y, z = 0, o = {}) => ({ x, y, z, rx: 0, ry: 0, rz: 0, s: 1, sx: 1, sy: 1, o: 1, fl: 0.3, ...o });
const hide = p => ({ ...p, o: 0, s: p.s * 0.85, z: p.z - 10 });
const GUIDE = { x: 0, y: 0, z: 5, rx: 6, ry: -8 };

const PAPER_SIZE = $$('[data-paper]').map(el => { const cs = getComputedStyle(el); return [parseFloat(cs.getPropertyValue('--w')), parseFloat(cs.getPropertyValue('--h'))]; });
// A loose 3 × 2 grid with an 8u gutter (x = edge-to-edge from each paper's width × 0.88): even gutters, each paper's label in view, small tilts so it still reads as a pile.
// [x, y, z, rx, ry, rz]; row one is question bank / slides / cheat sheet, row two practice / key / notes.
const SCATTER = [[0, -13, 3, 6, -10, 3], [-33.5, -16, -2, 0, 8, -5], [33.5, -16, 1, 0, -8, 6], [-28.6, 16, 0, 6, 0, -4], [0.5, 15, -3, 0, 0, 3], [29.1, 15, 2, -6, 0, -6]];
// Which guide row each paper becomes: the gist, key formula, where it came from, still stuck.
const ROW_Y = [-3, 9, 4, 14, 9, 14];
const paperPose = k => i => {
  if (i === 0) { const [x, y, z, rx, ry, rz] = SCATTER[k]; return pose(x, y, z, { rx, ry, rz, s: 0.88, fl: 0.5 }); }
  if (i === 1) {
    const col = k % 2, level = Math.floor(k / 2);
    return pose(col ? 15 : -15, -3 - level * 1.7, level * 1.2, { rx: 18, rz: (level - 1) * 3 + (col ? 2 : -2) });
  }
  if (i === 2) { // flattened into a strip the width of a guide row, landing on its row
    const [w, h] = PAPER_SIZE[k];
    return pose(GUIDE.x, GUIDE.y + ROW_Y[k], GUIDE.z + 1, { rx: GUIDE.rx, ry: GUIDE.ry, sx: 35 / w, sy: 3.4 / h, o: 0, fl: 0 });
  }
  return null;
};
const tagPose = k => i => i === 1 ? pose(k ? 15 : -15, 15, 4) : null;
const guidePose = i => {
  if (i === 1) return pose(GUIDE.x, GUIDE.y, GUIDE.z, { rx: GUIDE.rx, ry: GUIDE.ry, s: 0.92, o: 0, late: true });
  if (i === 2) return pose(GUIDE.x, GUIDE.y, GUIDE.z, { rx: GUIDE.rx, ry: GUIDE.ry, fl: 0.4 });
  if (i === 3) return pose(0, 2, -6, { s: 0.8, o: 0 });
  return null;
};
const CARD_COL = [-27, 0, 27], CARD_ROW = [-11, 11];
const cardPose = k => i => {
  if (i === 2) return pose(GUIDE.x, GUIDE.y + 6, GUIDE.z, { rx: GUIDE.rx, ry: GUIDE.ry, s: 0.4, o: 0, abs: true });
  if (i === 3) return pose(CARD_COL[k % 3], CARD_ROW[Math.floor(k / 3)], 0, { rz: [-3, 2, -2, 3, -2, 2][k], fl: 0.35, abs: true });
  if (i === 4) return pose(0, 2, -4, { s: 0.3, o: 0 });
  return null;
};
const RING_OF = [0, 1, 2, 3, 4, 2];
let day = 0;
const pulseOf = ring => clamp(1 - Math.abs(day - RING_DAYS[ring]) / (RING_DAYS[ring] * 0.3 + 1.2));
const chipPose = k => (i, time, s) => {
  if (i === 3) return pose(CARD_COL[k % 3], CARD_ROW[Math.floor(k / 3)], 0, { s: 0.6, o: 0, abs: true });
  if (i === 4) {
    const ring = RING_OF[k], r = RINGS[ring], a = k * 2.3 + 0.6 + (s - 3.5) * 1.6 / (1 + ring * 0.4) + time * 0.03;
    return pose(Math.cos(a) * r * RX, 2 + Math.sin(a) * r * RY, Math.sin(a) * r * 0.25, { s: 1 + 0.3 * pulseOf(ring), fl: 0 });
  }
  if (i === 5) return pose(0, -6, 0, { s: 0.6, o: 0 });
  return null;
};
const ringsPose = i => i === 4 ? pose(0, 2, 0, { fl: 0 }) : null;
const ringLabelPose = k => i => {
  if (i !== 4) return null;
  const a = k % 2 ? 0.42 : -0.42;
  return pose(Math.cos(a) * RINGS[k] * RX, 2 + Math.sin(a) * RINGS[k] * RY, 1, { fl: 0 });
};
const BUBBLES = [[8, -14, 2], [-4, -1, 3], [-14, 11, 1]];
const bubblePose = k => i => {
  if (i === 4) return pose(0, -6, 0, { s: 0.5, o: 0 });
  if (i === 5) return pose(...BUBBLES[k], { fl: 0.4 });
  return null;
};

const objects = [
  ...$$('[data-paper]').map((el, k) => ({ el, pose: paperPose(k), stagger: k })),
  ...$$('[data-tag]').map((el, k) => ({ el, pose: tagPose(k) })),
  { el: $('.guide'), pose: guidePose },
  { el: $('.rings'), pose: ringsPose },
  ...$$('[data-ring]').map((el, k) => ({ el, pose: ringLabelPose(k), ring: k })),
  ...$$('[data-card]').map((el, k) => ({ el, pose: cardPose(k), stagger: k, card: true })),
  ...$$('[data-chip]').map((el, k) => ({ el, pose: chipPose(k), stagger: k, ring: RING_OF[k] })),
  ...$$('[data-bubble]').map((el, k) => ({ el, pose: bubblePose(k), stagger: k * 2 }))
];
objects.forEach((o, i) => { o.seed = i * 1.37; });

function drawRings() {
  const svg = $('.rings'), w = RINGS.at(-1) * RX * u * xs * 2 + 24, h = RINGS.at(-1) * RY * u * ys * 2 + 24;
  svg.setAttribute('viewBox', `${-w / 2} ${-h / 2} ${w} ${h}`);
  svg.style.width = `${w}px`; svg.style.height = `${h}px`;
  $('.ring-lines', svg).innerHTML = RINGS.map(r => `<ellipse rx="${r * RX * u * xs}" ry="${r * RY * u * ys}"/>`).join('');
}

// Practice cards are real buttons: press (or Enter/Space) flips one to its answer.
for (const card of $$('[data-card]')) card.addEventListener('click', () => card.setAttribute('aria-pressed', String(card.getAttribute('aria-pressed') !== 'true')));

function place(o, s, time, cur) {
  let A, B, t;
  if (reduce) { A = o.pose(cur, 0, cur); B = A; t = 0; }
  else {
    const a = Math.min(Math.floor(s), N - 1);
    t = stageT(s - a);
    if (o.stagger !== undefined) t = clamp((t - o.stagger * 0.05) / 0.75);
    A = o.pose(a, time, s); B = o.pose(Math.min(a + 1, N - 1), time, s);
  }
  if (!A && !B) { show(o, false); return; }
  A ||= hide(B); B ||= hide(A);
  const p = {};
  for (const k in A) if (typeof A[k] === 'number') p[k] = lerp(A[k], B[k], t);
  // Leaving objects stay solid until they arrive; the guide fades in only as the strips land.
  const late = B.late || A.late;
  p.o = B.o < A.o ? lerp(A.o, B.o, Math.pow(t, 2.4)) : lerp(A.o, B.o, late ? Math.pow(t, 3) : 1 - Math.pow(1 - t, 2));
  const abs = A.abs && B.abs, mx = abs ? 1 : xs, my = abs ? 1 : ys;
  const bob = reduce ? 0 : Math.sin(time * 0.9 + o.seed) * p.fl;
  o.el.style.transform = `translate3d(${p.x * u * mx}px,${(p.y + bob) * u * my}px,${p.z * u * 4}px) translate(-50%,-50%) rotateX(${p.rx}deg) rotateY(${p.ry}deg) rotateZ(${p.rz + bob}deg) scale3d(${p.s * p.sx},${p.s * p.sy},1)`;
  o.el.style.opacity = p.o.toFixed(3);
  show(o, p.o > 0.01);
  if (o.ring !== undefined) o.el.classList.toggle('due', cur === 4 && pulseOf(o.ring) > 0.4);
  if (o.card) {
    const active = cur === 3 && p.o > 0.6;
    o.el.style.pointerEvents = active ? 'auto' : 'none';
    o.el.tabIndex = active ? 0 : -1;
  }
}
function show(o, on) {
  if (o.shown === on) return;
  o.shown = on;
  o.el.style.visibility = on ? 'visible' : 'hidden';
  o.el.classList.toggle('shown', on);
}

// ---------- Sky ----------
const root = document.documentElement, sun = $('.sun'), moon = $('.moon'), themeMeta = $('meta[name="theme-color"]');
function paintSky(s, cur) {
  let top, bottom, sunColor, night;
  if (reduce) { const k = SKY[cur]; top = k.top; bottom = k.bottom; sunColor = k.sun; night = cur === 4 ? 1 : 0; }
  else {
    const a = Math.min(Math.floor(s), N - 1), b = Math.min(a + 1, N - 1), t = stageT(s - a), A = SKY[a], B = SKY[b];
    let tl, bl;
    if (A.via && a !== b) { // authored dusk stop instead of a straight blend
      const h = t < 0.5 ? t * 2 : (t - 0.5) * 2;
      tl = t < 0.5 ? mixLab(A.topL, A.viaL[0], h) : mixLab(A.viaL[0], B.topL, h);
      bl = t < 0.5 ? mixLab(A.bottomL, A.viaL[1], h) : mixLab(A.viaL[1], B.bottomL, h);
    } else { tl = mixLab(A.topL, B.topL, t); bl = mixLab(A.bottomL, B.bottomL, t); }
    top = rgbOf(tl); bottom = rgbOf(bl); sunColor = mixRgba(A.sun, B.sun, t);
    night = clamp(1 - Math.abs(s - 4) * 1.6);
  }
  root.style.setProperty('--sky-top', top);
  root.style.setProperty('--sky-bottom', bottom);
  root.style.setProperty('--sun', sunColor);
  const k = s / (N - 1);
  sun.style.transform = `translate(${lerp(82, 18, k) * vw / 100}px, ${(70 - Math.sin(Math.PI * k) * 52) * vh / 100}px)`;
  moon.style.transform = `translate(${vw * 0.78}px, ${vh * (0.26 - night * 0.04)}px)`;
  moon.style.opacity = night.toFixed(3);
  themeMeta.content = top;
  return night;
}

// ---------- Copy: each scene's text keeps its own colours and is gone before the sky turns ----------
const copies = scenes.map((sc, i) => {
  const c = $('.copy', sc), k = SKY[i], light = k.fg === LIGHT;
  c.style.setProperty('--fg', k.fg);
  c.style.setProperty('--fg-soft', light ? 'rgba(255,247,236,0.86)' : 'rgba(28,25,23,0.82)');
  c.style.setProperty('--accent', k.accent);
  c.style.setProperty('--veil', light ? 'rgba(24,8,8,0.72)' : 'rgba(255,247,236,0.9)');
  // Keyboard users tabbing into another scene's copy are taken to that scene.
  c.addEventListener('focusin', () => { if (Math.abs(s - i) > 0.3) scrollTo({ top: i * sceneH, behavior: 'auto' }); });
  return c;
});
function fadeCopy(s, cur) {
  copies.forEach((c, i) => {
    let o, y = 0;
    if (reduce) o = i === cur ? 1 : 0;
    else {
      const local = s - i;
      o = clamp(Math.min((local + 0.25) / 0.2, (MOVE_START - local) / 0.12));
      y = local < 0.1 ? (1 - o) * 28 : -(1 - o) * 28;
    }
    c.style.opacity = o.toFixed(3);
    if (!reduce) c.style.transform = `translateY(${y.toFixed(1)}px)`;
    c.classList.toggle('live', o > 0.6);
  });
}

// ---------- HUD ----------
const dots = $('.dots'), statusEl = $('.status span'), dial = $('.dial'), dialArc = $('.dial-arc'), dialText = $('.dial span');
const dotButtons = scenes.map((sc, i) => {
  const b = document.createElement('button'), label = $('h1, h2', sc).textContent.trim();
  b.type = 'button'; b.dataset.label = label; b.setAttribute('aria-label', label);
  b.addEventListener('click', () => jumpTo(i));
  dots.append(b);
  return b;
});
// Long jumps land straight on the scene instead of flying through every sky on the way.
function jumpTo(i) { scrollTo({ top: i * sceneH, behavior: 'auto' }); }
for (const a of $$('a[href^="#"]')) a.addEventListener('click', e => {
  const i = scenes.findIndex(sc => `#${sc.id}` === a.getAttribute('href'));
  if (i < 0) return;
  e.preventDefault(); jumpTo(i); history.replaceState(null, '', a.getAttribute('href'));
  if (a.classList.contains('skip')) setTimeout(() => $('a, button', copies[i])?.focus(), 60);
});
let shownStatus = '', statusTimer, lastCur = -1;
function hud(cur) {
  if (cur !== lastCur) { dotButtons.forEach((b, i) => i === cur ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')); lastCur = cur; }
  const text = cur === 4 ? `Day ${day} · reviews coming back` : scenes[cur].dataset.status;
  if (text !== shownStatus) {
    const swap = !(cur === 4 && shownStatus.startsWith('Day'));
    shownStatus = text;
    if (swap && !reduce) { statusEl.classList.add('swap'); clearTimeout(statusTimer); statusTimer = setTimeout(() => { statusEl.textContent = shownStatus; statusEl.classList.remove('swap'); }, 180); }
    else statusEl.textContent = text;
  }
  dial.classList.toggle('on', cur === 4);
  dialText.textContent = `day ${day}`;
  const ang = day / 30 * Math.PI * 2 - 0.0001, x = 20 + 17 * Math.sin(ang), y = 20 - 17 * Math.cos(ang);
  dialArc.setAttribute('d', `M20 3 A17 17 0 ${ang > Math.PI ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}`);
}

// ---------- Drifting scraps (stars at night) ----------
const canvas = $('.motes'), ctx = canvas.getContext('2d');
let motes = [];
function sizeCanvas() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = vw * dpr; canvas.height = vh * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const count = mobile ? 30 : 64;
  if (motes.length !== count) motes = Array.from({ length: count }, (_, i) => ({
    x: Math.random() * vw, y: Math.random() * vh, z: 0.3 + Math.random() * 0.7, ph: Math.random() * 6.28,
    r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.02, w: 3 + Math.random() * 5, scrap: i % 3 !== 0
  }));
}
function drawMotes(dt, time, s, night, velocity) {
  ctx.clearRect(0, 0, vw, vh);
  const darkSky = clamp(1 - s * 1.3) + clamp(1 - Math.abs(s - 6) * 1.3);
  for (const m of motes) {
    if (!reduce) {
      m.y -= (0.12 + m.z * 0.3) * dt * 60 * (1 - night * 0.9) + velocity * 0.03 * m.z;
      m.x += Math.sin(time * 0.5 + m.ph) * 0.25 * m.z * (1 - night);
      m.r += m.vr * dt * 60;
      if (m.y < -20) { m.y = vh + 20; m.x = Math.random() * vw; }
      if (m.y > vh + 20) { m.y = -20; m.x = Math.random() * vw; }
    }
    if (night > 0.02) {
      const tw = reduce ? 0.7 : 0.55 + 0.45 * Math.sin(time * 2 + m.ph * 3);
      ctx.fillStyle = `rgba(255,247,236,${(night * tw * m.z).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.z * 1.6, 0, 6.28); ctx.fill();
    }
    const dayAmt = 1 - night;
    if (dayAmt < 0.02) continue;
    ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.r);
    if (m.scrap) {
      ctx.fillStyle = darkSky > 0.3 ? `rgba(255,247,236,${(0.35 * m.z * dayAmt).toFixed(3)})` : `rgba(153,0,0,${(0.2 * m.z * dayAmt).toFixed(3)})`;
      ctx.fillRect(-m.w / 2, -m.w * 0.65, m.w, m.w * 1.3);
    } else {
      ctx.fillStyle = `rgba(255,204,0,${(0.5 * m.z * dayAmt).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(0, 0, m.z * 2, 0, 6.28); ctx.fill();
    }
    ctx.restore();
  }
}

// ---------- Camera ----------
const rig = $('.rig'), stage = $('.stage');
let s = 0, smooth = null, lastY = scrollY, velocity = 0, last = performance.now(), dirty = true;
let tiltX = 0, tiltY = 0, aimX = 0, aimY = 0;
if (!reduce && matchMedia('(pointer: fine)').matches) addEventListener('pointermove', e => { aimY = (e.clientX / vw - 0.5) * 8; aimX = -(e.clientY / vh - 0.5) * 5; });
addEventListener('scroll', () => { dirty = true; }, { passive: true });

function frame(now) {
  requestAnimationFrame(frame);
  const dt = clamp((now - last) / 1000, 0, 0.05), time = reduce ? 0 : now / 1000; last = now;
  const target = clamp(scrollY / sceneH, 0, N - 1);
  if (reduce && !dirty) return; // nothing moves on its own when motion is reduced
  dirty = false;
  smooth = smooth === null || reduce ? target : clamp(smooth, target - 1, target + 1);
  if (!reduce) smooth = lerp(smooth, target, 1 - Math.pow(0.0001, dt)); // a little camera lag
  if (!Number.isFinite(smooth)) smooth = target;
  s = clamp(smooth, 0, N - 1);
  velocity = lerp(velocity, scrollY - lastY, 0.2); lastY = scrollY;
  tiltX = lerp(tiltX, aimX, 0.06); tiltY = lerp(tiltY, aimY, 0.06);

  // The scene "is" the next one once the stage is more than halfway there.
  const a = Math.min(Math.floor(s), N - 1), t = stageT(s - a);
  const cur = reduce ? clamp(Math.floor(target + 0.29), 0, N - 1) : clamp(t > 0.5 ? a + 1 : a, 0, N - 1);
  day = Math.round(clamp((s - 3.92) / 0.4) * 30);

  const F = reduce ? FRAME_AT[cur] : FRAME_AT[a], G = reduce ? F : FRAME_AT[Math.min(a + 1, N - 1)], k = reduce ? 0 : t;
  const cx = lerp(F.x, G.x, k), cy = lerp(F.y, G.y, k);
  // The camera looks straight at the cluster, so its spacing reads the same at every screen width.
  stage.style.perspectiveOrigin = `${cx.toFixed(1)}px ${cy.toFixed(1)}px`;
  rig.style.transform = `translate3d(${cx}px, ${cy}px, 0) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(${lerp(F.fit, G.fit, k)})`;
  for (const o of objects) place(o, s, time, clamp(cur, 0, N - 1));
  const night = paintSky(s, clamp(cur, 0, N - 1));
  fadeCopy(s, clamp(cur, 0, N - 1)); hud(clamp(cur, 0, N - 1));
  drawMotes(dt, time, s, night, velocity);
}

measure();
addEventListener('resize', measure);
document.fonts?.ready.then(measure); // copy widths change once the fonts arrive
requestAnimationFrame(frame);
