/* Original Canvas2D storybook scene: the golden forest of Lothlorien.
   Static art lives on cached offscreen layers; only soft overlays are redrawn per frame.
   Ambient and autonomous only. No imports, storage, network, audio, or remote images. */
function createLothlorienScene(canvas, options = {}) {
  if (!canvas || typeof canvas.getContext !== 'function') throw new TypeError('A canvas element is required.');
  options = options && typeof options === 'object' ? options : {};
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas2D is unavailable.');
  const doc = canvas.ownerDocument || document;
  const win = doc.defaultView || window;
  // [name, top fraction, bottom fraction, resolution scale]
  const DEFS = [['sky', 0, 1, 1], ['canopy', 0, .64, 1], ['forest', .12, 1, 1], ['rayA', .12, .96, .5], ['rayB', .12, .96, .5], ['rayC', .12, .96, .5], ['edge', 0, 1, 1]];
  const layers = DEFS.map(d => {
    const cv = doc.createElement('canvas');
    const g = cv.getContext('2d');
    if (!g) throw new Error('Cached Canvas2D is unavailable.');
    return { name: d[0], y0: d[1], y1: d[2], res: d[3], cv, g, top: 0, topPx: 0 };
  });
  const LAYER = {}; layers.forEach((l, i) => { LAYER[l.name] = i; });
  const media = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let width = 0, height = 0, dpr = 1, destroyed = false, raf = 0;
  let frames = 0, staticBuilds = 0, lastFrame = -Infinity, elapsed = 0, lastTick = null;
  let motion = options.motion !== false && !(media && media.matches);
  const fixed = Number.isFinite(options.fixedTime) ? options.fixedTime : null;
  const maxFPS = Math.min(24, Math.max(1, Number(options.fps) || 24));
  let sc = 1, K = 1;
  // Scene objects built together with the cached layers.
  let sprites = [], spr = {}, stars = [], lanterns = [], clusters = [], clusterSprites = [], leaves = [], motes = [], mists = [], rays = [];
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function ss(a, b, x) { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rgbOf(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function hex2(n) { n = Math.max(0, Math.min(255, Math.round(n))); return (n < 16 ? '0' : '') + n.toString(16); }
  function mixc(a, b, t) { const p = rgbOf(a), q = rgbOf(b); return '#' + hex2(lerp(p[0], q[0], t)) + hex2(lerp(p[1], q[1], t)) + hex2(lerp(p[2], q[2], t)); }
  function rgba(h, a) { return 'rgba(' + rgbOf(h).join(',') + ',' + a + ')'; }
  function path(c, fill, stroke, lineWidth, build) { c.beginPath(); build(c); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lineWidth; c.stroke(); } }
  function ellipse(c, x, y, rx, ry, fill, stroke, lineWidth) { path(c, fill, stroke, lineWidth || 1, p => p.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)); }
  function gradient(c, x1, y1, x2, y2, stops) { const g = c.createLinearGradient(x1, y1, x2, y2); stops.forEach(s => g.addColorStop(s[0], s[1])); return g; }
  function sprite(w, h, res, fn) {
    const cv = doc.createElement('canvas'); cv.width = Math.max(1, Math.round(w * res)); cv.height = Math.max(1, Math.round(h * res));
    const g = cv.getContext('2d'); if (!g) throw new Error('Cached Canvas2D is unavailable.');
    const s = { cv, w, h }; sprites.push(s);
    g.setTransform(res, 0, 0, res, 0, 0); fn(g); return s;
  }
  function blob(g, x, y, rx, ry, rgb, a) {
    g.save(); g.translate(x, y); g.scale(1, ry / rx);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
    gr.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); gr.addColorStop(.55, 'rgba(' + rgb + ',' + a * .55 + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill(); g.restore();
  }
  function radialSprite(size, rgb, stops) {
    return sprite(size, size, 1, g => { const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); stops.forEach(s => gr.addColorStop(s[0], 'rgba(' + rgb + ',' + s[1] + ')')); g.fillStyle = gr; g.fillRect(0, 0, size, size); });
  }
  function leafPath(p, x, y, len, wid, ang) {
    const ca = Math.cos(ang), sa = Math.sin(ang), hx = ca * len / 2, hy = sa * len / 2, nx = -sa * wid * .8, ny = ca * wid * .8;
    p.moveTo(x - hx, y - hy); p.quadraticCurveTo(x + nx, y + ny, x + hx, y + hy); p.quadraticCurveTo(x - nx, y - ny, x - hx, y - hy);
  }
  function buildLandscape() {
    const W = width, H = height, dark = options.dark !== false;
    const sx = W / 1000, sy = H / 720, S = Math.min(sx, sy);
    sc = S; K = Math.max(S, Math.sqrt(sx * sy) * .8);
    const Wd = Math.max(sx, sy * .5); // width scale for trunks keeps them stout on tall narrow screens
    const X = n => n * sx, Y = n => n * sy;
    layers.forEach(l => {
      l.top = Math.floor(H * l.y0); l.topPx = Math.round(l.top * dpr);
      const r = dpr * l.res;
      l.cv.width = Math.max(1, Math.round(W * r)); l.cv.height = Math.max(1, Math.round((Math.ceil(H * l.y1) - l.top) * r));
      l.g.setTransform(r, 0, 0, r, 0, -l.top * r);
    });
    sprites.forEach(s => { s.cv.width = 1; s.cv.height = 1; }); sprites = []; spr = {};
    // ---------- palette ----------
    const P = dark ? {
      sky: [[0, '#08111f'], [.18, '#0d1d30'], [.34, '#173540'], [.55, '#2b4c4a'], [.74, '#2f5249'], [1, '#14302a']],
      haze: '#2d4e4c', glow: '216,190,118', warmHaze: 'rgba(222,190,112,.20)',
      ramp: ['#1c2a32', '#33454e', '#566a75', '#8fa1a8', '#6a7e88', '#27373f'],
      wood: '#5d5340', woodDk: '#2e2a22', rail: '#a49872',
      ground: [[0, '#233f3a'], [.35, '#17332b'], [1, '#0b1e1a']], gladeLit: '212,190,110', gladeA: .20,
      stone: ['#b7c3bd', '#98a8a5', '#7d8f90'], stoneEdge: 'rgba(8,20,22,.5)', soil: 'rgba(14,26,22,.42)',
      flower: ['#e0bf62', '#f0d98c'], flowerCore: '#fff4c8', blade: ['rgba(10,28,24,.7)', 'rgba(104,138,88,.4)', 'rgba(150,160,90,.3)'],
      deep: ['#0e2629', '#143330', '#1b3c2f', '#27472f'], gold: ['#8d7a3e', '#b09a4f', '#cdb768', '#e2d599'], silver: ['#b4c4bd', '#d3dccb'],
      canopyBase: '#0d2326', mist: '178,200,208', vign: 'rgba(5,14,16,', lanternA: 1, ray: '190,212,222', rayPeak: .11, fern: ['#0b211f', '#143028']
    } : {
      sky: [[0, '#c4dccd'], [.18, '#d8e6c8'], [.34, '#eae7b8'], [.55, '#efe3a4'], [.74, '#d6d58f'], [1, '#9db769']],
      haze: '#e7e2b4', glow: '255,238,168', warmHaze: 'rgba(255,236,160,.30)',
      ramp: ['#7f7a5c', '#a49e7a', '#c4bd98', '#efe8c8', '#d5ceaa', '#8d8863'],
      wood: '#8c744a', woodDk: '#5a4a30', rail: '#c0a76c',
      ground: [[0, '#b9c880'], [.35, '#8fae56'], [1, '#55793a']], gladeLit: '255,240,170', gladeA: .34,
      stone: ['#f0ead0', '#ddd6b8', '#c4bd9e'], stoneEdge: 'rgba(70,70,40,.38)', soil: 'rgba(110,100,52,.28)',
      flower: ['#e8b93c', '#f4d36a'], flowerCore: '#fff6cf', blade: ['rgba(44,78,36,.7)', 'rgba(122,158,70,.5)', 'rgba(206,196,100,.4)'],
      deep: ['#5c8040', '#6f9444', '#82a24c', '#96ae55'], gold: ['#d2b04a', '#e2c566', '#efd98c', '#f6e8b0'], silver: ['#fbf3cf', '#fffae0'],
      canopyBase: '#6a8f45', mist: '255,250,226', vign: 'rgba(48,66,24,', lanternA: .55, ray: '255,238,160', rayPeak: .26, fern: ['#3e6a32', '#5a8a3c']
    };
    const hazeRamp = (fog, hz) => P.ramp.map(c => mixc(c, hz || P.haze, fog));
    // Trunk with centreline bend, root flare and bark strokes. Dimensions in px.
    function trunk(g, o) {
      const r = rng(o.seed), N = Math.max(10, Math.round((o.yb - o.yt) / 12)), ph = r() * 6.28, fog = o.fog || 0;
      const L = [], R = [], Cc = [];
      for (let i = 0; i <= N; i++) {
        const u = i / N, y = o.yb - (o.yb - o.yt) * u;
        const fl = Math.pow(Math.max(0, 1 - u / .16), 2) * (o.flare || .45), w = (o.w0 + (o.w1 - o.w0) * Math.pow(u, .85)) / 2 * (1 + fl + .02 * Math.sin(u * 17 + ph));
        const cx = o.x + o.bend * Math.sin(u * 2.4 + ph);
        L.push([cx - w, y]); R.push([cx + w, y]); Cc.push([cx, y, w]);
      }
      const ramp = hazeRamp(fog), stops = o.hi > 0 ? ramp : ramp.slice().reverse(), span = o.w0 * 1.3;
      const poly = p => { p.moveTo(L[0][0], L[0][1]); for (let i = 1; i <= N; i++) p.lineTo(L[i][0], L[i][1]); for (let i = N; i >= 0; i--) p.lineTo(R[i][0], R[i][1]); p.closePath(); };
      path(g, gradient(g, o.x - span / 2, 0, o.x + span / 2, 0, stops.map((c, i) => [[0, .2, .5, .78, .92, 1][i], c])), null, 0, poly);
      g.save(); g.beginPath(); poly(g); g.clip();
      const nL = Math.max(8, Math.min(34, Math.round(o.w0 / 5)));
      for (let pass = 0; pass < 3; pass++) {
        g.beginPath();
        for (let k = 0; k < nL; k++) {
          const f = (r() * 2 - 1) * .92, ph2 = r() * 6.28, wob = (.5 + r()) * .035;
          if (pass === 1 && f * o.hi < .1) continue; if (pass === 2 && Math.abs(f) > .55) continue;
          let started = false;
          for (let i = 0; i <= N; i += 1) { const q = Cc[i], x = q[0] + f * q[2] + Math.sin(i * .35 + ph2) * q[2] * wob * 1.6, y = q[1]; if (!started) { g.moveTo(x, y); started = true; } else g.lineTo(x, y); }
        }
        g.strokeStyle = pass === 0 ? rgba(dark ? '#0a141a' : '#4a4630', .15 * (1 - fog * .8)) : pass === 1 ? rgba(dark ? '#cfdde0' : '#fffbe6', .13 * (1 - fog * .7)) : rgba(dark ? '#0a141a' : '#5a5238', .10 * (1 - fog * .8));
        g.lineWidth = Math.max(.8, o.w0 / 70) * (pass === 1 ? .9 : 1.2); g.stroke();
      }
      // soft contact shade at the base and a pale rim of light on the lit side
      g.fillStyle = gradient(g, 0, o.yb, 0, o.yb - (o.yb - o.yt) * .16, [[0, rgba(dark ? '#06120f' : '#3a4a20', .5 * (1 - fog))], [1, 'rgba(0,0,0,0)']]); g.fillRect(o.x - o.w0, o.yt, o.w0 * 2, o.yb - o.yt + 4);
      g.restore();
      return Cc;
    }
    // A scratch layer lets whole groups fade out at the top (trunks vanish into the canopy glow).
    function faded(layer, y0, y1, fn) {
      const cv = doc.createElement('canvas'); cv.width = layer.cv.width; cv.height = layer.cv.height;
      const g = cv.getContext('2d'); if (!g) throw new Error('Cached Canvas2D is unavailable.');
      sprites.push({ cv, w: 1, h: 1 });
      const r = dpr * layer.res; g.setTransform(r, 0, 0, r, 0, -layer.top * r); fn(g);
      g.globalCompositeOperation = 'destination-in'; g.fillStyle = gradient(g, 0, y0, 0, y1, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,1)']]);
      g.fillRect(0, layer.top - 5, W, layer.cv.height / r + 10); g.globalCompositeOperation = 'source-over';
      layer.g.save(); layer.g.setTransform(1, 0, 0, 1, 0, 0); layer.g.drawImage(cv, 0, 0); layer.g.restore();
      cv.width = 1; cv.height = 1;
    }
    function lanternBody(g, x, y, k) {
      g.strokeStyle = dark ? '#8d9b9c' : '#6b6a4c'; g.lineWidth = Math.max(.8, .9 * k); g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 5 * k); g.stroke();
      path(g, dark ? '#a9b7b6' : '#8c8a68', null, 0, p => { p.moveTo(x - 5 * k, y + 9 * k); p.lineTo(x, y + 4 * k); p.lineTo(x + 5 * k, y + 9 * k); p.closePath(); });
      path(g, gradient(g, 0, y + 9 * k, 0, y + 21 * k, [[0, '#fffdf0'], [1, '#f6e9bd']]), dark ? '#aab7b6' : '#7c7a58', Math.max(.7, .8 * k), p => { p.rect(x - 4 * k, y + 9 * k, 8 * k, 12 * k); });
      g.fillStyle = dark ? '#aab7b6' : '#7c7a58'; g.fillRect(x - 5 * k, y + 21 * k, 10 * k, 1.8 * k);
    }
    function addLantern(x, y, r, stage, rr) { lanterns.push({ x, y, r, stage, ph: rr() * 6.28, ph2: rr() * 6.28, w: .45 + rr() * .3 }); }
    // Flet (platform) seen from below, with brackets, railing, and optional lanterns on poles.
    function flet(g, o) {
      const { x, y, rx, k } = o, ry = rx * .2, tw = o.tw, fog = o.fog || 0, wd = mixc(P.wood, P.haze, fog), wk = mixc(P.woodDk, P.haze, fog), rl = mixc(P.rail, P.haze, fog), h = 22 * k;
      // back railing, only where it is not behind the trunk
      g.strokeStyle = wk; g.lineWidth = Math.max(.8, 1.4 * k); g.beginPath();
      for (let i = 0; i <= 14; i++) { const a = Math.PI + i * Math.PI / 14, px = x + Math.cos(a) * rx, py = y + Math.sin(a) * ry; if (Math.abs(px - x) < tw * 1.02) continue; g.moveTo(px, py); g.lineTo(px, py - h * .9); }
      g.stroke();
      g.beginPath(); { let on = false; for (let i = 0; i <= 28; i++) { const a = Math.PI + i * Math.PI / 28, px = x + Math.cos(a) * rx, py = y + Math.sin(a) * ry - h * .9; if (Math.abs(px - x) < tw * 1.02) { on = false; continue; } if (!on) { g.moveTo(px, py); on = true; } else g.lineTo(px, py); } } g.stroke();
      // brackets and underside
      g.strokeStyle = wk; g.lineWidth = Math.max(1, 2.4 * k);
      g.beginPath(); for (const sd of [-1, 1]) { g.moveTo(x + sd * tw * .9, y + ry + 26 * k); g.lineTo(x + sd * rx * .82, y + ry * .75); g.moveTo(x + sd * tw * .6, y + ry + 18 * k); g.lineTo(x + sd * rx * .5, y + ry * .95); } g.stroke();
      path(g, gradient(g, 0, y, 0, y + ry + 4 * k, [[0, wd], [1, wk]]), null, 0, p => { p.ellipse(x, y, rx, ry, 0, 0, Math.PI); p.lineTo(x + rx, y - 3.2 * k); p.ellipse(x, y - 3.2 * k, rx, ry, 0, Math.PI, 0, true); p.closePath(); });
      g.strokeStyle = rgba(dark ? '#05100e' : '#3a2c18', .38); g.lineWidth = Math.max(.6, .8 * k); g.beginPath();
      for (let i = 1; i < 16; i++) { const a = i * Math.PI / 16; g.moveTo(x + Math.cos(a) * rx * .2, y - 2 * k + Math.sin(a) * ry * .25); g.lineTo(x + Math.cos(a) * rx * .98, y - 3 * k + Math.sin(a) * ry * .98); } g.stroke();
      g.strokeStyle = rl; g.lineWidth = Math.max(.9, 1.5 * k); g.beginPath(); g.ellipse(x, y - 3.2 * k, rx, ry, 0, 0, Math.PI); g.stroke();
      // front railing
      g.strokeStyle = wk; g.lineWidth = Math.max(.9, 1.5 * k); g.beginPath();
      for (let i = 0; i <= 16; i++) { const a = i * Math.PI / 16, px = x + Math.cos(a) * rx * .98, py = y - 3 * k + Math.sin(a) * ry * .98; g.moveTo(px, py); g.lineTo(px, py - h); }
      g.stroke();
      g.strokeStyle = rl; g.lineWidth = Math.max(1, 1.9 * k); g.beginPath(); g.ellipse(x, y - 3 * k - h, rx * .98, ry * .98, 0, 0, Math.PI); g.stroke();
      g.lineWidth = Math.max(.7, 1 * k); g.beginPath(); g.ellipse(x, y - 3 * k - h * .5, rx * .98, ry * .98, 0, 0, Math.PI); g.stroke();
      return h;
    }
    // Slender spiral stair wound around a trunk: front half drawn, back half only where it clears the trunk.
    function spiral(g, o) {
      const { x, yb, yt, R, turns, k, tw } = o, N = 190, pts = [], ph = o.ph || 0;
      for (let i = 0; i <= N; i++) { const u = i / N, a = turns * 6.2832 * u + ph; pts.push([x + R * Math.sin(a), yb - (yb - yt) * u, Math.cos(a)]); }
      const wk = mixc(P.woodDk, P.haze, o.fog || 0), wd = mixc(P.wood, P.haze, o.fog || 0), rl = mixc(P.rail, P.haze, o.fog || 0);
      const vis = q => q[2] > 0 || Math.abs(q[0] - x) > tw * 1.02;
      g.strokeStyle = wk; g.lineWidth = Math.max(.8, 1.1 * k); g.beginPath(); let on = false;
      for (const q of pts) { if (!vis(q)) { on = false; continue; } if (!on) { g.moveTo(q[0], q[1] - 17 * k); on = true; } else g.lineTo(q[0], q[1] - 17 * k); } g.stroke();
      const steps = Math.round(turns * 13);
      for (let s = 0; s <= steps; s++) {
        const q = pts[Math.min(N, Math.round(s / steps * N))]; if (!vis(q)) continue;
        const front = q[2] > 0, len = (front ? 7.5 : 5.5) * k;
        path(g, front ? wd : wk, wk, Math.max(.6, .6 * k), p => { p.rect(q[0] - len, q[1] - 1.4 * k, len * 2, 2.8 * k); });
        if (front && s % 3 === 0) { g.strokeStyle = wk; g.lineWidth = Math.max(.6, .8 * k); g.beginPath(); g.moveTo(q[0], q[1] - 1.4 * k); g.lineTo(q[0], q[1] - 17 * k); g.stroke(); }
      }
      g.strokeStyle = rl; g.lineWidth = Math.max(.7, .9 * k); g.beginPath(); on = false;
      for (const q of pts) { if (q[2] <= 0 || !vis(q)) { on = false; continue; } if (!on) { g.moveTo(q[0], q[1] - 17 * k); on = true; } else g.lineTo(q[0], q[1] - 17 * k); } g.stroke();
    }
    // ===================================== Layer: sky + far forest (opaque) =====================================
    let c = layers[LAYER.sky].g;
    c.fillStyle = gradient(c, 0, 0, 0, H, P.sky); c.fillRect(0, 0, W, H);
    // luminous haze behind the trunks, strongest low-centre
    { const hz = c.createRadialGradient(X(520), Y(430), 0, X(520), Y(430), X(620)); hz.addColorStop(0, P.warmHaze); hz.addColorStop(1, 'rgba(255,240,170,0)'); c.fillStyle = hz; c.fillRect(0, 0, W, H); }
    { const hz = c.createRadialGradient(X(560), Y(120), 0, X(560), Y(120), X(420)); hz.addColorStop(0, dark ? 'rgba(130,160,190,.16)' : 'rgba(255,248,200,.30)'); hz.addColorStop(1, 'rgba(255,240,170,0)'); c.fillStyle = hz; c.fillRect(0, 0, W, H); }
    // far canopy: soft overlapping golden-green masses melting into haze
    { const fr = rng(88);
      for (let i = 0; i < 70; i++) { const xu = fr() * 1000, yu = 150 + fr() * 130; const rgb = dark ? (fr() < .5 ? '86,104,70' : '120,118,72') : (fr() < .5 ? '190,200,120' : '226,210,130'); blob(c, X(xu), Y(yu), X(60 + fr() * 90), Y(24 + fr() * 36), rgb, dark ? .12 : .22); }
    }
    const lr = rng(5151);
    // far trunks, two depths
    faded(layers[LAYER.sky], Y(130), Y(330), g => {
      [[118, 78, .8, 36], [372, 64, .82, 31], [585, 70, .8, 43], [930, 80, .78, 47]].forEach((t, i) => trunk(g, { x: X(t[0]), yb: Y(480), yt: Y(80), w0: Wd * t[1] * 1.0, w1: Wd * t[1] * .8, bend: Wd * 5, hi: i % 2 ? 1 : -1, fog: t[2], seed: t[3], flare: .3 }));
      [[250, 90, .62, 71], [478, 78, .66, 73]].forEach((t, i) => trunk(g, { x: X(t[0]), yb: Y(492), yt: Y(60), w0: Wd * t[1], w1: Wd * t[1] * .74, bend: Wd * 7, hi: i % 2 ? -1 : 1, fog: t[2], seed: t[3], flare: .4 }));
    });
    // far flets: tiny lit platforms with spirals, fading into haze
    flet(c, { x: X(118), y: Y(338), rx: Wd * 46, k: K * .5, tw: Wd * 29, fog: .72 }); spiral(c, { x: X(118), yb: Y(470), yt: Y(342), R: Wd * 36, turns: 2.4, k: K * .5, tw: Wd * 29, fog: .72 });
    addLantern(X(118) + Wd * 40, Y(338) - 30 * K * .5 + 10, 26 * K, 0, lr); lanternBody(c, X(118) + Wd * 40, Y(338) - 40 * K * .5, K * .45);
    flet(c, { x: X(585), y: Y(312), rx: Wd * 54, k: K * .55, tw: Wd * 33, fog: .74 });
    addLantern(X(585) - Wd * 50, Y(312) - 24 * K * .55 + 10, 28 * K, 0, lr); lanternBody(c, X(585) - Wd * 50, Y(312) - 36 * K * .55, K * .5);
    flet(c, { x: X(930), y: Y(268), rx: Wd * 48, k: K * .52, tw: Wd * 31, fog: .7 });
    addLantern(X(930) - Wd * 44, Y(268) - 26 * K * .5 + 10, 26 * K, 0, lr); lanternBody(c, X(930) - Wd * 44, Y(268) - 38 * K * .5, K * .46);
    // distant lit flets: only a soft glow and a speck, almost lost in the haze
    for (const v of [[300, 384, .9], [440, 362, .8], [690, 352, .9], [820, 404, .8]]) {
      ellipse(c, X(v[0]), Y(v[1]) + 1, 7 * K, 1.6 * K, rgba(P.haze, .75)); addLantern(X(v[0]), Y(v[1]) - 2 * K, 12 * K * v[2], 0, lr);
      c.fillStyle = dark ? 'rgba(250,244,214,.9)' : 'rgba(255,250,224,.95)'; c.fillRect(X(v[0]) - .8, Y(v[1]) - 3 * K, 1.8, 1.8);
    }
    // haze band where the forest floor meets the trunks
    c.fillStyle = gradient(c, 0, Y(400), 0, Y(520), [[0, rgba(P.haze, 0)], [.6, rgba(P.haze, dark ? .45 : .5)], [1, rgba(P.haze, dark ? .6 : .6)]]); c.fillRect(0, Y(400), W, Y(120));
    // ===================================== Layer: canopy =====================================
    c = layers[LAYER.canopy].g;
    const Lb = xu => { const pts = [[0, 372], [90, 335], [190, 272], [250, 172], [330, 108], [500, 84], [670, 106], [760, 176], [830, 270], [920, 338], [1000, 376]]; let i = 0; while (i < pts.length - 2 && xu > pts[i + 1][0]) i++; const a = pts[i], b = pts[i + 1], u = Math.max(0, Math.min(1, (xu - a[0]) / (b[0] - a[0]))), e = u * u * (3 - 2 * u); return lerp(a[1], b[1], e) + 11 * Math.sin(xu * .05) + 7 * Math.sin(xu * .13 + 1); };
    const GAP = { x: 560, y: -16, rx: 135, ry: 104 };
    const inGap = (xu, yu, m) => Math.pow((xu - GAP.x) / (GAP.rx + m), 2) + Math.pow((yu - GAP.y) / (GAP.ry + m), 2) < 1;
    const inZone = (xu, yu) => xu > 222 && xu < 778 && yu > 32 && yu < 262;
    const cr = rng(2468);
    // soft base mass (glow-blobs only through the middle so the title zone stays calm)
    for (let x = -20; x < 1030; x += 16) {
      const lb = Lb(x);
      for (let k = 0; k < 6; k++) { const yu = lb * (k / 5.2) - 6 + (cr() - .5) * 30, xu = x + (cr() - .5) * 30; blob(c, X(xu), Y(yu), X(52 + cr() * 52), Y(40 + cr() * 38), rgbOf(P.canopyBase).join(','), .62); }
    }
    // hard-edged leaves everywhere except the title zone
    const leafPass = (n, colors, minL, maxL, edgeBias, zoneSkip) => {
      const buckets = colors.map(() => []);
      for (let i = 0; i < n; i++) {
        const xu = cr() * 1060 - 30, lb = Lb(xu), y2 = lb - Math.pow(cr(), edgeBias) * (lb + 8) + 6;
        if (zoneSkip && inZone(xu, y2)) continue; if (inGap(xu, y2, 18)) continue;
        const ln = (minL + cr() * (maxL - minL)) * K, ang = cr() * 6.28;
        buckets[Math.floor(cr() * colors.length)].push([X(xu), Y(y2), ln, ln * (.3 + cr() * .14), ang]);
      }
      buckets.forEach((b, i) => { c.beginPath(); b.forEach(l => leafPath(c, l[0], l[1], l[2], l[3], l[4])); c.fillStyle = colors[i]; c.fill(); });
    };
    leafPass(520, P.deep, 18, 34, 1, true);
    leafPass(640, [P.deep[2], P.deep[3], P.gold[0], P.gold[0]], 16, 30, 1.3, true);
    leafPass(900, [P.gold[0], P.gold[1], P.gold[1], P.gold[2], P.deep[3]], 11, 21, 1.8, true);
    leafPass(780, [P.gold[1], P.gold[2], P.gold[3], P.silver[0]], 8, 17, 2.6, true);
    leafPass(380, [P.gold[3], P.silver[0], P.silver[1]], 6, 11, 3.4, true);
    // halos of leaf-light: soft gold-silver blooms in the leafy side masses
    for (let i = 0; i < 90; i++) { const xu = cr() * 1000, yu = Lb(xu) * (.25 + .75 * cr()) - 10; if (inZone(xu, yu) || inGap(xu, yu, 30)) continue; blob(c, X(xu), Y(yu), K * (22 + cr() * 38), K * (16 + cr() * 24), P.glow, dark ? .13 : .16); }
    // calm luminous canopy glow across the middle (the title zone)
    { c.save(); c.translate(X(500), Y(120)); c.scale(1, Math.max(.45, sy / sx)); const gl = c.createRadialGradient(0, 0, 0, 0, 0, X(400)); gl.addColorStop(0, dark ? 'rgba(214,186,104,.34)' : 'rgba(255,238,160,.55)'); gl.addColorStop(.6, dark ? 'rgba(180,164,96,.15)' : 'rgba(250,234,150,.24)'); gl.addColorStop(1, 'rgba(210,190,120,0)'); c.fillStyle = gl; c.fillRect(-X(400), -X(400), X(800), X(800)); c.restore(); }
    // punch the sky gap (soft edge), then ring it with leaves so the opening looks natural
    c.save(); c.globalCompositeOperation = 'destination-out';
    { c.translate(X(GAP.x), Y(GAP.y)); c.scale(1, Y(GAP.ry) / X(GAP.rx)); const hole = c.createRadialGradient(0, 0, 0, 0, 0, X(GAP.rx) * 1.08); hole.addColorStop(0, 'rgba(0,0,0,1)'); hole.addColorStop(.72, 'rgba(0,0,0,1)'); hole.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = hole; c.beginPath(); c.arc(0, 0, X(GAP.rx) * 1.08, 0, 6.2832); c.fill(); }
    c.restore();
    { const rim = [[], [], []], cols = [P.deep[3], P.gold[1], P.gold[3]];
      for (let i = 0; i < 110; i++) { const a = cr() * Math.PI, rr = .96 + cr() * .22, xu = GAP.x + Math.cos(a) * GAP.rx * rr, yu = GAP.y + Math.sin(a) * GAP.ry * rr; const ln = (8 + cr() * 9) * K; rim[i % 3].push([X(xu), Y(yu), ln, ln * .36, a + 1.57 + (cr() - .5)]); }
      rim.forEach((b, i) => { c.beginPath(); b.forEach(l => leafPath(c, l[0], l[1], l[2], l[3], l[4])); c.fillStyle = cols[i]; c.fill(); });
    }
    // ===================================== Layer: forest (mid trunks, glade, focal tree) =====================================
    c = layers[LAYER.forest].g;
    const hor = x => 474 + 7 * Math.sin(x * .011) + 4 * Math.sin(x * .031 + 2);
    // forest floor
    path(c, gradient(c, 0, Y(455), 0, H, P.ground), null, 0, p => { p.moveTo(-4, Y(hor(0))); for (let x = 0; x <= 1004; x += 20) p.lineTo(X(x), Y(hor(x))); p.lineTo(W + 4, H + 4); p.lineTo(-4, H + 4); p.closePath(); });
    c.fillStyle = gradient(c, 0, Y(456), 0, Y(560), [[0, rgba(P.haze, dark ? .75 : .8)], [1, rgba(P.haze, 0)]]); c.fillRect(0, Y(456), W, Y(104));
    // glade light: a wide lit clearing, lower-centre-right
    c.save(); c.translate(X(585), Y(630)); c.scale(1, .34 * sy / sx * 1.0);
    { const gr = c.createRadialGradient(0, 0, 0, 0, 0, X(430)); gr.addColorStop(0, 'rgba(' + P.gladeLit + ',' + P.gladeA + ')'); gr.addColorStop(.6, 'rgba(' + P.gladeLit + ',' + P.gladeA * .45 + ')'); gr.addColorStop(1, 'rgba(' + P.gladeLit + ',0)'); c.fillStyle = gr; c.fillRect(-X(430), -X(430), X(860), X(860)); }
    c.restore();
    // dark undergrowth masses at the glade sides
    { const ur = rng(3141);
      for (let i = 0; i < 46; i++) { const side = i % 2, xu = side ? 880 + ur() * 140 : -20 + ur() * 230, yu = 520 + ur() * 210; blob(c, X(xu), Y(yu), K * (40 + ur() * 60), K * (18 + ur() * 26), dark ? '6,22,20' : '48,84,36', dark ? .5 : .4); }
    }
    // pools of light where the shafts land
    for (const v of [[250, 590, 120], [470, 640, 150], [690, 610, 130], [900, 650, 110]]) blob(c, X(v[0]), Y(v[1]), K * v[2], K * v[2] * .22, P.gladeLit, dark ? .16 : .34);
    // mid-distance trunks, then the far side of the glade
    faded(layers[LAYER.forest], Y(130), Y(340), g => {
      trunk(g, { x: X(188), yb: Y(548), yt: Y(40), w0: Wd * 100, w1: Wd * 72, bend: Wd * 9, hi: 1, fog: .3, seed: 7, flare: .5 });
      trunk(g, { x: X(600), yb: Y(528), yt: Y(40), w0: Wd * 62, w1: Wd * 48, bend: Wd * 5, hi: -1, fog: .42, seed: 19, flare: .45 });
    });
    spiral(c, { x: X(188), yb: Y(538), yt: Y(396), R: Wd * 66, turns: 1.9, k: K * .9, tw: Wd * 44, fog: .3, ph: .6 });
    { const fk = K * .9, fx = X(188), fy = Y(380), h = flet(c, { x: fx, y: fy, rx: Wd * 108, k: fk, tw: Wd * 40, fog: .28 });
      const lx = fx + Wd * 104 * .96, ly = fy - 3 * fk - h - 12 * fk; c.strokeStyle = P.woodDk; c.lineWidth = Math.max(1, 1.6 * fk); c.beginPath(); c.moveTo(lx, fy - 3 * fk); c.lineTo(lx, ly); c.lineTo(lx - 5 * fk, ly); c.stroke(); lanternBody(c, lx - 5 * fk, ly, fk * 1.0); addLantern(lx - 5 * fk, ly + 15 * fk, 52 * K, 1, lr); }
    // focal mallorn: stout pale trunk with a spiral stair rising to a flet, glade side lit
    const FX = X(772), FB = Y(612), FW = Wd * 118, FTW = Wd * 56;
    faded(layers[LAYER.forest], Y(100), Y(260), g => trunk(g, { x: FX, yb: FB, yt: Y(50), w0: FW, w1: Wd * 86, bend: Wd * 8, hi: -1, fog: 0, seed: 101, flare: .6 }));
    spiral(c, { x: FX, yb: FB - Y(4), yt: Y(318), R: Wd * 74, turns: 2.3, k: K * 1.15, tw: FTW, ph: 2.6 });
    { const fk = K * 1.15, fy = Y(300), rx = Wd * 160, h = flet(c, { x: FX, y: fy, rx, k: fk, tw: FTW });
      // two lantern poles on the front rail and one hanging beneath the deck
      for (const a of [.32 * Math.PI, .72 * Math.PI]) { const px = FX + Math.cos(a) * rx * .98, py = fy - 3 * fk + Math.sin(a) * rx * .2 * .98, top = py - h - 20 * fk; c.strokeStyle = P.woodDk; c.lineWidth = Math.max(1, 1.8 * fk); c.beginPath(); c.moveTo(px, py - h); c.lineTo(px, top); c.stroke(); lanternBody(c, px, top, fk * 1.05); addLantern(px, top + 15 * fk, 66 * K, 1, lr); }
      const hx = FX + Wd * 18, hy = fy + rx * .2 + 40 * fk; c.strokeStyle = P.woodDk; c.lineWidth = Math.max(.8, 1 * fk); c.beginPath(); c.moveTo(hx, fy + rx * .2 * .97); c.lineTo(hx, hy); c.stroke(); lanternBody(c, hx, hy, fk * .9); addLantern(hx, hy + 14 * fk, 48 * K, 1, lr); }
    // ground path: a ribbon of worn earth with pale stones, winding from the foreground to the focal tree
    const pc = t => [790 - 330 * Math.pow(t, 1.18) - 46 * Math.sin(t * 5.2) * (1 - t * .3) + 16 * Math.sin(t * 2), 606 + 134 * t];
    const pw = t => 8 + 52 * t;
    path(c, P.soil, null, 0, p => { for (let i = 0; i <= 40; i++) { const t = i / 40, q = pc(t); i ? p.lineTo(X(q[0] - pw(t) * 1.15), Y(q[1])) : p.moveTo(X(q[0] - pw(t) * 1.15), Y(q[1])); } for (let i = 40; i >= 0; i--) { const t = i / 40, q = pc(t); p.lineTo(X(q[0] + pw(t) * 1.15), Y(q[1])); } p.closePath(); });
    { const sr = rng(2937), list = [];
      for (let i = 0; i < 54; i++) { const t = Math.pow(i / 53, 1.05) * .98 + .01, q = pc(t), w = pw(t), off = (sr() - .5) * w * 1.5; list.push([q[0] + off, q[1] + (sr() - .5) * 5, t, i]); }
      list.sort((a, b) => a[1] - b[1]).forEach(s => {
        const t = s[2], rx = (5 + 11 * t) * K * (.85 + .3 * ((s[3] * 7) % 5) / 5), ry = rx * .46, x = X(s[0]), y = Y(s[1]), pick = P.stone[s[3] % 3];
        path(c, pick, P.stoneEdge, Math.max(.6, .8 * K), p => { p.ellipse(x, y, rx, ry, (sr() - .5) * .3, 0, 6.2832); });
        path(c, dark ? 'rgba(235,246,240,.35)' : 'rgba(255,255,240,.55)', null, 0, p => { p.ellipse(x - rx * .1, y - ry * .3, rx * .65, ry * .42, 0, 0, 6.2832); });
      });
    }
    // elanor carpet: tiny golden star-flowers, densest in the glade
    { const er = rng(777), fl = [[], []]; let n = 0, guard = 0;
      while (n < 1250 && guard++ < 30000) {
        const xu = er() * 1000, yu = 480 + Math.pow(er(), .82) * 250;
        const dens = (Math.exp(-(Math.pow((xu - 585) / 300, 2) + Math.pow((yu - 650) / 150, 2))) + .08) * (.35 + .65 * Math.pow(.5 + .5 * Math.sin(xu * .021 + Math.sin(yu * .03) * 2) * Math.sin(yu * .047 + xu * .008), 1.2));
        if (er() > dens) continue;
        let near = false; for (let i = 0; i <= 20; i++) { const t = i / 20, q = pc(t); if (Math.abs(q[1] - yu) < 8 && Math.abs(q[0] - xu) < pw(t) * 1.05) { near = true; break; } }
        if (near || (Math.abs(xu - 790) < 60 && yu < 620)) continue;
        const f = (yu - 470) / 260; fl[n % 2].push([X(xu), Y(yu), (.8 + 2.2 * f) * Math.max(K, .62) * (.7 + er() * .6), er() * 1.57]); n++;
      }
      // blades
      c.lineCap = 'round'; const bl = [[], [], []]; for (let i = 0; i < 520; i++) { const xu = er() * 1000, yu = 490 + er() * 240, f = (yu - 470) / 260, h = (3 + er() * 7) * (.4 + f) * K * 1.4; bl[i % 3].push([X(xu), Y(yu), h, (er() - .5) * h * .5]); }
      bl.forEach((b, i) => { c.beginPath(); b.forEach(q => { c.moveTo(q[0], q[1]); c.quadraticCurveTo(q[0] + q[3] * .3, q[1] - q[2] * .6, q[0] + q[3], q[1] - q[2]); }); c.strokeStyle = P.blade[i]; c.lineWidth = Math.max(.7, 1.1 * K); c.stroke(); });
      // halos for the larger blooms
      if (dark) { for (let i = 0; i < fl[0].length; i += 5) { const q = fl[0][i]; if (q[2] > 2.6) blob(c, q[0], q[1], q[2] * 3.4, q[2] * 2, '255,222,130', .22); } }
      fl.forEach((b, i) => {
        c.beginPath(); b.forEach(q => { const r = q[2]; if (r < 1.5) { c.rect(q[0] - r, q[1] - r * .8, r * 2, r * 1.6); return; } for (let k = 0; k < 5; k++) { const a = q[3] + k * 1.2566; c.moveTo(q[0] + Math.cos(a) * r * .55 + r * .5, q[1] + Math.sin(a) * r * .38); c.ellipse(q[0] + Math.cos(a) * r * .55, q[1] + Math.sin(a) * r * .38, r * .5, r * .32, a, 0, 6.2832); } });
        c.fillStyle = P.flower[i]; c.fill();
        c.beginPath(); b.forEach(q => { if (q[2] >= 1.5) { c.moveTo(q[0] + q[2] * .22, q[1]); c.arc(q[0], q[1], q[2] * .22, 0, 6.2832); } }); c.fillStyle = P.flowerCore; c.fill();
      });
    }
    // ===================================== Layers: god-rays (half resolution, shimmered in draw) =====================================
    rays = [];
    [[LAYER.rayA, [[130, 24, 74, .31], [420, 18, 52, .27], [690, 28, 80, .30]]], [LAYER.rayB, [[270, 20, 62, .28], [555, 24, 66, .24], [870, 22, 70, .32]]], [LAYER.rayC, [[40, 20, 56, .30], [340, 16, 44, .25], [770, 18, 58, .27]]]].forEach((grp, gi) => {
      const g = layers[grp[0]].g;
      grp[1].forEach(rv => {
        const y0 = 70, y1 = 640, x0 = rv[0], sl = rv[3];
        for (let n = 0; n < 5; n++) {
          const f = [1, .78, .56, .36, .18][n], w0 = rv[1] * f * Wd, w1 = rv[2] * f * Wd, xa = X(x0) , xb = X(x0 + sl * (y1 - y0));
          const gr = g.createLinearGradient(xa, Y(y0), xb, Y(y1));
          gr.addColorStop(0, 'rgba(' + P.ray + ',0)'); gr.addColorStop(.3, 'rgba(' + P.ray + ',' + P.rayPeak * .12 + ')'); gr.addColorStop(.52, 'rgba(' + P.ray + ',' + P.rayPeak * .3 + ')'); gr.addColorStop(.8, 'rgba(' + P.ray + ',' + P.rayPeak * .24 + ')'); gr.addColorStop(1, 'rgba(' + P.ray + ',0)');
          g.fillStyle = gr; g.beginPath(); g.moveTo(xa - w0 / 2, Y(y0)); g.lineTo(xa + w0 / 2, Y(y0)); g.lineTo(xb + w1 / 2, Y(y1)); g.lineTo(xb - w1 / 2, Y(y1)); g.closePath(); g.fill();
        }
      });
      rays.push({ layer: grp[0], w: .045 + gi * .012, ph: gi * 2.1 + .4, drift: 5 + gi * 3 });
    });
    // ===================================== Layer: edge (colossal side trunks, ferns, vignette) =====================================
    c = layers[LAYER.edge].g;
    faded(layers[LAYER.edge], Y(30), Y(210), g => {
      trunk(g, { x: X(26), yb: Y(790), yt: Y(-20), w0: Wd * 210, w1: Wd * 146, bend: Wd * 14, hi: 1, fog: 0, seed: 3, flare: .45 });
      trunk(g, { x: X(988), yb: Y(780), yt: Y(-20), w0: Wd * 178, w1: Wd * 126, bend: Wd * 12, hi: -1, fog: 0, seed: 15, flare: .45 });
    });
    // bracket lanterns on the side trunks
    { const k = K * 1.05;
      const bl = X(26) + Wd * 118, by = Y(300); c.strokeStyle = P.woodDk; c.lineWidth = Math.max(1.2, 2.2 * k); c.beginPath(); c.moveTo(bl - Wd * 40, by + 4 * k); c.quadraticCurveTo(bl - Wd * 10, by - 4 * k, bl + Wd * 24, by - 2 * k); c.stroke(); lanternBody(c, bl + Wd * 24, by - 2 * k, k); addLantern(bl + Wd * 24, by + 13 * k, 60 * K, 2, lr);
      const br = X(988) - Wd * 108, bry = Y(246); c.beginPath(); c.moveTo(br + Wd * 40, bry + 4 * k); c.quadraticCurveTo(br + Wd * 10, bry - 4 * k, br - Wd * 22, bry - 2 * k); c.stroke(); lanternBody(c, br - Wd * 22, bry - 2 * k, k); addLantern(br - Wd * 22, bry + 13 * k, 56 * K, 2, lr); }
    // ferns in the lower corners
    { const fr = rng(909);
      const fern = (x, y, s, dir) => {
        const bk = [[], []];
        for (let f = 0; f < 10; f++) {
          const a = -Math.PI / 2 + dir * (f - 4.5) * .24 + (fr() - .5) * .12, len = (70 + fr() * 70) * s, ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len * .95, cx1 = x + Math.cos(a) * len * .45 + dir * len * .12, cy1 = y + Math.sin(a) * len * .8;
          c.strokeStyle = P.fern[f % 2]; c.lineWidth = Math.max(1, 1.5 * s); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(cx1, cy1, ex, ey); c.stroke();
          for (let q = 1; q < 14; q++) {
            const u = q / 14, m = 1 - u, px = m * m * x + 2 * m * u * cx1 + u * u * ex, py = m * m * y + 2 * m * u * cy1 + u * u * ey, tx = 2 * m * (cx1 - x) + 2 * u * (ex - cx1), ty = 2 * m * (cy1 - y) + 2 * u * (ey - cy1), ta = Math.atan2(ty, tx), l = (1 - u * .8) * 30 * s;
            bk[(f + q) % 2].push([px, py, l, l * .3, ta - 1.0], [px, py, l, l * .3, ta + 1.0]);
          }
        }
        bk.forEach((b, i) => { c.beginPath(); b.forEach(l => leafPath(c, l[0] + Math.cos(l[4]) * l[2] * .5, l[1] + Math.sin(l[4]) * l[2] * .5, l[2], l[3], l[4])); c.fillStyle = P.fern[i]; c.fill(); });
      };
      fern(X(150), H + 8, K * 1.1, 1); fern(X(60), H + 14, K * .95, -1); fern(X(870), H + 10, K * 1.05, -1); fern(X(965), H + 14, K * .9, 1);
    }
    // vignette: darker corners keep the centre luminous
    { const v = c.createRadialGradient(W * .55, H * .5, Math.min(W, H) * .25, W * .55, H * .5, Math.max(W, H) * .78); v.addColorStop(0, P.vign + '0)'); v.addColorStop(.7, P.vign + (dark ? '.14' : '.06') + ')'); v.addColorStop(1, P.vign + (dark ? '.55' : '.26') + ')'); c.fillStyle = v; c.fillRect(0, 0, W, H); }
    // ===================================== Overlay data & sprites =====================================
    spr.core = radialSprite(96, dark ? '240,248,244' : '255,252,236', [[0, .95], [.16, .6], [.5, .13], [1, 0]]);
    spr.halo = radialSprite(128, dark ? '255,228,150' : '255,226,140', [[0, .55], [.4, .2], [1, 0]]);
    spr.mote = radialSprite(32, dark ? '255,238,176' : '255,232,150', [[0, 1], [.25, .55], [1, 0]]);
    // leaf sprites for the falling leaves (three tints, each with a midrib)
    const tints = dark ? [['#b99a49', '#d9c577'], ['#cdb868', '#efe3b0'], ['#a9b6aa', '#dfe6d6']] : [['#d2a63a', '#f0cd68'], ['#e3c35e', '#f8e8a0'], ['#8fae4c', '#cfe08a']];
    spr.leaf = tints.map(t => sprite(24, 12, 2, g => { path(g, gradient(g, 0, 0, 0, 12, [[0, t[1]], [1, t[0]]]), null, 0, p => leafPath(p, 12, 6, 23, 9.5, 0)); g.strokeStyle = rgba(t[0], .9); g.lineWidth = .7; g.beginPath(); g.moveTo(2, 6); g.lineTo(21, 6); g.stroke(); }));
    // swaying leaf clusters (four variants) hung from the canopy
    clusterSprites = [0, 1, 2, 3].map(v => { const w = 92 * K, h = 120 * K, rr = rng(60 + v * 11);
      return sprite(w, h, dpr, g => {
        blob(g, w / 2, h * .45, w * .46, h * .34, P.glow, dark ? .11 : .15);
        g.strokeStyle = dark ? '#2a3a2a' : '#6a5a30'; g.lineWidth = Math.max(1, 1.4 * K); g.beginPath(); g.moveTo(w / 2, 0); g.quadraticCurveTo(w / 2 + (rr() - .5) * w * .3, h * .3, w / 2 + (rr() - .5) * w * .2, h * .5); g.stroke();
        const cols = dark ? [P.deep[3], P.gold[0], P.gold[1], P.gold[2], P.gold[3], P.silver[0]] : [P.deep[2], P.gold[0], P.gold[1], P.gold[2], P.gold[3], P.silver[0]], b = cols.map(() => []);
        for (let i = 0; i < 34; i++) { const u = Math.pow(rr(), .8), cx = w / 2 + (rr() - .5) * w * .8 * (.35 + u), cy = 5 + u * h * .82, ln = (11 + rr() * 11) * K; b[Math.floor(rr() * cols.length)].push([cx, cy, ln, ln * .38, 1.57 + (cx - w / 2) / w * 1.8 + (rr() - .5) * .9]); }
        b.forEach((arr, i) => { g.beginPath(); arr.forEach(l => leafPath(g, l[0], l[1], l[2], l[3], l[4])); g.fillStyle = cols[i]; g.fill(); });
      }); });
    clusters = []; { const kr = rng(1357);
      for (let i = 0; i < 26; i++) {
        let xu, yu, guard = 0; do { xu = kr() * 1000; yu = Lb(xu) - 78 - kr() * 56; } while ((inZone(xu, yu + 40) || inGap(xu, yu, 40) || yu < 5) && guard++ < 30);
        if (guard >= 30) continue;
        clusters.push({ x: X(xu), y: Y(yu), s: .75 + kr() * .5, v: i % 4, a0: (kr() - .5) * .04, ph: kr() * 6.28, ph2: kr() * 6.28, w: .35 + kr() * .35 });
      }
    }
    // mist: three soft silver bands over the glade
    { const mw = W * 1.0, mh = Math.max(50, 120 * K), mk = seed => { const rr = rng(seed); return sprite(mw, mh, 1, g => { for (let i = 0; i < 14; i++) blob(g, mw * (.06 + .88 * rr()), mh * (.5 + .16 * (rr() - .5)), mw * (.08 + .10 * rr()), mh * (.16 + .22 * rr()), P.mist, .6); }); };
      const a = mk(31), b = mk(97);
      mists = [{ sp: a, y: 622, v: .0060, x0: .1, a: 1 }, { sp: b, y: 570, v: -.0042, x0: .62, a: .8 }, { sp: a, y: 664, v: .0088, x0: .85, a: .85 }, { sp: b, y: 520, v: .0036, x0: .3, a: .5 }];
    }
    // stars within the canopy gap (night only)
    stars = []; if (dark) { const sr = rng(16321); for (let i = 0; i < 46; i++) { const a = sr() * 6.28, rr = Math.sqrt(sr()), xu = GAP.x + Math.cos(a) * GAP.rx * 1.05 * rr, yu = Math.max(3, GAP.y + Math.abs(Math.sin(a)) * GAP.ry * rr * .92), big = sr() < .1, inz = yu > 43; stars.push({ x: X(xu), y: Y(yu), r: (big ? 1.0 : .45 + sr() * .5) * Math.max(.75, S), b: (big ? .8 : .3 + sr() * .45) * (inz ? .55 : 1), sp: .5 + sr() * 1.5, ph: sr() * 6.28, big }); } }
    // falling leaves (30) and rising motes (35)
    leaves = []; { const lv = rng(4141); for (let i = 0; i < 30; i++) leaves.push({ x0: lv() * W, v: .014 + lv() * .016, c0: lv(), sw: (14 + lv() * 34) * K, sf: .25 + lv() * .35, p1: lv() * 6.28, rs: .5 + lv() * 1.1, p2: lv() * 6.28, ts: .9 + lv() * 1.2, p3: lv() * 6.28, sz: (7 + lv() * 6) * K, t: i % 3 }); }
    motes = []; { const mr = rng(5252); for (let i = 0; i < 35; i++) motes.push({ x0: mr() * W, v: .012 + mr() * .016, c0: mr(), w1: .2 + mr() * .35, a1: (10 + mr() * 26) * K, p1: mr() * 6.28, p2: mr() * 6.28, sz: (5 + mr() * 6) * K, tw: .35 + mr() * .6, tp: mr() * 6.28 }); }
    staticBuilds++;
  }
  function draw(timeSeconds) {
    if (destroyed || !width || !height) return;
    const t = Number.isFinite(timeSeconds) ? timeSeconds : (fixed === null ? elapsed : fixed);
    const dark = options.dark !== false, W = width, H = height, S = sc;
    const blit = i => { const l = layers[i]; ctx.setTransform(1, 0, 0, 1, 0, 0); if (l.res === 1) ctx.drawImage(l.cv, 0, l.topPx); else ctx.drawImage(l.cv, 0, l.topPx, Math.round(W * dpr), l.cv.height / l.res); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    const zoneOf = (x, y) => { const cx = x / W, cy = y / H; return ss(.20, .27, cx) * (1 - ss(.73, .80, cx)) * ss(.03, .08, cy) * (1 - ss(.32, .38, cy)); };
    const pulse = l => .8 + .12 * Math.sin(t * l.w + l.ph) + .06 * Math.sin(t * l.w * 2.1 + l.ph2);
    const glows = stage => {
      for (let i = 0; i < lanterns.length; i++) {
        const l = lanterns[i]; if (l.stage !== stage) continue; const p = pulse(l), a = dark ? 1 : .55, R = l.r;
        ctx.globalAlpha = Math.min(1, .55 * p * a); ctx.drawImage(spr.halo.cv, l.x - R * 2.2, l.y - R * 2.2, R * 4.4, R * 4.4);
        ctx.globalAlpha = Math.min(1, .8 * p * a); ctx.drawImage(spr.core.cv, l.x - R * .8, l.y - R * .8, R * 1.6, R * 1.6);
      }
      ctx.globalAlpha = 1;
    };
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    blit(LAYER.sky);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // twinkling stars through the canopy gap (slow, low amplitude)
    if (dark && stars.length) {
      ctx.fillStyle = '#f4ecd8';
      for (let i = 0; i < stars.length; i++) { const q = stars[i], tw = .5 + .5 * Math.sin(t * q.sp + q.ph), a = q.b * (.55 + .45 * tw); ctx.globalAlpha = a; ctx.fillRect(q.x - q.r, q.y - q.r, q.r * 2, q.r * 2); if (q.big) { ctx.globalAlpha = a * .35; ctx.fillRect(q.x - q.r * 3.5, q.y - .35, q.r * 7, .7); ctx.fillRect(q.x - .35, q.y - q.r * 3.5, .7, q.r * 7); } }
      ctx.globalAlpha = 1;
    }
    glows(0);
    blit(LAYER.canopy);
    blit(LAYER.forest);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // low silver mist across the glade
    for (let i = 0; i < mists.length; i++) {
      const m = mists[i], sw = m.sp.w, span = W + sw, x = ((m.x0 * span + t * m.v * W) % span + span) % span - sw, y = m.y * H / 720;
      ctx.globalAlpha = (dark ? .42 : .24) * m.a * (.78 + .22 * Math.sin(t * .13 + i * 2)); ctx.drawImage(m.sp.cv, x, y - m.sp.h / 2, sw, m.sp.h);
    }
    ctx.globalAlpha = 1;
    // god-rays: three cached groups, each breathing slowly and drifting a few pixels
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < rays.length; i++) {
      const r = rays[i], a = (dark ? .8 : 1) * (1 + (dark ? .16 : .24) * Math.sin(t * r.w * 3 + r.ph) + .08 * Math.sin(t * r.w * 5.3 + r.ph * 2)), dx = Math.sin(t * .045 + r.ph) * r.drift;
      ctx.globalAlpha = Math.max(0, Math.min(1, a)); const l = layers[r.layer]; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(l.cv, Math.round(dx * dpr), l.topPx, Math.round(W * dpr), l.cv.height / l.res);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    glows(1);
    // swaying leaf clusters (a degree or two of motion)
    for (let i = 0; i < clusters.length; i++) {
      const q = clusters[i], sp = clusterSprites[q.v], ang = q.a0 + .022 * Math.sin(t * q.w + q.ph) + .01 * Math.sin(t * q.w * 2.3 + q.ph2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.translate(q.x, q.y); ctx.rotate(ang); ctx.scale(q.s, q.s); ctx.drawImage(sp.cv, -sp.w / 2, 0, sp.w, sp.h);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // motes of light rise and wander
    if (dark) ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < motes.length; i++) {
      const m = motes[i], u = ((m.c0 + t * m.v) % 1 + 1) % 1, y = H * (1.0 - u * 1.0) , x = m.x0 + Math.sin(t * m.w1 + m.p1) * m.a1 + Math.sin(t * m.w1 * 2.3 + m.p2) * m.a1 * .35;
      const env = Math.pow(Math.sin(Math.PI * u), .7), z = zoneOf(x, y), a = env * (.55 + .3 * Math.sin(t * m.tw + m.tp)) * (1 - .8 * z) * (dark ? .85 : .75);
      if (a < .01) continue; ctx.globalAlpha = a; ctx.drawImage(spr.mote.cv, x - m.sz, y - m.sz, m.sz * 2, m.sz * 2);
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    blit(LAYER.edge);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    glows(2);
    // falling golden leaves tumbling slowly
    for (let i = 0; i < leaves.length; i++) {
      const l = leaves[i], u = ((l.c0 + t * l.v) % 1 + 1) % 1, y = -20 + (H + 40) * u, x = l.x0 + Math.sin(t * l.sf + l.p1) * l.sw + Math.sin(t * l.sf * 2.1 + l.p2) * l.sw * .3;
      const ang = Math.sin(t * l.rs + l.p2) * .9 + Math.sin(t * l.rs * .5 + l.p1) * .8 + .5, flip = Math.cos(t * l.ts + l.p3), z = zoneOf(x, y), a = Math.min(1, ss(0, .06, u) * (1 - ss(.9, 1, u))) * (1 - .55 * z) * (dark ? .92 : .95);
      if (a < .01) continue; const sp = spr.leaf[l.t], sz = l.sz, sy = sz * (.18 + .82 * Math.abs(flip)) * .5, ca = Math.cos(ang), sa = Math.sin(ang);
      ctx.globalAlpha = a; ctx.setTransform(dpr * ca * sz / 24, dpr * sa * sz / 24, -dpr * sa * sy / 6, dpr * ca * sy / 6, dpr * x, dpr * y);
      ctx.drawImage(sp.cv, -12, -6, 24, 12);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = 1;
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
    width = n.w; height = n.h; dpr = ratio; canvas.width = Math.max(1, Math.round(width * dpr)); canvas.height = Math.max(1, Math.round(height * dpr));
    lanterns = []; buildLandscape(); draw();
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
    sprites = []; spr = {}; stars = []; lanterns = []; clusters = []; clusterSprites = []; leaves = []; motes = []; mists = []; rays = [];
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
