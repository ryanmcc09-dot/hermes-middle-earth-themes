/* Original Canvas2D scene: a gate of carved stone doors beside a still black lake.
   Cached static layers + a rippled cached reflection + small animated overlays.
   No imports, storage, network, audio, remote images, or pointer/mouse input of any kind. */
function createMoriaScene(canvas, options = {}) {
  if (!canvas || typeof canvas.getContext !== 'function') throw new TypeError('A canvas element is required.');
  options = options && typeof options === 'object' ? options : {};
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas2D is unavailable.');
  const doc = canvas.ownerDocument || document;
  const win = doc.defaultView || window;
  // The art lives on a 1000 x 720 stage that is fitted to the canvas height; width extends or crops around the doors.
  const TAU = Math.PI * 2, WL = 535, DX = 800, SY = 410, DR = 85, DB = 512, KR = .72, FX = 348, FY = 646, MX = 228, MY = 122;
  const layers = ['sky', 'back', 'water', 'fore'].map(name => {
    const cv = doc.createElement('canvas'), g = cv.getContext('2d');
    if (!g) throw new Error('Cached Canvas2D is unavailable.');
    return { name, cv, g, top: 0, padPx: 0 };
  });
  const media = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let width = 0, height = 0, dpr = 1, destroyed = false, raf = 0;
  let frames = 0, staticBuilds = 0, lastFrame = -Infinity, elapsed = 0, lastTick = null;
  let motion = options.motion !== false && !(media && media.matches);
  const fixed = Number.isFinite(options.fixedTime) ? options.fixedTime : null;
  const maxFPS = Math.min(24, Math.max(1, Number(options.fps) || 24));
  // View + scene objects that are rebuilt together with the cached layers.
  let sc = 1, ox = 0, XL = 0, XR = 1000, vw = 1000, isDark = true, stripH = 3, sprites = [], spr = {};
  let stars = [], clouds = [], mists = [], motes = [], embers = [], glints = [], ringSprites = [], rippleSlots = [], zone = null;
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function ss(a, b, x) { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); }
  function grad(g, x1, y1, x2, y2, stops) { const q = g.createLinearGradient(x1, y1, x2, y2); stops.forEach(s => q.addColorStop(s[0], s[1])); return q; }
  function poly(g, pts) { g.beginPath(); for (let i = 0; i < pts.length; i++) { if (i) g.lineTo(pts[i][0], pts[i][1]); else g.moveTo(pts[i][0], pts[i][1]); } g.closePath(); }
  function blob(g, x, y, rx, ry, rgb, a) {
    g.save(); g.translate(x, y); g.scale(1, ry / rx);
    const q = g.createRadialGradient(0, 0, 0, 0, 0, rx);
    q.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); q.addColorStop(.55, 'rgba(' + rgb + ',' + a * .5 + ')'); q.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = q; g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill(); g.restore();
  }
  function ridge(pts, seed, rough, depth) {
    const r = rng(seed); let out = pts.slice();
    for (let it = 0; it < depth; it++) {
      const nx = [out[0]];
      for (let i = 1; i < out.length; i++) { const a = out[i - 1], b = out[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]); nx.push([(a[0] + b[0]) / 2 + (r() - .5) * len * rough * .3, (a[1] + b[1]) / 2 + (r() - .5) * len * rough]); nx.push(b); }
      out = nx; rough *= .62;
    }
    return out;
  }
  // Pads a control list with gentle noise so ridges run well past either canvas edge.
  function extend(mid, seed, lo, hi) {
    const r = rng(seed), L0 = Math.min(-900, XL - 160), R0 = Math.max(2700, XR + 160), out = mid.slice();
    for (let x = mid[0][0] - 160; x > L0 - 160; x -= 160) out.unshift([x, lo + r() * (hi - lo)]);
    for (let x = mid[mid.length - 1][0] + 160; x < R0 + 160; x += 160) out.push([x, lo + r() * (hi - lo)]);
    return out;
  }
  function topAt(pts, x) { for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; if (x >= a[0] && x <= b[0]) return a[1] + (b[1] - a[1]) * (x - a[0]) / Math.max(1e-6, b[0] - a[0]); } return 9999; }
  function sprite(bx, by, bw, bh, resMul, fn) {
    const res = dpr * sc * (resMul || 1), cv = doc.createElement('canvas');
    cv.width = Math.max(1, Math.ceil(bw * res)); cv.height = Math.max(1, Math.ceil(bh * res));
    const g = cv.getContext('2d'); if (!g) throw new Error('Cached Canvas2D is unavailable.');
    const s = { cv, x: bx, y: by, w: bw, h: bh }; sprites.push(s);
    g.setTransform(res, 0, 0, res, -bx * res, -by * res); fn(g); return s;
  }
  function radialSprite(size, rgb, stops) {
    return sprite(0, 0, size, size, .5, g => { const q = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); stops.forEach(s => q.addColorStop(s[0], 'rgba(' + rgb + ',' + s[1] + ')')); g.fillStyle = q; g.fillRect(0, 0, size, size); });
  }
  function sizeLayer(l, y0, y1, padCss) {
    l.top = Math.round(y0 * sc * dpr); const bottom = Math.round(y1 * sc * dpr);
    l.padPx = Math.round((padCss || 0) * dpr);
    l.cv.width = Math.round(width * dpr) + 2 * l.padPx; l.cv.height = Math.max(1, bottom - l.top);
    l.g.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox + l.padPx, -l.top);
  }
  function rock(g, x, y, w, h, seed, base, lit) {
    const r = rng(seed), pts = [];
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, rr = .74 + .26 * r(); pts.push([x + Math.cos(a) * w * rr, y + Math.sin(a) * h * rr * (Math.sin(a) < 0 ? 1 : .55)]); }
    poly(g, pts); g.fillStyle = grad(g, x, y - h, x, y + h * .5, [[0, lit], [1, base]]); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = .8; g.beginPath(); g.moveTo(pts[1][0], pts[1][1]); g.lineTo(x + (r() - .5) * w * .3, y - h * .1); g.lineTo(pts[4][0], pts[4][1]); g.stroke();
  }
  // ---------- Static painting (stage coordinates) ----------
  function paintSky(g) {
    const D = isDark, L = XL - 80, R = XR + 80;
    g.fillStyle = grad(g, 0, 0, 0, 545, D ? [[0, '#04070e'], [.3, '#08101e'], [.58, '#101c34'], [.82, '#1b2b48'], [1, '#2c3f5d']] : [[0, '#aab5c2'], [.35, '#c6cdd6'], [.7, '#dbe0e5'], [1, '#eceeef']]);
    g.fillRect(L, -20, R - L, 585);
    blob(g, 560, 505, 760, 150, D ? '78,108,158' : '255,255,252', D ? .30 : .6);
    blob(g, 300, 470, 520, 90, D ? '96,120,164' : '255,255,255', D ? .14 : .35);
    if (D) {
      blob(g, MX, MY, 220, 200, '168,190,228', .17); blob(g, MX, MY, 92, 84, '200,218,246', .20);
      g.globalAlpha = .55; g.fillStyle = '#c4d0e6'; g.beginPath(); g.arc(MX, MY, 15, 0, TAU); g.fill(); g.globalAlpha = 1;
      // a layer of cloud veils the moon, leaving only a glow through it
      blob(g, MX + 2, MY + 1, 64, 19, '26,38,64', .86); blob(g, MX - 20, MY + 8, 52, 13, '24,36,60', .86); blob(g, MX + 24, MY - 5, 44, 12, '30,42,70', .8); blob(g, MX - 2, MY - 7, 46, 9, '52,68,104', .7); blob(g, MX - 4, MY - 2, 30, 8, '40,56,92', .6);
      blob(g, MX + 6, MY - 15, 40, 4, '150,170,214', .22);
    } else {
      blob(g, MX, 190, 330, 210, '255,250,240', .78); blob(g, MX, 190, 100, 76, '255,255,250', .6);
    }
    const q = g.createRadialGradient(XL + vw * .5, 280, vw * .28, XL + vw * .5, 280, vw * .85);
    q.addColorStop(0, 'rgba(2,4,12,0)'); q.addColorStop(1, D ? 'rgba(2,4,12,.42)' : 'rgba(70,80,96,.14)');
    g.fillStyle = q; g.fillRect(L, -20, R - L, 585);
  }
  function cliffPts() {
    const base = [[490, WL + 6], [522, 506], [552, 474], [580, 442], [606, 412], [630, 376], [654, 342], [678, 310], [698, 284], [718, 264], [740, 252], [747, 212], [753, 172], [768, 136], [796, 104], [846, 82], [920, 68]];
    const r = ridge(base, 4411, .10, 3); r.push([Math.max(2700, XR + 160), 56], [Math.max(2700, XR + 160), WL + 6]); return r;
  }
  function arcBand(g, r0, r1) {
    g.beginPath(); g.moveTo(DX - r1, DB); g.lineTo(DX - r1, SY); g.arc(DX, SY, r1, Math.PI, TAU); g.lineTo(DX + r1, DB); g.lineTo(DX + r0, DB); g.lineTo(DX + r0, SY); g.arc(DX, SY, r0, TAU, Math.PI, true); g.lineTo(DX - r0, DB); g.closePath();
  }
  function paintBack(g) {
    const D = isDark, c = (a, b) => D ? a : b, L0 = Math.min(-900, XL - 160), R0 = Math.max(2700, XR + 160);
    const fill = (pts, f) => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.lineTo(pts[pts.length - 1][0], WL + 8); g.lineTo(pts[0][0], WL + 8); g.closePath(); g.fillStyle = f; g.fill(); };
    // far hazy range
    const far = ridge(extend([[-60, 408], [40, 398], [130, 380], [240, 396], [330, 372], [430, 400], [520, 388], [640, 418], [760, 396]], 71, 380, 420), 71, .16, 3);
    fill(far, grad(g, 0, 360, 0, 520, [[0, c('#1a2742', '#a8b3c2')], [1, c('#233352', '#c0c8d2')]]));
    // Caradhras: snow-capped, lit from the moon side
    const near = ridge(extend([[-120, 420], [-30, 352], [40, 366], [92, 330], [150, 286], [190, 312], [214, 302], [250, 346], [300, 352], [342, 384], [402, 396], [442, 422], [520, 452], [586, 476]], 91, 440, 480), 91, .15, 3);
    fill(near, grad(g, 0, 280, 0, 500, [[0, c('#1c2943', '#97a3b4')], [1, c('#16213a', '#aab4c2')]]));
    g.save(); g.beginPath(); near.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.lineTo(R0, WL + 8); g.lineTo(L0, WL + 8); g.closePath(); g.clip();
    const sr = rng(5), snow = [[L0, 0]]; for (let x = L0; x < 700; x += 14) snow.push([x, 336 + 16 * Math.sin(x * .05) + sr() * 18 + 20 * Math.sin(x * .013)]); snow.push([700, 0]);
    g.beginPath(); snow.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fillStyle = c('rgba(150,172,212,.34)', 'rgba(250,252,255,.66)'); g.fill();
    g.fillStyle = grad(g, 40, 0, 330, 0, [[0, c('rgba(180,200,235,.20)', 'rgba(255,255,255,.2)')], [1, 'rgba(180,200,235,0)']]); g.fillRect(-120, 280, 460, 220);
    g.strokeStyle = c('rgba(150,172,212,.22)', 'rgba(255,255,255,.35)'); g.lineWidth = 1; g.beginPath(); g.moveTo(150, 288); g.lineTo(122, 340); g.lineTo(104, 380); g.moveTo(150, 288); g.lineTo(176, 322); g.moveTo(92, 332); g.lineTo(72, 372); g.stroke();
    g.restore();
    // haze that swallows the mountain feet
    g.fillStyle = grad(g, 0, 380, 0, WL, [[0, c('rgba(44,63,93,0)', 'rgba(236,238,239,0)')], [.7, c('rgba(44,63,93,.72)', 'rgba(236,238,239,.78)')], [1, c('rgba(52,74,108,.92)', 'rgba(238,240,240,.95)')]]); g.fillRect(L0, 380, R0 - L0, WL - 372);
    // low far shore with a few pines
    const shore = ridge(extend([[-60, 512], [120, 505], [260, 509], [380, 502], [470, 508], [560, 514]], 33, 500, 514), 33, .1, 3);
    fill(shore, grad(g, 0, 490, 0, WL, [[0, c('#0c1527', '#8e99a8')], [1, c('#101a2e', '#9ba5b3')]]));
    const pr = rng(88); g.fillStyle = c('#0b1324', '#86919f');
    for (let x = L0; x < 600; x += 7 + pr() * 12) { const y = topAt(shore, x) + 2, h = 7 + pr() * 13; g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x + .5, y - h); g.lineTo(x + 4, y); g.closePath(); g.fill(); }
    g.fillStyle = grad(g, 0, 480, 0, WL, [[0, c('rgba(60,84,122,0)', 'rgba(238,240,240,0)')], [1, c('rgba(60,84,122,.55)', 'rgba(238,240,240,.55)')]]); g.fillRect(L0, 480, 1000 - L0 + 100, WL - 470);
    // sheer cliff
    const cp = cliffPts(); spr.cliffTop = cp;
    g.beginPath(); cp.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath();
    g.fillStyle = grad(g, 540, 0, 1000, 0, [[0, c('#32466c', '#9aa5b4')], [.3, c('#1a2644', '#7c8797')], [1, c('#0a0f1c', '#5e697a')]]); g.fill();
    g.save(); g.clip();
    const cr = rng(2024);
    for (let i = 0; i < 46; i++) { const x = 540 + cr() * (R0 - 540), w = 10 + cr() * 46; g.fillStyle = cr() < .5 ? c('rgba(60,82,122,' + (.05 + cr() * .12) + ')', 'rgba(255,255,255,' + (.05 + cr() * .1) + ')') : c('rgba(2,5,12,' + (.10 + cr() * .2) + ')', 'rgba(50,60,76,' + (.06 + cr() * .12) + ')'); g.fillRect(x, 20, w, WL); }
    for (let i = 0; i < 14; i++) { // tall tilted planes give the wall some mass
      const x = 560 + cr() * (R0 - 560) * .55, w = 30 + cr() * 90, sk = (cr() - .5) * 60, lit = cr() < .45;
      g.fillStyle = lit ? c('rgba(80,108,160,' + (.06 + cr() * .08) + ')', 'rgba(255,255,255,.10)') : c('rgba(0,2,8,' + (.14 + cr() * .16) + ')', 'rgba(40,50,66,.14)');
      g.beginPath(); g.moveTo(x, 20); g.lineTo(x + w, 20); g.lineTo(x + w + sk, WL); g.lineTo(x + sk * .6, WL); g.closePath(); g.fill();
      if (lit) { g.strokeStyle = c('rgba(130,160,215,.14)', 'rgba(255,255,255,.3)'); g.lineWidth = 1; g.beginPath(); g.moveTo(x, 20); g.lineTo(x + sk * .6, WL); g.stroke(); }
    }
    for (let i = 0; i < 26; i++) { // ledges and cracks
      const y = 120 + cr() * 380, x = 700 + cr() * 600, len = 30 + cr() * 120;
      g.strokeStyle = c('rgba(2,5,12,.38)', 'rgba(40,50,66,.14)'); g.lineWidth = 1.1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + len * .4, y + (cr() - .5) * 4); g.lineTo(x + len, y + (cr() - .5) * 5); g.stroke();
      g.strokeStyle = c('rgba(110,140,196,.13)', 'rgba(255,255,255,.12)'); g.beginPath(); g.moveTo(x, y + 1.4); g.lineTo(x + len, y + 1.4 + (cr() - .5) * 4); g.stroke();
    }
    for (let i = 0; i < 16; i++) { const x = 720 + cr() * 500, y = 90 + cr() * 340; g.strokeStyle = c('rgba(2,5,12,.4)', 'rgba(40,50,66,.16)'); g.lineWidth = .9; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (cr() - .5) * 8, y + 20 + cr() * 24); g.lineTo(x + (cr() - .5) * 14, y + 50 + cr() * 40); g.stroke(); }
    g.fillStyle = grad(g, 0, 40, 0, WL, [[0, c('rgba(2,4,10,.30)', 'rgba(255,255,255,.12)')], [.6, 'rgba(0,0,0,0)'], [1, c('rgba(20,34,60,.5)', 'rgba(236,238,239,.5)')]]); g.fillRect(480, 0, R0, WL + 10);
    for (let i = 0; i < 9; i++) { const x = 600 + cr() * 330, y = topAt(cp, x) + 2 + cr() * 90; if (y > 480) continue; blob(g, x, y, 14 + cr() * 14, 4 + cr() * 4, c('2,6,14', '60,70,84'), c(.55, .15)); }
    // portal wall of dressed stone, clipped to the cliff
    const wallPath = () => { g.beginPath(); g.moveTo(DX - 140, DB + 2); g.lineTo(DX - 140, 330); g.quadraticCurveTo(DX, 215, DX + 140, 330); g.lineTo(DX + 140, DB + 2); g.closePath(); };
    wallPath(); g.fillStyle = grad(g, 0, 270, 0, DB, [[0, c('#1d2943', '#8793a3')], [1, c('#131c32', '#6c7787')]]); g.fill();
    g.save(); wallPath(); g.clip();
    for (let y = 276, row = 0; y < DB; y += 17, row++) { g.strokeStyle = c('rgba(0,0,0,.30)', 'rgba(40,50,66,.28)'); g.lineWidth = .8; g.beginPath(); g.moveTo(DX - 140, y); g.lineTo(DX + 140, y); g.stroke(); for (let x = DX - 140 + (row % 2) * 17; x < DX + 140; x += 34) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 17); g.stroke(); } }
    g.fillStyle = grad(g, DX - 140, 0, DX + 140, 0, [[0, c('rgba(110,140,196,.10)', 'rgba(255,255,255,.14)')], [1, 'rgba(0,0,0,.18)']]); g.fillRect(DX - 140, 200, 280, 330);
    g.restore();
    wallPath(); g.strokeStyle = c('rgba(120,150,205,.30)', 'rgba(255,255,255,.4)'); g.lineWidth = 1.4; g.stroke();
    g.restore();
    g.beginPath(); cp.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.strokeStyle = c('rgba(150,182,236,.42)', 'rgba(255,255,255,.55)'); g.lineWidth = 1.3; g.lineJoin = 'round'; g.stroke();
    // rubble at the cliff foot
    const br = rng(61); for (let i = 0; i < 26; i++) { const x = 470 + br() * (R0 - 470); if (x > DX - 150 && x < DX + 160) continue; rock(g, x, WL - 3 + br() * 3, 7 + br() * 13, 5 + br() * 7, 100 + i, c('#0a1020', '#59657a'), c('#243250', '#8e9aae')); }
    // recessed inscription band, frame, and the two leaves
    arcBand(g, 98, 121); g.fillStyle = grad(g, 0, 289, 0, DB, [[0, c('#1a2540', '#7d899b')], [1, c('#141d34', '#6b7688')]]); g.fill(); g.strokeStyle = c('rgba(130,160,215,.35)', 'rgba(255,255,255,.4)'); g.lineWidth = 1; g.stroke();
    arcBand(g, DR, 98); g.fillStyle = grad(g, 0, 310, 0, DB, [[0, c('#2b3a5b', '#a1acbb')], [1, c('#1b2640', '#7f8b9d')]]); g.fill();
    g.strokeStyle = c('rgba(0,0,0,.45)', 'rgba(40,50,66,.4)'); g.lineWidth = .9; g.beginPath();
    for (let a = 0; a <= 12; a++) { const th = Math.PI + a / 12 * Math.PI; g.moveTo(DX + Math.cos(th) * DR, SY + Math.sin(th) * DR); g.lineTo(DX + Math.cos(th) * 98, SY + Math.sin(th) * 98); }
    for (let y = SY + 12; y < DB; y += 17) { g.moveTo(DX - DR, y); g.lineTo(DX - 98, y); g.moveTo(DX + DR, y); g.lineTo(DX + 98, y); }
    g.stroke();
    g.beginPath(); g.moveTo(DX - DR, DB); g.lineTo(DX - DR, SY); g.arc(DX, SY, DR, Math.PI, TAU); g.lineTo(DX + DR, DB); g.closePath();
    g.fillStyle = grad(g, 0, SY - DR, 0, DB, [[0, c('#0b101d', '#4a5568')], [1, c('#090d17', '#3c4759')]]); g.fill();
    g.save(); g.clip();
    g.fillStyle = grad(g, DX - DR, 0, DX + DR, 0, [[0, c('rgba(70,96,146,.22)', 'rgba(255,255,255,.12)')], [.5, 'rgba(0,0,0,.05)'], [1, 'rgba(0,0,0,.30)']]); g.fillRect(DX - DR, SY - DR, DR * 2, DR + 105);
    g.strokeStyle = c('rgba(110,140,196,.22)', 'rgba(255,255,255,.25)'); g.lineWidth = 1; g.beginPath(); g.moveTo(DX - DR + 7, DB); g.lineTo(DX - DR + 7, SY); g.arc(DX, SY, DR - 7, Math.PI, TAU); g.lineTo(DX + DR - 7, DB); g.stroke();
    g.strokeStyle = c('rgba(0,0,0,.55)', 'rgba(20,28,40,.5)'); g.lineWidth = 2.4; g.beginPath(); g.moveTo(DX, SY - DR); g.lineTo(DX, DB); g.stroke();
    g.strokeStyle = c('rgba(110,140,196,.14)', 'rgba(255,255,255,.22)'); g.lineWidth = .9; g.beginPath(); g.moveTo(DX + 1.8, SY - DR + 2); g.lineTo(DX + 1.8, DB); g.moveTo(DX - 1.8, SY - DR + 2); g.lineTo(DX - 1.8, DB); g.stroke();
    g.strokeStyle = c('rgba(110,140,196,.13)', 'rgba(255,255,255,.18)'); g.lineWidth = .8;
    for (const sd of [-1, 1]) { g.strokeRect(sd > 0 ? DX + 7 : DX - DR + 12, SY + 16, DR - 19, DB - SY - 24); }
    const dr = rng(404); g.strokeStyle = c('rgba(0,0,0,.35)', 'rgba(20,28,40,.3)'); g.lineWidth = .8;
    for (let i = 0; i < 8; i++) { const x = DX - 70 + dr() * 140, y = 360 + dr() * 140; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (dr() - .5) * 10, y + 14 + dr() * 18); g.stroke(); }
    g.restore();
    // apron and steps
    poly(g, [[640, DB + 10], [660, DB], [950, DB], [972, DB + 10]]); g.fillStyle = grad(g, 0, DB, 0, DB + 10, [[0, c('#2a3856', '#a3aebd')], [1, c('#223049', '#939eae')]]); g.fill();
    poly(g, [[640, DB + 10], [972, DB + 10], [978, WL], [632, WL]]); g.fillStyle = grad(g, 0, DB + 10, 0, WL, [[0, c('#141d34', '#7b8697')], [1, c('#0a1020', '#5d6879')]]); g.fill();
    g.strokeStyle = c('rgba(0,0,0,.45)', 'rgba(40,50,66,.4)'); g.lineWidth = .8; g.beginPath(); for (let x = 650; x < 975; x += 31) { g.moveTo(x, DB + 10); g.lineTo(x + 1, WL); } g.moveTo(640, DB + 10); g.lineTo(972, DB + 10); g.stroke();
    g.strokeStyle = c('rgba(130,160,215,.4)', 'rgba(255,255,255,.5)'); g.lineWidth = 1; g.beginPath(); g.moveTo(660, DB); g.lineTo(950, DB); g.stroke();
    poly(g, [[622, DB + 22], [644, DB + 12], [644, WL], [614, WL]]); g.fillStyle = c('#0f172b', '#68737f'); g.fill();
    poly(g, [[600, DB + 36], [622, DB + 24], [622, WL], [600, WL]]); g.fillStyle = c('#0b1223', '#5f6a79'); g.fill();
    blob(g, DX, DB + 3, 150, 16, c('150,196,255', '255,255,255'), c(.12, .22));
  }
  // Invented glyphs: a stem and a few random ticks, never real letters.
  function inscription() {
    const r = rng(8123), list = [], rad = 109;
    const make = (x, y, th, u) => { const g = { x, y, rot: th + Math.PI / 2, u, s: [] }, ticks = 1 + Math.floor(r() * 3); if (r() < .86) g.s.push([0, 6, 0, -6]); else g.s.push([-3, 5, 0, -6], [0, -6, 3, 5]); for (let i = 0; i < ticks; i++) { const yy = -4 + Math.floor(r() * 4) * 3, sd = r() < .5 ? -1 : 1; g.s.push([0, yy, sd * 3.6, yy - 2.4 * (r() < .5 ? 1 : -1)]); } if (r() < .3) g.s.push([-3.2, -1, 3.2, -1]); if (r() < .26) g.dot = -7.4; if (r() < .2) g.s.push([-3, -3, 0, 0], [0, 0, 3, -3]); list.push(g); };
    const nSide = 8, nArc = 30, total = nSide * 2 + nArc;
    for (let i = 0; i < nSide; i++) make(DX - rad, DB - 8 - i * 12, Math.PI, i / total);
    for (let i = 0; i < nArc; i++) { const th = Math.PI + (i + .5) / nArc * Math.PI; make(DX + Math.cos(th) * rad, SY + Math.sin(th) * rad, th, (nSide + i) / total); }
    for (let i = nSide - 1; i >= 0; i--) make(DX + rad, DB - 8 - i * 12, TAU, (nSide + nArc + (nSide - 1 - i)) / total);
    return list;
  }
  function glow(g, build, a) {
    g.lineCap = 'round'; g.lineJoin = 'round';
    const D = isDark, pass = [[5.2, D ? .09 : .05], [2.6, D ? .20 : .10], [1.15, D ? .96 : .70]];
    pass.forEach((p, i) => { g.lineWidth = p[0]; g.strokeStyle = i < 2 ? (D ? 'rgba(130,184,255,' + p[1] * a + ')' : 'rgba(118,140,176,' + p[1] * a + ')') : (D ? 'rgba(222,238,255,' + p[1] * a + ')' : 'rgba(160,176,202,' + p[1] * a + ')'); g.beginPath(); build(g); g.stroke(); });
  }
  function frameStrokes(g) {
    g.moveTo(DX - DR + 4, DB - 2); g.lineTo(DX - DR + 4, SY); g.arc(DX, SY, DR - 4, Math.PI, TAU); g.lineTo(DX + DR - 4, DB - 2);
    g.moveTo(DX - DR + 4, DB - 2); g.lineTo(DX + DR - 4, DB - 2);
    for (const s of [-1, 1]) { // two stylised trees: double trunk, roots, paired branches, leaf ticks
      const bx = DX + s * 58;
      g.moveTo(bx - 4, DB - 3); g.bezierCurveTo(bx - 2.5, 485, bx - 3.5, 455, bx - 2, 420); g.moveTo(bx + 4, DB - 3); g.bezierCurveTo(bx + 2.5, 485, bx + 3.5, 455, bx + 2, 420);
      g.moveTo(bx - 3, DB - 4); g.quadraticCurveTo(bx - 8, DB - 2, bx - 15, DB - 1); g.moveTo(bx + 3, DB - 4); g.quadraticCurveTo(bx + 8, DB - 2, bx + 15, DB - 1); g.moveTo(bx, DB - 4); g.lineTo(bx + s * 3, DB - 1);
      g.moveTo(bx, 482); g.bezierCurveTo(bx + s * 10, 478, bx + s * 19, 470, bx + s * 25, 457);
      g.moveTo(bx, 468); g.bezierCurveTo(bx - s * 8, 460, bx - s * 13, 450, bx - s * 15, 438);
      g.moveTo(bx, 452); g.bezierCurveTo(bx + s * 8, 442, bx + s * 16, 434, bx + s * 21, 421);
      g.moveTo(bx, 438); g.bezierCurveTo(bx - s * 5, 428, bx - s * 10, 420, bx - s * 10, 408);
      g.moveTo(bx, 421); g.bezierCurveTo(bx + s * 3, 410, bx + s * 7, 402, bx + s * 8, 392);
      for (const t of [[s * 25, 457, 4], [-s * 15, 438, 3.5], [s * 21, 421, 4], [-s * 10, 408, 3.5], [s * 8, 392, 3.5]]) { const lx = bx + t[0], ly = t[1], q = t[2]; g.moveTo(lx, ly); g.lineTo(lx + q * .9, ly - q * 1.2); g.moveTo(lx, ly); g.lineTo(lx - q * .9, ly - q * 1.1); g.moveTo(lx, ly); g.lineTo(lx + .1, ly - q * 1.5); }
    }
  }
  function emblemStrokes(g) {
    g.moveTo(DX - 28, DB - 4); g.lineTo(DX - 28, 442); g.quadraticCurveTo(DX - 28, 421, DX, 411); g.quadraticCurveTo(DX + 28, 421, DX + 28, 442); g.lineTo(DX + 28, DB - 4);
    // anvil
    g.moveTo(DX - 19, 484); g.lineTo(DX + 13, 484); g.lineTo(DX + 13, 488); g.lineTo(DX + 7, 491); g.lineTo(DX + 7, 494); g.lineTo(DX + 12, 501); g.lineTo(DX - 12, 501); g.lineTo(DX - 7, 494); g.lineTo(DX - 7, 491); g.lineTo(DX - 14, 488); g.lineTo(DX - 19, 484);
    g.moveTo(DX - 19, 484); g.quadraticCurveTo(DX - 25, 484, DX - 26, 488);
    // hammer: shaft and head resting above the anvil
    g.moveTo(DX + 8, 481); g.lineTo(DX - 8, 457); const hx = DX - 8, hy = 457; g.moveTo(hx - 6.5, hy - 2.5); g.lineTo(hx + 4.5, hy + 4.5); g.lineTo(hx + 8.5, hy - 1.5); g.lineTo(hx - 2.5, hy - 8.5); g.closePath();
    // a spark line across the keystone
    g.moveTo(DX - 6, 436); g.lineTo(DX + 6, 436);
  }
  function crownStrokes(g) {
    const cx = DX, cy = 410, rr = 44;
    for (let i = 0; i < 7; i++) { const th = Math.PI * 1.18 + i / 6 * Math.PI * .64, x = cx + Math.cos(th) * rr, y = cy + Math.sin(th) * rr, q = i === 3 ? 4.6 : 3.4; for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3 + (i === 3 ? 0 : .2); g.moveTo(x - Math.cos(a) * q, y - Math.sin(a) * q); g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } }
    g.moveTo(cx + Math.cos(Math.PI * 1.1) * 53, cy + Math.sin(Math.PI * 1.1) * 53); g.arc(cx, cy, 53, Math.PI * 1.1, Math.PI * 1.9);
  }
  function paintShore(g, pts) {
    const D = isDark, c = (a, b) => D ? a : b;
    g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.lineTo(pts[pts.length - 1][0], 760); g.lineTo(pts[0][0], 760); g.closePath();
    g.fillStyle = grad(g, 0, 580, 0, 720, [[0, c('#1c2640', '#59647a')], [1, c('#0a0f1c', '#333c4b')]]); g.fill();
    g.strokeStyle = c('rgba(120,150,205,.2)', 'rgba(255,255,255,.4)'); g.lineWidth = 1; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke();
  }
  function causewayPt(t) { const u = 1 - t; return [u * u * u * 388 + 3 * u * u * t * 470 + 3 * u * t * t * 570 + t * t * t * 668, u * u * u * 650 + 3 * u * u * t * 644 + 3 * u * t * t * 598 + t * t * t * 549]; }
  function paintCauseway(g) {
    const D = isDark, c = (x, y) => D ? x : y, sq = .35, rr = rng(777);
    const slabs = [[0, .085, 1], [.1, .19, 1], [.2, .305, .6], [.335, .42, 1], [.46, .545, .5], [.6, .7, 1], [.72, .8, 1], [.84, .915, .7], [.935, 1, 1]];
    slabs.forEach((s, i) => {
      const mid = (s[0] + s[1]) / 2, p0 = causewayPt(s[0]), p1 = causewayPt(s[1] - (1 - s[2]) * .02), q0 = causewayPt(Math.max(0, s[0] - .01)), q1 = causewayPt(Math.min(1, s[1] + .01));
      let tx = q1[0] - q0[0], ty = (q1[1] - q0[1]) / sq; const tl = Math.hypot(tx, ty); tx /= tl; ty /= tl;
      const hw = (19 - 9 * mid) * (.62 + .38 * s[2]), nx = -ty * hw, ny = tx * hw * sq, th = 7.5 * (1 - .45 * mid), sag = (1 - s[2]) * 2.5 + rr() * 1;
      const A = [p0[0] - nx, p0[1] - ny + sag], B = [p1[0] - nx, p1[1] - ny + sag * .5], C = [p1[0] + nx, p1[1] + ny + sag * .5], E = [p0[0] + nx, p0[1] + ny + sag];
      poly(g, [E, C, [C[0], C[1] + th], [E[0], E[1] + th]]); g.fillStyle = c('#0b1223', '#56616f'); g.fill();
      poly(g, [A, E, [E[0], E[1] + th], [A[0], A[1] + th]]); g.fillStyle = c('#101a30', '#667180'); g.fill();
      poly(g, [A, B, C, E]); g.fillStyle = grad(g, 0, A[1], 0, E[1], [[0, c('#2c3a58', '#8f9bac')], [1, c('#222e4a', '#7d899b')]]); g.fill();
      g.strokeStyle = c('rgba(150,180,235,.34)', 'rgba(255,255,255,.5)'); g.lineWidth = .8; g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke();
      g.strokeStyle = c('rgba(0,0,0,.4)', 'rgba(40,50,66,.4)'); g.beginPath(); g.moveTo((A[0] + B[0]) / 2, (A[1] + B[1]) / 2); g.lineTo((E[0] + C[0]) / 2, (E[1] + C[1]) / 2); g.stroke();
      if (i % 2 === 0) rock(g, p0[0] - 4, p0[1] + ny + th, 5.5, 3.4, 300 + i, c('#0a1020', '#59657a'), c('#1e2a46', '#8d99ad'));
      g.fillStyle = c('rgba(70,100,150,.18)', 'rgba(255,255,255,.3)'); g.fillRect(E[0], E[1] + th + 1, C[0] - E[0], 1.2);
    });
  }
  function paintFore(g) {
    const D = isDark, c = (a, b) => D ? a : b;
    const shorePts = ridge([[-1000, 588], [-300, 586], [20, 586], [100, 592], [160, 606], [215, 614], [268, 620], [330, 626], [392, 632], [436, 644], [424, 658], [384, 668], [336, 684], [306, 702], [290, 722]], 551, .06, 2);
    spr.shore = shorePts;
    paintCauseway(g);
    paintShore(g, shorePts);
    const rr = rng(1331);
    for (let i = 0; i < 18; i++) { const x = -60 + rr() * 330, y = 596 + rr() * 80; if (Math.hypot(x - FX, y - FY) < 34) continue; rock(g, x, y, 10 + rr() * 22, 7 + rr() * 11, 500 + i, c('#070c18', '#323b49'), c('#1c2640', '#5d6879')); }
    for (let i = 0; i < 9; i++) rock(g, XL - 40 + rr() * (XL > -40 ? 60 : -XL + 120), 600 + rr() * 110, 20 + rr() * 34, 12 + rr() * 16, 700 + i, c('#050810', '#2a3240'), c('#141c32', '#4e5968'));
    // great rocks behind the fire for shelter
    rock(g, 296, 632, 36, 26, 901, c('#080d1a', '#363f4d'), c('#232f4c', '#677285')); rock(g, 270, 646, 24, 14, 902, c('#060a16', '#2f3744'), c('#1c2640', '#59647a'));
    // fire pit: ring of stones, charred logs, coals
    blob(g, FX, FY + 3, 36, 10, '255,120,40', c(.55, .35));
    g.strokeStyle = c('#0a0d16', '#2b2f38'); g.lineCap = 'round'; g.lineWidth = 5; g.beginPath(); g.moveTo(FX - 17, FY + 6); g.lineTo(FX + 13, FY - 2); g.moveTo(FX + 16, FY + 6); g.lineTo(FX - 12, FY - 3); g.stroke();
    g.strokeStyle = 'rgba(255,128,42,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(FX - 16, FY + 3.6); g.lineTo(FX + 10, FY - 3.4); g.moveTo(FX + 14, FY + 3.6); g.lineTo(FX - 10, FY - 4.4); g.stroke();
    for (let i = 0; i < 11; i++) { const a = i / 11 * TAU + .3; rock(g, FX + Math.cos(a) * 25, FY + 5 + Math.sin(a) * 8, 5.4, 3.8, 1200 + i, c('#090d18', '#303845'), Math.sin(a) > 0 ? c('#4a3a38', '#8b7a70') : c('#1d2742', '#4f5a6c')); }
    { const pr2 = rng(6060); for (let i = 0; i < 90; i++) { const x = -40 + pr2() * 360, y = 600 + pr2() * 100; if (y < topAt(spr.shore, x) + 3) continue; g.fillStyle = pr2() < .5 ? c('rgba(150,170,210,.14)', 'rgba(255,255,255,.2)') : c('rgba(0,0,0,.35)', 'rgba(30,38,50,.25)'); g.fillRect(x, y, 1 + pr2() * 2.2, .8 + pr2()); } }
    // warm rim light on rocks near the fire (static part)
    g.save(); g.globalCompositeOperation = D ? 'lighter' : 'source-over'; blob(g, FX, FY - 4, 130, 70, '255,140,56', c(.26, .16)); g.restore();
    // reeds and rocks framing the lower right
    const rd = rng(4242);
    for (let i = 0; i < 6; i++) rock(g, 880 + rd() * (Math.max(1100, XR + 100) - 880), 712 + rd() * 20, 30 + rd() * 44, 16 + rd() * 20, 1500 + i, c('#04060d', '#252c38'), c('#111a2e', '#46505f'));
    g.strokeStyle = c('#05080f', '#2b3340'); g.lineWidth = 1.1; g.lineCap = 'round'; g.beginPath();
    for (let i = 0; i < 70; i++) { const x = 840 + rd() * (Math.max(1100, XR + 40) - 840), h = 18 + rd() * 52, lean = (rd() - .35) * 16; g.moveTo(x, 724); g.quadraticCurveTo(x + lean * .3, 724 - h * .6, x + lean, 724 - h); }
    g.stroke();
    for (let i = 0; i < 22; i++) { const x = -60 + rd() * 90 + (XL < -60 ? XL : 0), h = 14 + rd() * 28; g.beginPath(); g.moveTo(x, 600); g.quadraticCurveTo(x + 4, 600 - h * .6, x + 8 * (rd() - .3), 600 - h); g.stroke(); }
  }
  function paintWater(g, l) {
    const D = isDark, c = (a, b) => D ? a : b, k = dpr * sc, L = XL - 80, R = XR + 80;
    g.save(); g.setTransform(k, 0, 0, -KR * k, dpr * ox + l.padPx, k * WL * (1 + KR) - l.top);
    paintSky(g); paintBack(g);
    g.globalAlpha = c(.42, .30); spr.frameStatic.forEach(s => g.drawImage(s.cv, s.x, s.y, s.w, s.h)); g.globalAlpha = 1;
    g.globalAlpha = c(.55, .42); paintCauseway(g); g.globalAlpha = 1;
    g.restore();
    g.fillStyle = grad(g, 0, WL, 0, 725, [[0, c('rgba(8,14,28,.30)', 'rgba(196,204,214,.25)')], [.45, c('rgba(5,9,20,.62)', 'rgba(160,170,184,.42)')], [1, c('rgba(2,4,10,.92)', 'rgba(104,114,130,.62)')]]); g.fillRect(L, WL, R - L, 725 - WL);
    const sr = rng(55); g.lineWidth = .9; g.lineCap = 'round';
    for (let i = 0; i < 70; i++) { const u = Math.pow(sr(), 1.5), y = WL + 4 + u * 178, len = (14 + sr() * 110) * (.4 + u), x = XL + sr() * vw; g.strokeStyle = c('rgba(150,182,236,' + (.04 + sr() * .08) + ')', 'rgba(255,255,255,' + (.2 + sr() * .2) + ')'); g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y); g.stroke(); }
    g.fillStyle = c('rgba(140,176,235,.25)', 'rgba(255,255,255,.55)'); g.fillRect(L, WL, R - L, 1);
    g.fillStyle = grad(g, XL, 0, XR, 0, [[0, 'rgba(0,0,0,.34)'], [.14, 'rgba(0,0,0,0)'], [.86, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.34)']]); g.globalAlpha = c(1, .25); g.fillRect(L, WL, R - L, 725 - WL); g.globalAlpha = 1;
  }
  function buildScene() {
    const W = width, H = height; isDark = options.dark !== false; const D = isDark, c = (a, b) => D ? a : b;
    sc = H / 720; vw = W / sc;
    const a = vw >= 1000 ? (1000 - vw) / 2 : Math.max(0, Math.min(1000 - vw, DX - vw * .56));
    ox = -a * sc; XL = a; XR = a + vw;
    stripH = Math.max(2, Math.round(2.6 * dpr));
    sprites.forEach(s => { s.cv.width = 1; s.cv.height = 1; }); sprites = []; spr = {};
    sizeLayer(layers[0], 0, 548); sizeLayer(layers[1], 0, 548); sizeLayer(layers[2], WL, 720, 10); sizeLayer(layers[3], 520, 720);
    paintSky(layers[0].g);
    paintBack(layers[1].g);
    // Ithildin parts: separate cached sprites so each pulses on its own slow clock.
    const bb = [DX - 140, 255, 280, 262], gl = inscription();
    spr.frame = sprite(bb[0], bb[1], bb[2], bb[3], 1, g => glow(g, frameStrokes, 1));
    spr.emblem = sprite(bb[0], bb[1], bb[2], bb[3], 1, g => { glow(g, emblemStrokes, 1); glow(g, crownStrokes, 1); });
    const ringLine = g => { g.moveTo(DX - 121, DB - 2); g.lineTo(DX - 121, SY); g.arc(DX, SY, 121, Math.PI, TAU); g.lineTo(DX + 121, DB - 2); g.moveTo(DX - 98, DB - 2); g.lineTo(DX - 98, SY); g.arc(DX, SY, 98, Math.PI, TAU); g.lineTo(DX + 98, DB - 2); };
    ringSprites = [];
    for (let k = 0; k < 6; k++) ringSprites.push({ sp: sprite(bb[0], bb[1], bb[2], bb[3], 1, g => {
      if (k === 0) glow(g, ringLine, .5);
      glow(g, p => { gl.forEach(q => { if (Math.min(5, Math.floor(q.u * 6)) !== k) return; const co = Math.cos(q.rot), si = Math.sin(q.rot), T = (x, y) => [q.x + x * co - y * si, q.y + x * si + y * co]; q.s.forEach(s => { const m = T(s[0], s[1]), n = T(s[2], s[3]); p.moveTo(m[0], m[1]); p.lineTo(n[0], n[1]); }); if (q.dot) { const m = T(0, q.dot); p.moveTo(m[0] + 1.5, m[1]); p.arc(m[0], m[1], 1.5, 0, TAU); } }); }, 1);
    }), ph: -k * .9 });
    spr.frameStatic = [spr.frame, spr.emblem].concat(ringSprites.map(r => r.sp));
    spr.halo = sprite(DX - 190, 230, 380, WL - 230, .35, g => { const q = g.createRadialGradient(DX, 430, 0, DX, 430, 190); q.addColorStop(0, 'rgba(' + c('150,200,255', '140,170,210') + ',.30)'); q.addColorStop(.6, 'rgba(' + c('120,170,240', '140,170,210') + ',.10)'); q.addColorStop(1, 'rgba(120,170,240,0)'); g.fillStyle = q; g.fillRect(DX - 190, 230, 380, WL - 230); });
    paintFore(layers[3].g);
    paintWater(layers[2].g, layers[2]);
    // ---------- overlay data ----------
    spr.glow = radialSprite(128, '255,160,70', [[0, .85], [.3, .40], [1, 0]]);
    spr.ember = radialSprite(24, '255,176,92', [[0, 1], [.35, .45], [1, 0]]);
    spr.mote = radialSprite(16, c('196,214,244', '255,255,255'), [[0, 1], [.4, .35], [1, 0]]);
    const zx0 = XL + vw * .24, zx1 = XL + vw * .76; zone = { x0: zx0, x1: zx1, y0: 720 * .06, y1: 720 * .34 };
    const inZone = (x, y) => x > zx0 && x < zx1 && y > zone.y0 && y < zone.y1;
    // stars (night only); the few that clear the skyline also get a faint reflection
    stars = [];
    if (D) {
      const sr = rng(16321), n = Math.max(60, Math.min(220, Math.round(120 * vw / 1000)));
      for (let i = 0; i < n; i++) {
        const x = XL + sr() * vw, y = 410 * Math.pow(sr(), 1.12), bright = sr() < .1, b0 = sr(), sp0 = sr(), ph0 = sr();
        if (Math.hypot(x - MX, y - MY) < 36) continue;
        const zn = inZone(x, y), sky = Math.min(topAt(spr.cliffTop, x), 9999), ry = WL + (WL - y) * KR;
        stars.push({ x, y, r: (bright && !zn ? 1.05 : .5 + b0 * .35), b: zn ? .22 + b0 * .3 : (bright ? .9 : .30 + b0 * .5), sp: .5 + sp0 * 1.4, ph: ph0 * TAU, big: bright && !zn, refl: ry < 712 && y < sky - 8 && y > 300 });
      }
    }
    // clouds: soft, thin, faded where they cross the title zone
    const cdefs = [[.34, 880, 26, 0, 150, .16], [.22, 760, 20, .6, 70, .14], [.52, 560, 16, .35, 215, .15], [.08, 640, 17, .8, 100, .12], [.42, 420, 12, .15, 290, .10]];
    clouds = cdefs.map((d, i) => {
      const w = d[1], h = w * .15, r = rng(70 + i * 17), n = 8 + Math.floor(r() * 4), body = c('108,126,168', '255,255,255'), under = c('60,74,108', '196,204,214');
      const sp = sprite(0, 0, w, h, .5, g => { for (let k = 0; k < n; k++) { const u = (k + .5) / n, cx = w * (.1 + .8 * u), cy = h * (.58 - .12 * Math.sin(Math.PI * u) * r()), rx = w * (.07 + .06 * r()), ry = h * (.28 + .2 * r()); blob(g, cx, cy + ry * .2, rx, ry, under, .3); blob(g, cx, cy, rx * .9, ry * .85, body, .5); } });
      return { sp, w, h, v: d[2] * .1, x0: d[3], y: d[4], a: d[5] * (D ? 1 : 1.9), p: i * 1.7 };
    });
    // water mist tendrils
    {
      const mw = Math.max(900, vw * 1.1), rgb = c('150,170,205', '244,246,248'), make = seed => { const q = rng(seed); return sprite(0, 0, mw, 80, .4, g => { for (let i = 0; i < 14; i++) blob(g, mw * (.06 + .88 * q()), 40 + (q() - .5) * 20, mw * (.07 + .09 * q()), 8 + q() * 14, rgb, .6); }); };
      const m1 = make(31), m2 = make(97);
      mists = [{ sp: m1, y: 505, v: .55, x0: .1, a: 1, front: false, sy: 1 }, { sp: m2, y: 530, v: -.38, x0: .6, a: .8, front: false, sy: .9 }, { sp: m1, y: 556, v: .7, x0: .85, a: .7, front: false, sy: 1 }, { sp: m2, y: 620, v: -.5, x0: .3, a: .6, front: true, sy: 1.1 }, { sp: m1, y: 684, v: .35, x0: .7, a: .5, front: true, sy: 1.3 }];
    }
    // dust motes: keep clear of the calm title zone
    const mr = rng(2929); motes = [];
    for (let i = 0; i < 40; i++) { const x = XL + mr() * vw, y = 280 + mr() * 420; motes.push({ x, y, ax: 6 + mr() * 16, ay: 3 + mr() * 9, w1: .12 + mr() * .22, w2: .3 + mr() * .4, p1: mr() * TAU, p2: mr() * TAU, vx: (mr() - .35) * .8, sz: 2 + mr() * 2.2, b: .25 + mr() * .55, tw: .2 + mr() * .4, tp: mr() * TAU }); }
    const er = rng(909); embers = [];
    for (let i = 0; i < 12; i++) embers.push({ ph: er(), rate: .12 + er() * .08, dx: (er() - .5) * 10, sway: 4 + er() * 8, w: .8 + er() * 1.4, p: er() * TAU, rise: 70 + er() * 90, sz: 2 + er() * 2.4 });
    const gr = rng(321); glints = [];
    for (let i = 0; i < 16; i++) glints.push({ x: DX - 95 + gr() * 190, y: WL + 8 + gr() * 120, w: 7 + gr() * 22, ph: gr() * TAU, sp: .35 + gr() * .5 });
    rippleSlots = [{ per: 11, off: 0 }, { per: 14, off: 5 }, { per: 17, off: 9 }];
    staticBuilds++;
  }
  function blit(l) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(l.cv, -l.padPx, l.top); }
  function draw(timeSeconds) {
    if (destroyed || !width || !height) return;
    const t = Number.isFinite(timeSeconds) ? timeSeconds : (fixed === null ? elapsed : fixed);
    const D = isDark, k = dpr * sc, W = width, H = height;
    const stage = () => ctx.setTransform(k, 0, 0, k, dpr * ox, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    blit(layers[0]); stage();
    // twinkling stars (night)
    if (D) {
      ctx.fillStyle = '#e6eeff';
      for (let i = 0; i < stars.length; i++) { const q = stars[i], tw = .5 + .5 * Math.sin(t * q.sp + q.ph), a = q.b * (.45 + .55 * tw); ctx.globalAlpha = a; ctx.fillRect(q.x - q.r, q.y - q.r, q.r * 2, q.r * 2); if (q.big && tw > .72) { ctx.globalAlpha = a * .4; ctx.fillRect(q.x - q.r * 3.5, q.y - .3, q.r * 7, .6); ctx.fillRect(q.x - .3, q.y - q.r * 3.5, .6, q.r * 7); } }
      ctx.globalAlpha = 1;
    }
    // moon glow behind its cloud: slow, shallow breathing
    ctx.globalCompositeOperation = D ? 'lighter' : 'source-over';
    { const m = D ? .20 + .035 * Math.sin(t * .30) : .20 + .03 * Math.sin(t * .3); ctx.globalAlpha = m; const R = 130; ctx.drawImage(spr.glow.cv, MX - R, MY - R * .85, R * 2, R * 1.7); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < clouds.length; i++) {
      const cl = clouds[i], span = vw + cl.w * 1.2, x = XL + (((cl.x0 * span + t * cl.v) % span) + span) % span - cl.w * .6, y = cl.y + Math.sin(t * .05 + cl.p) * 3;
      const cx = (x + cl.w / 2 - XL) / vw, cyf = (y + cl.h / 2) / 720, zn = ss(.2, .32, cx) * (1 - ss(.68, .8, cx)) * ss(.03, .09, cyf) * (1 - ss(.30, .38, cyf));
      ctx.globalAlpha = cl.a * (1 - .8 * zn); ctx.drawImage(cl.sp.cv, x, y, cl.w, cl.h);
    }
    ctx.globalAlpha = 1;
    blit(layers[1]); stage();
    // ithildin: slow pulses, one wave drifting around the inscription
    {
      ctx.globalCompositeOperation = D ? 'lighter' : 'source-over';
      const pf = .72 + .2 * Math.sin(t * .56), pe = .74 + .18 * Math.sin(t * .47 + 1.4);
      ctx.globalAlpha = (D ? .55 : .30) * pf; ctx.drawImage(spr.halo.cv, spr.halo.x, spr.halo.y, spr.halo.w, spr.halo.h);
      ctx.globalAlpha = (D ? 1 : .62) * pf; ctx.drawImage(spr.frame.cv, spr.frame.x, spr.frame.y, spr.frame.w, spr.frame.h);
      ctx.globalAlpha = (D ? 1 : .62) * pe; ctx.drawImage(spr.emblem.cv, spr.emblem.x, spr.emblem.y, spr.emblem.w, spr.emblem.h);
      for (let i = 0; i < ringSprites.length; i++) { const r = ringSprites[i]; ctx.globalAlpha = (D ? 1 : .62) * (.7 + .22 * Math.sin(t * .42 + r.ph)); ctx.drawImage(r.sp.cv, r.sp.x, r.sp.y, r.sp.w, r.sp.h); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    // rippled mirror: cached reflection redrawn in thin strips with a slow horizontal sway
    {
      const l = layers[2], cv = l.cv, w = cv.width, h = cv.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (let y = 0, i = 0; y < h; y += stripH, i++) {
        const u = y / h, hh = Math.min(stripH, h - y), A = dpr * (.3 + 1.7 * u * u + .5 * u), dx = A * (.7 * Math.sin(i * .52 + t * .8) + .45 * Math.sin(i * .21 - t * .5 + 1.3));
        ctx.drawImage(cv, 0, y, w, hh, -l.padPx + dx, l.top + y, w, hh);
      }
      stage();
      // pulsing door glow, mirrored and foreshortened (halo only reaches the waterline, so it stays on the lake)
      ctx.save(); ctx.translate(0, WL); ctx.scale(1, -KR); ctx.translate(0, -WL);
      ctx.globalCompositeOperation = D ? 'lighter' : 'source-over'; ctx.globalAlpha = (D ? .34 : .16) * (.72 + .2 * Math.sin(t * .56)); ctx.drawImage(spr.halo.cv, spr.halo.x, spr.halo.y, spr.halo.w, spr.halo.h); ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
      if (D) {
        ctx.fillStyle = '#c8d8f4';
        for (let i = 0; i < stars.length; i++) { const q = stars[i]; if (!q.refl) continue; const ry = WL + (WL - q.y) * KR, tw = .5 + .5 * Math.sin(t * q.sp + q.ph), dx = Math.sin(t * .9 + ry * .3) * .9; ctx.globalAlpha = q.b * (.4 + .6 * tw) * .42; ctx.fillRect(q.x + dx - 1, ry, 2, .7); }
        ctx.fillStyle = '#bcd6ff';
        for (let i = 0; i < glints.length; i++) { const q = glints[i], a = Math.max(0, Math.sin(t * q.sp + q.ph)); ctx.globalAlpha = .26 * a * a; ctx.fillRect(q.x + Math.sin(t * .6 + q.ph) * 3, q.y, q.w, .9); }
      }
      ctx.globalAlpha = 1;
      // occasional faint rings
      ctx.lineWidth = .8; ctx.strokeStyle = D ? '#bdd2f2' : '#ffffff';
      for (let i = 0; i < rippleSlots.length; i++) {
        const s = rippleSlots[i], ph = (t + s.off) / s.per, cyc = Math.floor(ph), u = (ph - cyc) / .55;
        if (u >= 1) continue;
        const r = rng(cyc * 131 + i * 17 + 7), x = 400 + r() * 560, y = 570 + r() * 120, sk = .4 + .6 * (y - WL) / 185, rad = (3 + 36 * Math.pow(u, .7)) * sk, fade = Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - u);
        for (let j = 0; j < 2; j++) { const rj = rad - j * 5 * sk; if (rj < 1.5) continue; ctx.globalAlpha = (D ? .30 : .55) * fade * (j ? .55 : 1); ctx.beginPath(); ctx.ellipse(x, y, rj, rj * .24, 0, 0, TAU); ctx.stroke(); }
      }
      ctx.globalAlpha = 1;
    }
    // mist along the water (far set), then foreground, then near mist
    const drawMist = front => {
      const base = D ? .15 : .34;
      for (let i = 0; i < mists.length; i++) {
        const m = mists[i]; if (m.front !== front) continue;
        const sw = m.sp.w, span = vw + sw, x = XL + (((m.x0 * span + t * m.v) % span) + span) % span - sw, h = m.sp.h * m.sy;
        ctx.globalAlpha = base * m.a * (.78 + .22 * Math.sin(t * .13 + i * 2)); ctx.drawImage(m.sp.cv, x, m.y - h / 2, sw, h);
      }
      ctx.globalAlpha = 1;
    };
    drawMist(false);
    blit(layers[3]); stage();
    drawMist(true);
    // campfire: low, slow glow and a few small tongues
    {
      const fl = .045 * Math.sin(t * 2.1) + .03 * Math.sin(t * 3.4 + 1.3) + .02 * Math.sin(t * 5.3 + 2.2);
      ctx.globalCompositeOperation = D ? 'lighter' : 'source-over';
      ctx.globalAlpha = (D ? .36 : .22) * (1 + fl * 1.4); ctx.drawImage(spr.glow.cv, FX - 190, FY - 90, 380, 160);
      ctx.globalAlpha = (D ? .55 : .36) * (1 + fl); ctx.drawImage(spr.glow.cv, FX - 40, FY - 36, 80, 56);
      ctx.globalAlpha = (D ? .14 : .08) * (1 + fl); ctx.drawImage(spr.glow.cv, FX + 20, FY + 20, 130, 40);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      const tg = [[-7, 23, 6.2, .3, 1.15], [1, 31, 8, 1.7, .9], [8, 18, 5.6, 3.1, 1.4]];
      for (let i = 0; i < tg.length; i++) {
        const q = tg[i], hgt = q[1] * (1 + .07 * Math.sin(t * q[4] * 2.1 + q[3]) + .04 * Math.sin(t * 3.1 + q[3] * 2)), sw = 1.3 * Math.sin(t * q[4] * 1.5 + q[3]), x = FX + q[0], w = q[2];
        for (let j = 0; j < 3; j++) {
          const sc2 = [1, .72, .42][j], hh = hgt * sc2, ww = w * sc2;
          ctx.fillStyle = ['rgba(214,92,28,.88)', 'rgba(244,150,48,.92)', 'rgba(255,224,150,.95)'][j];
          ctx.beginPath(); ctx.moveTo(x - ww, FY + 1); ctx.bezierCurveTo(x - ww * 1.1, FY - hh * .45, x - ww * .3 + sw, FY - hh * .72, x + sw, FY - hh); ctx.bezierCurveTo(x + ww * .3 + sw, FY - hh * .72, x + ww * 1.1, FY - hh * .45, x + ww, FY + 1); ctx.closePath(); ctx.fill();
        }
      }
      // rising embers
      ctx.globalCompositeOperation = D ? 'lighter' : 'source-over';
      for (let i = 0; i < embers.length; i++) {
        const e = embers[i], age = (((t * e.rate + e.ph) % 1) + 1) % 1, y = FY - 8 - age * e.rise, x = FX + e.dx + Math.sin(age * 5 + e.p + t * .3) * e.sway * age + age * 8, a = Math.sin(Math.PI * Math.min(1, age * 1.15)) * (1 - age * .55) * (.7 + .3 * Math.sin(t * e.w + e.p)), z = e.sz * (1 - age * .4);
        ctx.globalAlpha = Math.max(0, a * (D ? .9 : .7)); ctx.drawImage(spr.ember.cv, x - z, y - z, z * 2, z * 2);
      }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    // drifting dust motes
    ctx.globalCompositeOperation = D ? 'lighter' : 'source-over';
    for (let i = 0; i < motes.length; i++) {
      const m = motes[i], span = vw + 40, x = XL + ((((m.x - XL + t * m.vx) % span) + span) % span) - 20 + Math.sin(t * m.w1 + m.p1) * m.ax, y = m.y + Math.cos(t * m.w2 + m.p2) * m.ay;
      ctx.globalAlpha = (D ? .38 : .5) * m.b * (.6 + .4 * Math.sin(t * m.tw + m.tp)); ctx.drawImage(spr.mote.cv, x - m.sz, y - m.sz, m.sz * 2, m.sz * 2);
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    frames++;
  }
  function dimensions() {
    const r = canvas.getBoundingClientRect();
    const positive = n => Number.isFinite(Number(n)) && Number(n) > 0;
    return { w: Math.max(1, Math.round(positive(options.width) ? Number(options.width) : r.width || canvas.clientWidth || win.innerWidth || 1000)), h: Math.max(1, Math.round(positive(options.height) ? Number(options.height) : r.height || canvas.clientHeight || win.innerHeight || 720)) };
  }
  function resize(force) {
    if (destroyed) return;
    const n = dimensions(), ratio = Math.min(1.5, Math.max(1, Number(win.devicePixelRatio) || 1));
    if (!force && n.w === width && n.h === height && ratio === dpr) return;
    width = n.w; height = n.h; dpr = ratio; canvas.width = Math.max(1, Math.round(width * dpr)); canvas.height = Math.max(1, Math.round(height * dpr)); buildScene(); draw();
  }
  function shouldRun() { return !destroyed && !doc.hidden && motion && fixed === null; }
  function tick(timestamp) { raf = 0; if (!shouldRun()) return; if (lastTick !== null) elapsed += Math.max(0, Math.min(.2, (timestamp - lastTick) / 1000)); lastTick = timestamp; if (timestamp - lastFrame >= 1000 / maxFPS) { lastFrame = timestamp; draw(elapsed); } raf = win.requestAnimationFrame(tick); }
  function sync() { if (raf) win.cancelAnimationFrame(raf); raf = 0; lastTick = null; lastFrame = -Infinity; if (shouldRun()) raf = win.requestAnimationFrame(tick); else if (!doc.hidden) draw(); }
  function visibility() { sync(); }
  function preference() { motion = options.motion !== false && !(media && media.matches); sync(); }
  function onResize() { resize(false); }
  let observer = null;
  function destroy() {
    if (destroyed) return; destroyed = true; if (raf) win.cancelAnimationFrame(raf); raf = 0;
    if (observer) observer.disconnect(); observer = null;
    doc.removeEventListener('visibilitychange', visibility); win.removeEventListener('resize', onResize);
    if (media) { if (media.removeEventListener) media.removeEventListener('change', preference); else if (media.removeListener) media.removeListener(preference); }
    layers.forEach(l => { l.cv.width = 1; l.cv.height = 1; }); sprites.forEach(s => { s.cv.width = 1; s.cv.height = 1; });
    stars = []; clouds = []; mists = []; motes = []; embers = []; glints = []; ringSprites = []; rippleSlots = []; sprites = []; spr = {}; zone = null;
  }
  try {
    // Fail before acquiring listeners when initial graphics cannot be drawn.
    resize(true);
    doc.addEventListener('visibilitychange', visibility); win.addEventListener('resize', onResize);
    if (media) { if (media.addEventListener) media.addEventListener('change', preference); else if (media.addListener) media.addListener(preference); }
    observer = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(onResize) : null;
    if (observer) observer.observe(canvas);
    sync();
  } catch (error) {
    destroy();
    throw error;
  }
  return {
    draw,
    refresh(nextOptions) { if (nextOptions && typeof nextOptions === 'object') options = Object.assign({}, options, nextOptions); resize(true); if (nextOptions && typeof nextOptions === 'object' && 'motion' in nextOptions) preference(); },
    stats() { return { frames, frameCount: frames, paused: !shouldRun(), motion, width, height, dpr, fps: maxFPS, staticBuilds, destroyed, fixedTime: fixed, dark: options.dark !== false, layers: layers.length }; },
    destroy
  };
}
