/* Original Canvas2D RIVENDELL: a hidden Elven valley, stylised as a restrained storybook illustration.
   Five cached static layers + animated overlays. No imports, storage, network, audio, remote images,
   and NO pointer / mouse / touch handling of any kind (all motion is autonomous). */
function createRivendellScene(canvas, options = {}) {
  if (!canvas || typeof canvas.getContext !== 'function') throw new TypeError('A canvas element is required.');
  options = options && typeof options === 'object' ? options : {};
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas2D is unavailable.');
  const doc = canvas.ownerDocument || document;
  const win = doc.defaultView || window;
  // [name, top fraction, bottom fraction]
  const DEFS = [['sky', 0, .66], ['far', .22, 1], ['cliffs', 0, 1], ['arch', .26, 1], ['frame', 0, 1]];
  const layers = DEFS.map(d => {
    const cv = doc.createElement('canvas');
    const g = cv.getContext('2d');
    if (!g) throw new Error('Cached Canvas2D is unavailable.');
    return { name: d[0], y0: d[1], y1: d[2], cv, g, top: 0, topPx: 0 };
  });
  const media = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let width = 0, height = 0, dpr = 1, destroyed = false, raf = 0;
  let frames = 0, staticBuilds = 0, lastFrame = -Infinity, elapsed = 0, lastTick = null;
  let motion = options.motion !== false && !(media && media.matches);
  const fixed = Number.isFinite(options.fixedTime) ? options.fixedTime : null;
  const maxFPS = Math.min(24, Math.max(1, Number(options.fps) || 24));
  let sc = 1, dk = true;
  // Scene objects built together with the cached layers.
  let lights = [], canopies = [], leaves = [], mists = [], backMists = [], clouds = [], birds = [], stars = [];
  let fall = null, river = null, pool = null, spr = {}, sprites = [];
  const K = (d, l) => dk ? d : l;
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function ss(a, b, x) { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); }
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
  // Midpoint-displaced polyline through control points (deterministic via the supplied rng).
  function ridge(rand, pts, rough, depth) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      let cur = [pts[i - 1], pts[i]], amp = rough * Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      for (let d = 0; d < depth; d++) {
        const nx = [cur[0]];
        for (let k = 1; k < cur.length; k++) {
          const p = cur[k - 1], q = cur[k], dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy) || 1, o = (rand() - .5) * amp;
          nx.push([(p[0] + q[0]) / 2 - dy / len * o, (p[1] + q[1]) / 2 + dx / len * o]); nx.push(q);
        }
        cur = nx; amp *= .55;
      }
      for (let k = 1; k < cur.length; k++) out.push(cur[k]);
    }
    return out;
  }
  function poly(g, pts) { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); }
  function yAt(pts, x) { let best = pts[0][1]; for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], q = pts[i]; if ((p[0] - x) * (q[0] - x) <= 0 && p[0] !== q[0]) { best = p[1] + (q[1] - p[1]) * (x - p[0]) / (q[0] - p[0]); break; } } return best; }
  function xAtY(pts, y) { let best = -Infinity; for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], q = pts[i]; if ((p[1] - y) * (q[1] - y) <= 0 && p[1] !== q[1]) best = Math.max(best, p[0] + (q[0] - p[0]) * (y - p[1]) / (q[1] - p[1])); } return best; }
  // Autumn shrub clump.
  function tuft(g, x, y, s, r) {
    const cols = K(['#c58a2e', '#a85a2a', '#d6a63e', '#8a4a2c'], ['#e6ac30', '#c8662a', '#dca03a', '#a84e2c']), n = 3 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) ellipse(g, x + (r() - .5) * 16 * s, y - r() * 7 * s, (3 + r() * 4) * s, (2.4 + r() * 2.6) * s, cols[Math.floor(r() * cols.length)]);
  }
  // Layered rock: gradient body, strata, weathering streaks. poly is closed polygon, bb its bounding box.
  function rockMass(g, pg, bb, stops, vert, seed, strataStep, rimStroke, rimPts, rimW) {
    const r = rng(seed), F = sc;
    g.save(); g.beginPath(); poly(g, pg); g.fillStyle = gradient(g, bb[0], 0, bb[2], 0, stops); g.fill(); g.clip();
    g.fillStyle = gradient(g, 0, bb[1], 0, bb[3], vert); g.fillRect(bb[0] - 4, bb[1] - 4, bb[2] - bb[0] + 8, bb[3] - bb[1] + 8);
    const dkc = K('rgba(8,8,30,.17)', 'rgba(50,25,20,.14)'), ltc = K('rgba(255,190,140,.10)', 'rgba(255,238,190,.2)');
    for (let y = bb[1]; y < bb[3]; y += strataStep * (.5 + r() * 1.1)) {
      const x0 = bb[0] + r() * (bb[2] - bb[0]) * .85, len = (30 + r() * 170) * F, tilt = (r() - .5) * 8 * F, th = (1 + r() * 2) * F;
      g.fillStyle = gradient(g, x0, 0, x0 + len, 0, [[0, 'rgba(0,0,0,0)'], [.3, dkc], [.8, dkc], [1, 'rgba(0,0,0,0)']]); g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + len, y + tilt); g.lineTo(x0 + len * .9, y + tilt + th); g.lineTo(x0 + len * .12, y + th); g.closePath(); g.fill();
      g.strokeStyle = ltc; g.lineWidth = (.7 + r() * .9) * F; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + len, y + tilt); g.stroke();
    }
    for (let i = 0, n = Math.round((bb[2] - bb[0]) * (bb[3] - bb[1]) / (9000 * F * F)); i < n; i++) {
      let x = bb[0] + r() * (bb[2] - bb[0]), y = bb[1] + r() * (bb[3] - bb[1]); const len = (16 + r() * 80) * F;
      g.strokeStyle = r() < .6 ? dkc : ltc; g.lineWidth = (.8 + r() * 1.4) * F; g.beginPath(); g.moveTo(x, y);
      for (let k = 1; k <= 3; k++) { x += (r() - .5) * 5 * F; y += len / 3; g.lineTo(x, y); } g.stroke();
    }
    g.restore();
    if (rimPts) { g.beginPath(); g.moveTo(rimPts[0][0], rimPts[0][1]); for (let i = 1; i < rimPts.length; i++) g.lineTo(rimPts[i][0], rimPts[i][1]); g.strokeStyle = rimStroke; g.lineWidth = rimW; g.lineJoin = 'round'; g.stroke(); }
  }
  // Wavy trunk with two forks (hf stretches it taller); returns the point where the canopy attaches.
  function trunk(g, x, y, s, col, hf) {
    hf = hf || 1; const hh = s * hf;
    path(g, null, col, 5.2 * s, p => { p.moveTo(x, y); p.bezierCurveTo(x + 3 * s, y - 16 * hh, x - 4 * s, y - 28 * hh, x + 2 * s, y - 46 * hh); });
    path(g, null, col, 3 * s, p => { p.moveTo(x, y - 22 * hh); p.lineTo(x - 17 * s, y - 40 * hh); p.moveTo(x + 1 * s, y - 30 * hh); p.lineTo(x + 19 * s, y - 46 * hh); });
    path(g, null, K('rgba(255,170,100,.25)', 'rgba(255,225,150,.35)'), 1 * s, p => { p.moveTo(x - 1.2 * s, y - 2 * hh); p.bezierCurveTo(x + 1 * s, y - 16 * hh, x - 6 * s, y - 28 * hh, x, y - 44 * hh); });
    return [x, y - 40 * hh];
  }
  // Autumn canopy sprite built from many small leaf clumps: dark underside, warm lit crown, soft flecks.
  function canopySprite(s, seed, scale) {
    const r = rng(seed), w = 108 * s, h = 84 * s, ox = w * .5, oy = h * .80;
    const pal = K(['#c98b2c', '#b5602a', '#d6a43c', '#94482b', '#aa7a30'], ['#e4a82c', '#cc6a28', '#e8b43e', '#a64a2a', '#d08a2e']);
    const lobes = [];
    for (let i = 0; i < 26; i++) {
      const a = Math.PI * (1.0 + 1.0 * r()), q = Math.pow(r(), .6), lx = ox + Math.cos(a) * w * .36 * q, ly = oy - h * .26 + Math.sin(a) * h * .40 * q + h * .04 * r();
      const hgt = 1 - Math.max(0, Math.min(1, (ly / h)));
      lobes.push({ x: lx, y: ly, rx: w * (.085 + .06 * r()), ry: w * (.07 + .05 * r()), c: pal[Math.floor(r() * pal.length)], t: hgt });
    }
    lobes.sort((p, q) => q.y - p.y);
    return sprite(w, h, Math.max(1, dpr) * scale, g => {
      lobes.forEach(l => ellipse(g, l.x + l.rx * .1, l.y + l.ry * .45, l.rx * 1.05, l.ry * .95, K('#2d2040', '#6d3a24')));
      lobes.forEach(l => { ellipse(g, l.x, l.y, l.rx, l.ry, l.c); ellipse(g, l.x, l.y + l.ry * .25, l.rx * .95, l.ry * .62, K('rgba(40,22,56,' + (.30 - .2 * l.t) + ')', 'rgba(120,56,30,' + (.22 - .14 * l.t) + ')')); });
      lobes.forEach(l => ellipse(g, l.x - l.rx * .25, l.y - l.ry * .35, l.rx * .58, l.ry * .42, K('rgba(255,216,126,' + (.18 + .30 * l.t) + ')', 'rgba(255,238,150,' + (.22 + .3 * l.t) + ')')));
      for (let i = 0; i < 22; i++) { const l = lobes[Math.floor(r() * lobes.length)]; ellipse(g, l.x + (r() - .5) * l.rx, l.y + (r() - .5) * l.ry, (.9 + r() * 1.1) * s, (.7 + r() * .8) * s, i % 4 ? K('rgba(255,214,120,.5)', 'rgba(255,240,150,.55)') : K('rgba(110,40,36,.4)', 'rgba(150,60,30,.35)')); }
    });
  }
  function buildLandscape() {
    const W = width, H = height, dark = options.dark !== false;
    dk = dark;
    const F = Math.min(H / 720, W / 700), kx = Math.min(1, .45 + W / H * .6);
    sc = F;
    const X = n => n * W / 1000, Y = n => n * H / 720, LX = n => X(n * kx);
    const AY0 = Y(520), archLeft = Math.min(W * .56, W * .9 - 370 * F), AX = archLeft + 100 * F;
    const Lc = (x, y) => [AX + x * F, AY0 + y * F];
    layers.forEach(l => {
      l.top = Math.floor(H * l.y0); l.topPx = Math.round(l.top * dpr);
      l.cv.width = canvas.width; l.cv.height = Math.max(1, Math.round(Math.ceil(H * l.y1) * dpr) - l.topPx);
      l.g.setTransform(dpr, 0, 0, dpr, 0, -l.topPx);
    });
    sprites.forEach(s => { s.cv.width = 1; s.cv.height = 1; }); sprites = []; spr = {};
    lights = []; canopies = [];
    const S0 = rng(16321);
    const sunX = X(470), sunY = Y(352);
    // ---------- Layer 0: sky ----------
    let c = layers[0].g;
    c.fillStyle = gradient(c, 0, 0, 0, H, K([[0, '#111835'], [.16, '#1b2350'], [.30, '#2f2f60'], [.40, '#654e7e'], [.47, '#b27270'], [.54, '#e0a169'], [1, '#e8b070']], [[0, '#8fb3be'], [.18, '#b4cbc2'], [.32, '#efdba8'], [.44, '#f9d390'], [.54, '#f8c678'], [1, '#f6c070']]));
    c.fillRect(0, 0, W, H);
    c.save(); c.translate(sunX, sunY); c.scale(1, .62);
    const sg = c.createRadialGradient(0, 0, 0, 0, 0, X(560)); sg.addColorStop(0, K('rgba(255,178,104,.40)', 'rgba(255,236,170,.70)')); sg.addColorStop(.45, K('rgba(240,150,100,.14)', 'rgba(255,224,150,.26)')); sg.addColorStop(1, 'rgba(240,150,100,0)');
    c.fillStyle = sg; c.fillRect(-X(560), -X(560), X(1120), X(1120)); c.restore();
    if (!dark) { const sr = 24 * F, sy = Y(336); ellipse(c, sunX, sy, sr * 3.2, sr * 3.2, 'rgba(255,244,200,.30)'); ellipse(c, sunX, sy, sr * 1.8, sr * 1.8, 'rgba(255,246,208,.55)'); ellipse(c, sunX, sy, sr, sr, '#fff6d2'); }
    // ---------- Layer 1: far peaks, hazy ridge, tiny distant spires ----------
    c = layers[1].g;
    const rf = rng(77);
    const peaksA = ridge(rf, [[-40, 150], [60, 118], [140, 196], [210, 168], [300, 252], [370, 290], [440, 322], [500, 332], [560, 324], [620, 298], [690, 268], [760, 214], [830, 158], [900, 128], [1040, 96]].map(p => [X(p[0]), Y(p[1])]), .10, 4);
    path(c, gradient(c, 0, Y(110), 0, Y(440), K([[0, '#a77090'], [.5, '#7c618c'], [1, '#645a86']], [[0, '#e0b8a0'], [.5, '#d4b49c'], [1, '#c8aa92']])), null, 0, p => { poly(p, peaksA.concat([[W + 40, H + 40], [-40, H + 40]])); });
    c.fillStyle = gradient(c, 0, Y(280), 0, Y(470), [[0, K('rgba(214,150,130,0)', 'rgba(255,230,170,0)')], [1, K('rgba(214,150,130,.55)', 'rgba(255,226,160,.6)')]]); c.fillRect(0, Y(280), W, Y(190));
    const peaksB = ridge(rf, [[-40, 262], [120, 250], [220, 304], [330, 336], [420, 358], [520, 354], [600, 340], [700, 332], [780, 302], [860, 282], [1040, 252]].map(p => [X(p[0]), Y(p[1])]), .07, 4);
    path(c, gradient(c, 0, Y(250), 0, Y(560), K([[0, '#5d4d80'], [.55, '#463f70'], [1, '#3a3868']], [[0, '#c8a888'], [.55, '#b99a7a'], [1, '#a98d70']])), null, 0, p => { poly(p, peaksB.concat([[W + 40, H + 40], [-40, H + 40]])); });
    {
      const bx = X(528), by = yAt(peaksB, bx) + 2, s = Math.max(.55, F * .85), col = K('#54497a', '#a0917f'), colD = K('#463f6e', '#908373');
      const sp = (x, h, w, rh) => { path(c, col, null, 0, p => { p.rect(bx + x * s - w * s / 2, by - h * s, w * s, h * s); }); path(c, colD, null, 0, p => { p.moveTo(bx + x * s - w * s * .75, by - h * s + 1); p.quadraticCurveTo(bx + x * s - w * s * .15, by - (h + rh * .35) * s, bx + x * s, by - (h + rh) * s); p.quadraticCurveTo(bx + x * s + w * s * .15, by - (h + rh * .35) * s, bx + x * s + w * s * .75, by - h * s + 1); p.closePath(); }); };
      sp(-26, 20, 6, 20); sp(-12, 30, 7, 26); sp(2, 24, 6, 22); sp(18, 36, 8, 30); sp(34, 18, 6, 18);
      path(c, col, null, 0, p => { p.rect(bx - 30 * s, by - 8 * s, 70 * s, 8 * s); });
      c.fillStyle = K('rgba(255,206,130,.8)', 'rgba(255,230,160,.8)'); [[-12, 20], [18, 26], [2, 13]].forEach(q => c.fillRect(bx + q[0] * s - .6 * s, by - q[1] * s, 1.3 * s, 2 * s));
    }
    // ---------- Layer 2: cliffs, waterfall rock, valley floor, river ----------
    c = layers[2].g;
    const fy = [[-40, 556], [300, 556], [500, 578], [700, 622], [1040, 700]].map(p => [X(p[0]), Y(p[1])]);
    path(c, gradient(c, 0, Y(540), 0, H, K([[0, '#51405c'], [.28, '#2e2b4c'], [1, '#1b1c38']], [[0, '#dcb46a'], [.3, '#c19549'], [1, '#8d6a38']])), null, 0, p => { poly(p, fy.concat([[W + 40, H + 40], [-40, H + 40]])); });
    {
      const fr = rng(512);
      for (let i = 0; i < 220; i++) { const x = fr() * W, y = Y(572) + fr() * (H - Y(572)), l = (4 + fr() * 9) * F * (.6 + (y / H) * .6); if (y < yAt(fy, x) + 6) continue; path(c, null, fr() < .5 ? K('rgba(214,150,70,.22)', 'rgba(255,214,110,.35)') : K('rgba(18,16,40,.30)', 'rgba(120,80,30,.28)'), .9 * F, p => { p.moveTo(x, y); p.quadraticCurveTo(x + 1.5 * F, y - l * .6, x - 2 * F + fr() * 4 * F, y - l); }); }
    }
    // Left mass: tall sheer wall + plateau + waterfall cliff.
    const lEdge = ridge(rf, [[188, -40], [186, 60], [203, 125], [184, 190], [204, 236], [224, 258], [262, 250], [286, 253], [312, 252], [352, 262], [388, 284], [414, 316], [418, 356], [402, 410], [380, 455], [352, 500], [336, 540], [326, 566]].map(p => [LX(p[0]), Y(p[1])]), .05, 3);
    const lPoly = lEdge.concat([[LX(318), Y(580)], [-40, Y(580)], [-40, -40]]);
    rockMass(c, lPoly, [-40, -40, LX(430), Y(580)], K([[0, '#1b1f44'], [.55, '#32326a'], [.88, '#554878'], [1, '#76597e']], [[0, '#8a6a52'], [.55, '#a67f5c'], [.88, '#c79c68'], [1, '#e0b878']]), K([[0, 'rgba(10,10,30,0)'], [.55, 'rgba(10,10,30,0)'], [1, 'rgba(60,40,80,.35)']], [[0, 'rgba(255,240,200,.08)'], [.6, 'rgba(255,230,180,0)'], [1, 'rgba(255,214,150,.30)']]), 4401, 11 * F, K('rgba(255,170,100,.30)', 'rgba(255,232,160,.5)'), lEdge.slice(8), 1.3 * F);
    // Waterfall geometry (ribbon samples, screen px).
    {
      const wfx = LX(298), lipY = Y(254), baseY = Y(520), N = 28;
      const cxo = u => F * (-7 * ss(.28, .55, u) + 3 * ss(.6, 1, u));
      const hw = u => F * ((u < .5 ? 10 + 4 * ss(0, .5, u) : 13 + 12 * ss(.52, 1, u)) + 3 * Math.exp(-Math.pow((u - .5) / .035, 2)));
      const pts = []; for (let i = 0; i <= N; i++) { const u = i / N; pts.push({ u, x: wfx + cxo(u), y: lipY + u * (baseY - lipY), h: hw(u) }); }
      fall = { pts, lines: [], bands: [], spray: [], lipY, baseY, wfx, len: baseY - lipY };
      // Wet dark channel + pale ribbon (static).
      path(c, K('rgba(14,16,40,.55)', 'rgba(70,45,40,.4)'), null, 0, p => { p.moveTo(pts[0].x - pts[0].h - 4 * F, pts[0].y); pts.forEach(q => p.lineTo(q.x - q.h - 4 * F, q.y)); for (let i = N; i >= 0; i--) p.lineTo(pts[i].x + pts[i].h + 4 * F, pts[i].y); p.closePath(); });
      const rib = p => { p.moveTo(pts[0].x - pts[0].h, pts[0].y); pts.forEach(q => p.lineTo(q.x - q.h, q.y)); for (let i = N; i >= 0; i--) p.lineTo(pts[i].x + pts[i].h, pts[i].y); p.closePath(); };
      path(c, gradient(c, wfx - 28 * F, 0, wfx + 28 * F, 0, K([[0, '#8d94c4'], [.3, '#c9cdea'], [.5, '#e9e6f2'], [.75, '#c4c8e6'], [1, '#8a90c0']], [[0, '#d9cfa8'], [.3, '#f7f0d8'], [.5, '#fffaea'], [.75, '#f2ead0'], [1, '#d3c8a0']])), null, 0, rib);
      // Ledge rock and shrubs where the fall breaks.
      const ly = lipY + .5 * (baseY - lipY), lx = wfx + cxo(.5);
      ellipse(c, lx, ly + 4 * F, 20 * F, 3.4 * F, K('rgba(230,220,255,.5)', 'rgba(255,255,255,.65)'));
      const tr = rng(88); for (let i = 0; i < 4; i++) { const sd = i < 2 ? -1 : 1; tuft(c, lx + sd * (30 + tr() * 30) * F, ly + 14 * F + tr() * 6 * F, .8 * F, tr); }
      // Animated line sets.
      const lr = rng(5150);
      for (let j = 0; j < 20; j++) {
        const f = -.9 + 1.8 * (j + .5 * lr()) / 19, light = j % 3 !== 2, pl = [];
        for (let i = 0; i <= 14; i++) { const u = i / 14, h = hw(u); pl.push([wfx + cxo(u) + f * h * .86, lipY + u * (baseY - lipY)]); }
        const dash = light ? [(10 + lr() * 18) * F, (34 + lr() * 48) * F, (3 + lr() * 5) * F, (20 + lr() * 28) * F] : [(18 + lr() * 24) * F, (40 + lr() * 40) * F];
        fall.lines.push({ pl, dash, plen: dash.reduce((a, b) => a + b, 0), v: (55 + lr() * 70) * F, ph: lr() * 300, light, w: (light ? 1 + lr() * 1.3 : 1.6 + lr() * 1.4) * Math.max(.8, F) });
      }
      for (let b = 0; b < 3; b++) fall.bands.push({ v: .09 + .03 * b, ph: b / 3 });
      for (let i = 0; i < 16; i++) fall.spray.push({ ph: lr(), v: .06 + lr() * .05, dx: (lr() - .5) * 2, sz: (10 + lr() * 14) * F, lip: i >= 12, k: lr() });
    }
    // Plunge pool and river.
    {
      const px = fall.wfx + 8 * F, py = Y(548);
      pool = { x: px, y: py, rx: 70 * F, ry: 15 * F };
      ellipse(c, px, py, pool.rx * 1.12, pool.ry * 1.18, K('rgba(10,10,32,.5)', 'rgba(70,45,30,.35)'));
      ellipse(c, px, py, pool.rx, pool.ry, gradient(c, px - pool.rx, py, px + pool.rx, py, K([[0, '#323a74'], [.5, '#5b66a4'], [1, '#3a427c']], [[0, '#7fa6a8'], [.5, '#b9d2c8'], [1, '#78a0a2']])));
      ellipse(c, px - 12 * F, py + 2 * F, pool.rx * .55, pool.ry * .35, K('rgba(255,184,120,.28)', 'rgba(255,240,190,.5)'));
      const endX = AX - 215 * F, p0 = [px + 46 * F, py + 6 * F], p1 = [X(430), Y(580)], p2 = [endX - .06 * W, Y(650)], p3 = [endX, H + 30];
      const bz = u => { const a = 1 - u; return [a * a * a * p0[0] + 3 * a * a * u * p1[0] + 3 * a * u * u * p2[0] + u * u * u * p3[0], a * a * a * p0[1] + 3 * a * a * u * p1[1] + 3 * a * u * u * p2[1] + u * u * u * p3[1]]; };
      river = { p0, p1, p2, p3 };
      const L = [], Rr = []; for (let i = 0; i <= 24; i++) { const u = i / 24, q = bz(u), q2 = bz(Math.min(1, u + .01)), q1 = bz(Math.max(0, u - .01)), dx = q2[0] - q1[0], dy = q2[1] - q1[1], len = Math.hypot(dx, dy) || 1, w = (10 + 36 * Math.pow(u, 1.3)) * F * .5; L.push([q[0] - dy / len * w, q[1] + dx / len * w]); Rr.push([q[0] + dy / len * w, q[1] - dx / len * w]); }
      path(c, K('rgba(10,10,30,.45)', 'rgba(80,50,30,.3)'), null, 0, p => { poly(p, L.map(q => [q[0] - 2 * F, q[1]]).concat(Rr.reverse().map(q => [q[0] + 2 * F, q[1]]))); });
      L.length = 0; Rr.length = 0; for (let i = 0; i <= 24; i++) { const u = i / 24, q = bz(u), q2 = bz(Math.min(1, u + .01)), q1 = bz(Math.max(0, u - .01)), dx = q2[0] - q1[0], dy = q2[1] - q1[1], len = Math.hypot(dx, dy) || 1, w = (10 + 36 * Math.pow(u, 1.3)) * F * .5 * .9; L.push([q[0] - dy / len * w, q[1] + dx / len * w]); Rr.push([q[0] + dy / len * w, q[1] - dx / len * w]); }
      path(c, gradient(c, 0, py, 0, H, K([[0, '#59639f'], [.5, '#4a5392'], [1, '#6b6aa0']], [[0, '#a8c6c0'], [.5, '#8fb8b4'], [1, '#c8d4b0']])), null, 0, p => { poly(p, L.concat(Rr.reverse())); });
      river.bz = bz;
    }
    // Right mass: back wall + stepped cliff that carries the terraces.
    const rEdge = ridge(rf, [[W * .84, -40], [W * .84, H * .10], [W * .862, H * .19], [W * .84, H * .27], [W * .815, H * .34]].concat([Lc(150, -160), Lc(60, -96), Lc(18, -40), Lc(-30, -6), Lc(-104, 2), Lc(-124, 90), Lc(-152, 200), Lc(-190, 340)]), .04, 3);
    const rPoly = rEdge.concat([[W * .8, H + 60], [W + 60, H + 60], [W + 60, -40]]);
    rockMass(c, rPoly, [Math.min(W * .62, rEdge[Math.floor(rEdge.length * .8)][0]), -40, W + 60, H + 60], K([[0, '#62507a'], [.14, '#3f3a6a'], [.6, '#272a54'], [1, '#1a1d3a']], [[0, '#e6b878'], [.14, '#c0915e'], [.6, '#946e50'], [1, '#6d5240']]), K([[0, 'rgba(0,0,0,0)'], [.7, 'rgba(10,10,30,0)'], [1, 'rgba(24,18,44,.35)']], [[0, 'rgba(255,240,200,.14)'], [.7, 'rgba(255,230,180,0)'], [1, 'rgba(80,50,30,.20)']]), 4402, 11 * F, K('rgba(255,170,100,.32)', 'rgba(255,232,160,.5)'), rEdge.slice(0), 1.3 * F);
    {
      const tr = rng(906); for (let i = 5; i < rEdge.length - 4; i += 3) { if (rEdge[i][1] < H * .36) continue; tuft(c, rEdge[i][0] + 6 * F, rEdge[i][1] + 3 * F, .8 * F, tr); }
      for (let i = 4; i < lEdge.length; i += 5) { if (lEdge[i][1] < Y(240) || lEdge[i][1] > Y(540)) continue; if (Math.abs(lEdge[i][0] - fall.wfx) < 50 * F && lEdge[i][1] < Y(300)) continue; tuft(c, lEdge[i][0] - 5 * F, lEdge[i][1] + 2 * F, .8 * F, tr); }
    }
    // ---------- Layer 3: terraced Elven architecture, footbridge, crag gazebo ----------
    c = layers[3].g;
    const stoneL = K('#9a8fb4', '#f2e4c6'), stoneM = K('#756d9a', '#dcc9a2'), stoneD = K('#4d4876', '#b49e7c');
    const roofL = K('#6cab9d', '#7cb8a2'), roofM = K('#3d726e', '#4e8b79'), roofD = K('#25474d', '#306861');
    const gold = K('#e8ba60', '#d29836'), openTop = K('#ffe2a2', '#fff1c8'), openBot = K('#dc8340', '#ecaa58');
    const lightK = { w: K(.62, .3), l: K(.7, .32), a: K(.34, .12) };
    function addLight(x, y, r, k, ph) { const p = Lc(x, y); lights.push({ x: p[0], y: p[1], r: r * F, k, ph }); }
    function archPath(g, cx, by, w, h) { const hw = w / 2, sp = by - h + w * .85; g.moveTo(cx - hw, by); g.lineTo(cx - hw, sp); g.quadraticCurveTo(cx - hw, sp - w * .38, cx, by - h); g.quadraticCurveTo(cx + hw, sp - w * .38, cx + hw, sp); g.lineTo(cx + hw, by); g.closePath(); }
    function wall(g, x, y, w, h) {
      g.fillStyle = gradient(g, x, 0, x + w, 0, [[0, stoneL], [.5, stoneM], [1, stoneD]]); g.fillRect(x, y, w, h);
      for (let yy = y + 8; yy < y + h - 2; yy += 8) { g.fillStyle = K('rgba(10,8,40,.13)', 'rgba(110,80,50,.12)'); g.fillRect(x, yy, w, .7); }
      g.fillStyle = K('rgba(255,220,170,.28)', 'rgba(255,255,240,.5)'); g.fillRect(x, y, w, 1);
    }
    function roof(g, cx, by, w, h) {
      const hw = w / 2;
      g.beginPath(); g.moveTo(cx - hw - 5, by - 1); g.quadraticCurveTo(cx - hw * .28, by - h * .30, cx, by - h); g.quadraticCurveTo(cx + hw * .28, by - h * .30, cx + hw + 5, by - 1); g.quadraticCurveTo(cx, by + 4, cx - hw - 5, by - 1); g.closePath();
      g.fillStyle = gradient(g, cx - hw, 0, cx + hw, 0, [[0, roofL], [.45, roofM], [1, roofD]]); g.fill();
      g.strokeStyle = K('rgba(10,20,30,.28)', 'rgba(20,50,40,.28)'); g.lineWidth = .8; g.beginPath();
      for (let i = -2; i <= 2; i++) { g.moveTo(cx, by - h * .98); g.quadraticCurveTo(cx + i * hw * .12, by - h * .3, cx + i * hw * .42, by - 1); } g.stroke();
      g.strokeStyle = K('rgba(255,225,170,.5)', 'rgba(255,255,230,.7)'); g.lineWidth = 1; g.beginPath(); g.moveTo(cx - hw - 4, by - 1); g.quadraticCurveTo(cx - hw * .28, by - h * .30, cx, by - h); g.stroke();
      g.strokeStyle = gold; g.lineWidth = 1.1; g.beginPath(); g.moveTo(cx, by - h); g.lineTo(cx, by - h - 9); g.stroke(); ellipse(g, cx, by - h - 10, 1.8, 1.8, gold);
    }
    function roundWindow(g, x, y, r, ph) {
      ellipse(g, x, y, r + 2.2, r + 2.2, stoneD); ellipse(g, x, y, r + 1.2, r + 1.2, gold);
      ellipse(g, x, y, r, r, gradient(g, x, y - r, x, y + r, [[0, openTop], [1, openBot]]));
      path(g, null, K('rgba(70,40,20,.5)', 'rgba(120,70,30,.45)'), .9, p => { p.moveTo(x - r, y); p.lineTo(x + r, y); p.moveTo(x, y - r); p.lineTo(x, y + r); });
      addLight(x, y, r * 4.2, 'w', ph);
    }
    function lampAt(g, x, y, ph, chain) {
      if (chain) path(g, null, stoneD, .8, p => { p.moveTo(x, y - chain); p.lineTo(x, y - 2); });
      path(g, gold, null, 0, p => { p.moveTo(x - 2.4, y - 2); p.lineTo(x + 2.4, y - 2); p.lineTo(x + 3.2, y + 3); p.quadraticCurveTo(x, y + 6.4, x - 3.2, y + 3); p.closePath(); });
      ellipse(g, x, y + 1.8, 1.6, 2.2, K('#fff1c0', '#fff8dc'));
      addLight(x, y + 2, 11, 'l', ph);
    }
    function railing(g, x0, x1, y, h) {
      g.strokeStyle = stoneM; g.lineWidth = .9; g.beginPath(); for (let x = x0 + 2; x < x1; x += 5) { g.moveTo(x, y); g.lineTo(x, y - h); } g.stroke();
      g.strokeStyle = gold; g.lineWidth = 1.3; g.beginPath(); g.moveTo(x0, y - h); g.lineTo(x1, y - h); g.stroke();
      g.strokeStyle = stoneL; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
    }
    function arcade(g, x, by, n, aw, gap, ah, bodyH, seed) {
      const tw = n * aw + (n + 1) * gap; wall(g, x, by - bodyH, tw, bodyH);
      for (let i = 0; i < n; i++) {
        const ax = x + gap + aw / 2 + i * (aw + gap);
        path(g, gradient(g, 0, by - ah, 0, by, [[0, openTop], [1, openBot]]), null, 0, p => archPath(p, ax, by, aw, ah));
        path(g, null, gold, 1.1, p => archPath(p, ax, by, aw, ah));
        path(g, K('rgba(60,30,40,.35)', 'rgba(120,70,40,.28)'), null, 0, p => { p.rect(ax - 1, by - ah * .55, 2, ah * .55); });
        addLight(ax, by - ah * .5, aw * 2.0, 'a', seed + i);
      }
      g.fillStyle = stoneL; g.fillRect(x - 3, by - bodyH - 3, tw + 6, 4); g.fillStyle = gold; g.fillRect(x - 3, by - bodyH + 1, tw + 6, .9);
      g.fillStyle = stoneD; g.fillRect(x - 2, by, tw + 4, 2.5);
    }
    function pavilion(g, cx, by, w, bh, rh, round, seed) {
      wall(g, cx - w / 2, by - bh, w, bh);
      g.fillStyle = stoneL; g.fillRect(cx - w / 2 - 3, by - bh - 2.5, w + 6, 3.6); g.fillStyle = gold; g.fillRect(cx - w / 2 - 3, by - bh + .6, w + 6, .9);
      if (round) roundWindow(g, cx, by - bh * .52, Math.min(7.5, w * .17), seed);
      else {
        const aw = w * .34, ah = bh * .72; path(g, gradient(g, 0, by - ah, 0, by, [[0, openTop], [1, openBot]]), null, 0, p => archPath(p, cx, by, aw, ah)); path(g, null, gold, 1.1, p => archPath(p, cx, by, aw, ah)); addLight(cx, by - ah * .5, aw * 2.4, 'a', seed);
      }
      roof(g, cx, by - bh - 2, w + 8, rh);
    }
    c.save(); c.translate(AX, AY0); c.scale(F, F);
    // Valley-side soft base shadow under the whole terrace stack.
    // T2 retaining wall (right), with blind pointed niches and buttresses.
    wall(c, 168, -78, 98, 78);
    for (let i = 0; i < 4; i++) { const ax = 186 + i * 22; path(c, K('rgba(15,12,44,.5)', 'rgba(90,60,40,.28)'), null, 0, p => archPath(p, ax, 0, 13, 36)); path(c, null, K('rgba(255,210,150,.25)', 'rgba(255,255,240,.5)'), .8, p => archPath(p, ax, 0, 13, 36)); }
    c.fillStyle = stoneL; c.fillRect(165, -80, 104, 3); c.fillStyle = gold; c.fillRect(165, -77, 104, .9);
    // Gallery arcade on T1 (6 slender pointed arches) with a band of round windows above.
    arcade(c, 30, 0, 6, 15, 7.5, 44, 60, 10);
    wall(c, 30, -78, 138, 18);
    c.fillStyle = stoneL; c.fillRect(27, -80, 144, 3.4); c.fillStyle = gold; c.fillRect(27, -77, 144, .9);
    for (let i = 0; i < 3; i++) roundWindow(c, 58 + i * 46, -69, 5.2, 20 + i);
    // Hall A + tower, left of the gallery.
    arcade(c, -74, 0, 3, 17, 8, 46, 62, 30);
    pavilion(c, -36, -64, 48, 46, 76, true, 40);
    // T2 pavilion and colonnade, T3 slab and spire pavilion.
    pavilion(c, 90, -80, 62, 40, 78, false, 50);
    arcade(c, 142, -80, 4, 14, 8, 36, 44, 60);
    railing(c, 128, 142, -80, 8);
    wall(c, 128, -134, 140, 6); c.fillStyle = stoneL; c.fillRect(126, -136, 144, 3); c.fillStyle = gold; c.fillRect(126, -133, 144, .8);
    pavilion(c, 190, -136, 48, 36, 88, true, 70);
    railing(c, 130, 164, -136, 9); railing(c, 218, 266, -136, 9); railing(c, 106, 126, -80, 8);
    railing(c, 28, 166, -80, 9); railing(c, 170, 266, -80, 9);
    lampAt(c, 30, -92, 3, 0); lampAt(c, 268, -92, 4, 0);
    // Hanging lanterns beneath gallery cornice and a couple on the T1 edge.
    [[40, -50], [96, -56], [152, -52]].forEach((q, i) => lampAt(c, q[0], q[1], 6 + i, 8));
    lampAt(c, 146, -20, 11, 0);
    // Gate tower at the bridge abutment.
    wall(c, -102, -42, 26, 42);
    path(c, gradient(c, 0, -34, 0, 0, [[0, openTop], [1, openBot]]), null, 0, p => archPath(p, -89, 0, 11, 28)); path(c, null, gold, 1, p => archPath(p, -89, 0, 11, 28)); addLight(-89, -14, 22, 'a', 90);
    c.fillStyle = stoneL; c.fillRect(-104, -45, 30, 3.4); roof(c, -89, -45, 28, 34);
    // Footbridge: slender pointed spans, fine railing and lamp posts.
    {
      const xa = -76, cr = Math.max(xa - 270, (xAtY(lEdge, AY0 - 30 * F) + 24 - AX) / F), xc = Math.min(cr, xa - 70), n = Math.max(2, Math.round((xa - xc) / 52));
      const yd = u => -30 - 9 * Math.sin(Math.PI * u), xu = u => xa + (xc - xa) * u;
      // crag + gazebo
      const cx0 = xc - 4, cragTop = -30;
      path(c, gradient(c, 0, cragTop, 0, 150, K([[0, '#3a3a68'], [.5, '#2b2c54'], [1, 'rgba(60,56,100,0)']], [[0, '#8b6c5a'], [.5, '#76594f'], [1, 'rgba(150,120,90,0)']])), null, 0, p => poly(p, ridge(rng(31), [[cx0 - 30, cragTop], [cx0 - 32, 20], [cx0 - 42, 70], [cx0 - 30, 150], [cx0 + 34, 150], [cx0 + 24, 90], [cx0 + 36, 30], [cx0 + 20, cragTop]], .05, 3)));
      path(c, null, K('rgba(255,170,100,.35)', 'rgba(255,230,160,.6)'), 1.2, p => { p.moveTo(cx0 + 20, cragTop); p.lineTo(cx0 + 35, 30); p.lineTo(cx0 + 24, 90); });
      const tr = rng(77); for (let i = 0; i < 3; i++) tuft(c, cx0 - 18 + i * 17, cragTop + 1, .75, tr);
      c.fillStyle = stoneL; c.fillRect(cx0 - 22, cragTop - 3, 44, 3.2);
      [-14, -5, 5, 14].forEach(dx => { c.fillStyle = stoneM; c.fillRect(cx0 + dx - .9, cragTop - 33, 1.8, 30); });
      path(c, gradient(c, 0, cragTop - 33, 0, cragTop - 3, [[0, K('rgba(255,214,140,.55)', 'rgba(255,238,180,.5)')], [1, K('rgba(214,120,60,.3)', 'rgba(230,160,80,.3)')]]), null, 0, p => { p.rect(cx0 - 13, cragTop - 32, 26, 29); });
      roof(c, cx0, cragTop - 33, 44, 38); lampAt(c, cx0, cragTop - 24, 80, 7);
      // deck + spandrels
      const top = [], bot = []; for (let i = 0; i <= 40; i++) { const u = i / 40; top.push([xu(u), yd(u)]); bot.push([xu(u), yd(u) + 6]); }
      for (let k = 0; k < n; k++) {
        const u0 = k / n, u1 = (k + 1) / n, xl = xu(u0) , xr = xu(u1), x0 = Math.min(xl, xr) + 2.6, x1 = Math.max(xl, xr) - 2.6, w = x1 - x0, mid = yd((u0 + u1) / 2) + 6, apex = mid + 3, ys = apex + Math.min(w * .98, 52), xm = (x0 + x1) / 2;
        const dbA = [], steps = 6; for (let i = 0; i <= steps; i++) { const u = u0 + (u1 - u0) * i / steps; dbA.push([xu(u), yd(u) + 6]); }
        path(c, gradient(c, 0, apex - 6, 0, ys, [[0, stoneM], [1, K('rgba(70,66,110,.85)', 'rgba(190,168,130,.85)')]]), null, 0, p => { p.moveTo(dbA[dbA.length - 1][0] + 2.6, dbA[dbA.length - 1][1]); for (let i = dbA.length - 2; i >= 0; i--) p.lineTo(dbA[i][0] - 2.6 * (i === 0 ? 1 : 0), dbA[i][1]); p.lineTo(x0, ys); p.quadraticCurveTo(x0, ys - w * .38, xm, apex); p.quadraticCurveTo(x1, ys - w * .38, x1, ys); p.closePath(); });
        path(c, null, K('rgba(255,215,160,.35)', 'rgba(255,255,235,.6)'), .9, p => { p.moveTo(x0, ys); p.quadraticCurveTo(x0, ys - w * .38, xm, apex); p.quadraticCurveTo(x1, ys - w * .38, x1, ys); });
      }
      for (let k = 0; k <= n; k++) { const x = xu(k / n), y = yd(k / n) + 6; c.fillStyle = gradient(c, 0, y, 0, y + 130, [[0, stoneM], [.55, K('rgba(80,74,120,.75)', 'rgba(190,165,128,.75)')], [1, K('rgba(90,84,130,0)', 'rgba(200,180,140,0)')]]); c.fillRect(x - 2.6, y, 5.2, 130); }
      path(c, gradient(c, 0, -42, 0, -20, [[0, stoneL], [1, stoneD]]), null, 0, p => { p.moveTo(top[0][0], top[0][1]); top.forEach(q => p.lineTo(q[0], q[1])); for (let i = bot.length - 1; i >= 0; i--) p.lineTo(bot[i][0], bot[i][1]); p.closePath(); });
      path(c, null, gold, 1.1, p => { top.forEach((q, i) => i ? p.lineTo(q[0], q[1] - .2) : p.moveTo(q[0], q[1] - .2)); });
      // railing
      c.strokeStyle = stoneM; c.lineWidth = .8; c.beginPath(); for (let i = 0; i <= 54; i++) { const u = i / 54, x = xu(u), y = yd(u); c.moveTo(x, y); c.lineTo(x, y - 9); } c.stroke();
      c.strokeStyle = gold; c.lineWidth = 1.2; c.beginPath(); top.forEach((q, i) => i ? c.lineTo(q[0], q[1] - 9) : c.moveTo(q[0], q[1] - 9)); c.stroke();
      // lamp posts
      for (let i = 1; i <= 3; i++) { const u = i / 4, x = xu(u), y = yd(u); c.strokeStyle = stoneD; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 21); c.stroke(); lampAt(c, x, y - 25, 100 + i, 0); }
    }
    // Lower garden terrace on the cliff face: blind pointed arcade wall, balustrade, shrubs, lamp posts.
    {
      const ty = 44, tw0 = -64, tw1 = 268, tr = rng(333);
      wall(c, tw0, ty, tw1 - tw0, 24);
      for (let x = tw0 + 10; x < tw1 - 10; x += 22) { path(c, K('rgba(15,12,44,.45)', 'rgba(90,60,40,.26)'), null, 0, p => archPath(p, x, ty + 24, 11, 19)); path(c, null, K('rgba(255,210,150,.25)', 'rgba(255,255,240,.45)'), .7, p => archPath(p, x, ty + 24, 11, 19)); }
      c.fillStyle = stoneL; c.fillRect(tw0 - 3, ty - 3, tw1 - tw0 + 6, 3.6); c.fillStyle = gold; c.fillRect(tw0 - 3, ty - .2, tw1 - tw0 + 6, .8);
      railing(c, tw0, tw1, ty - 3, 7);
      for (let i = 0; i < 9; i++) tuft(c, tw0 + 14 + i * 36 + tr() * 10, ty - 3, .8, tr);
      [-30, 70, 170, 250].forEach((x, i) => lampAt(c, x, ty - 22, 120 + i, 0));
      c.strokeStyle = K('rgba(255,215,160,.28)', 'rgba(255,255,235,.5)'); c.lineWidth = .8;
      c.beginPath(); c.moveTo(tw0 + 30, ty + 24); c.lineTo(tw0 + 30, ty + 52); c.moveTo(tw1 - 30, ty + 24); c.lineTo(tw1 - 30, ty + 52); c.stroke();
    }
    // Terrace trees (trunks here; swaying canopies are cached sprites drawn per frame).
    const treeDefs = [[254, 0, .62, 3], [126, -136, .4, 7], [-118, 40, .5, 11], [30, -80, .38, 5], [24, 44, .45, 13], [162, 44, .5, 15]];
    treeDefs.forEach(td => {
      const q = Lc(td[0], td[1]), s = td[2] * F, a = trunk(c, td[0], td[1], td[2], K('#2e2038', '#5a3a2c'));
      canopies.push({ x: AX + a[0] * F, y: AY0 + a[1] * F, sp: canopySprite(td[2] * F, td[3] * 31, 1), ph: td[3] * .9, wob: .8, grp: 0, ox: 54 * td[2] * F, oy: 84 * .80 * td[2] * F });
    });
    c.restore();
    // Plateau and valley-floor trees (screen coords).
    {
      const placed = [[LX(214), Y(262), .75 * F, 13, 2], [LX(352), Y(266), .5 * F, 17, 2], [X(250), Y(628), .62 * F, 19, 3], [X(356), Y(600), .42 * F, 23, 3]];
      placed.forEach(p => { const a = trunk(layers[p[4]].g, p[0], p[1], p[2], K('#2e2038', '#5a3a2c')); canopies.push({ x: a[0], y: a[1], sp: canopySprite(p[2], p[3] * 29, 1), ph: p[3] * .7, wob: .8, grp: p[4] === 2 ? 0 : 0, ox: 54 * p[2], oy: 84 * .80 * p[2] }); });
    }
    // ---------- Layer 4: foreground framing ----------
    c = layers[4].g;
    {
      const lf = ridge(rng(1201), [[.054 * W, -40], [.058 * W, H * .2], [.044 * W, H * .45], [.07 * W, H * .62], [.15 * W, H * .76], [.21 * W, H * .88], [.27 * W, H + 40]], .04, 3);
      path(c, gradient(c, 0, 0, .27 * W, 0, K([[0, '#0b0f24'], [.7, '#171b3a'], [1, '#232647']], [[0, '#3a2a22'], [.7, '#5a4030'], [1, '#7c5640']])), null, 0, p => poly(p, lf.concat([[-40, H + 40], [-40, -40]])));
      path(c, null, K('rgba(255,160,90,.25)', 'rgba(255,225,150,.4)'), 1.3 * F, p => { lf.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); });
      const rf2 = ridge(rng(1202), [[.958 * W, -40], [.948 * W, H * .15], [.962 * W, H * .4], [.935 * W, H * .62], [.89 * W, H * .76], [.83 * W, H * .89], [.77 * W, H + 40]], .04, 3);
      path(c, gradient(c, W, 0, .76 * W, 0, K([[0, '#0b0f24'], [.7, '#171b3a'], [1, '#232647']], [[0, '#3a2a22'], [.7, '#5a4030'], [1, '#7c5640']])), null, 0, p => poly(p, rf2.concat([[W + 40, H + 40], [W + 40, -40]])));
      path(c, null, K('rgba(255,160,90,.25)', 'rgba(255,225,150,.4)'), 1.3 * F, p => { rf2.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); });
      const tr = rng(1203);
      for (let i = 3; i < lf.length; i += 4) if (lf[i][1] > H * .5) tuft(c, lf[i][0], lf[i][1] + 2 * F, 1.1 * F, tr);
      for (let i = 3; i < rf2.length; i += 4) if (rf2[i][1] > H * .5) tuft(c, rf2[i][0], rf2[i][1] + 2 * F, 1.1 * F, tr);
      // Foreground autumn trees: left (mostly behind the app sidebar) and right edge.
      const fl = [[.09 * W, H * 1.0, 1.25 * F, 41], [.955 * W, H * 1.0, 1.1 * F, 43]];
      fl.forEach(p => { const a = trunk(c, p[0], p[1], p[2], K('#120f24', '#3a261e'), 1.5); canopies.push({ x: a[0], y: a[1], sp: canopySprite(p[2], p[3] * 37, 1), ph: p[3] * .31, wob: 1, grp: 1, ox: 54 * p[2], oy: 84 * .80 * p[2] }); });
      // Hanging branch from the top-right corner (kept clear of the title zone).
      const hs = Math.max(.7, F) * 1.2, bw = 120 * hs, bh = 60 * hs;
      const sp = sprite(bw, bh, Math.max(1, dpr), g => {
        const r = rng(4242); g.lineCap = 'round';
        path(g, null, K('#120f24', '#3a261e'), 2.6 * hs, p => { p.moveTo(bw, 0); p.bezierCurveTo(bw * .78, bh * .12, bw * .5, bh * .12, bw * .22, bh * .42); });
        const pal = K(['#c98b2c', '#b5602a', '#d6a43c', '#93472b'], ['#e4a82c', '#cc6a28', '#e8b43e', '#a64a2a']);
        for (let i = 0; i < 22; i++) { const u = r(), x = bw * (1 - u * .8), y = bh * (.04 + .36 * Math.pow(u, 1.2)) + (r() - .2) * bh * .25; ellipse(g, x, y, (4 + r() * 6) * hs, (3 + r() * 5) * hs, pal[Math.floor(r() * 4)]); }
        for (let i = 0; i < 14; i++) { const u = r(), x = bw * (1 - u * .78), y = bh * (.06 + .34 * Math.pow(u, 1.2)) + (r() - .1) * bh * .3; ellipse(g, x - 1, y - 1.5, (1.4 + r() * 2) * hs, (1 + r() * 1.4) * hs, K('rgba(255,214,120,.55)', 'rgba(255,240,150,.6)')); }
      });
      canopies.push({ x: W + 4, y: -2, sp, ph: 2.2, wob: 1.1, grp: 1, ox: bw, oy: 0 });
      // Vignette baked into the cached frame layer.
      const vg = c.createRadialGradient(W * .5, H * .5, Math.min(W, H) * .35, W * .5, H * .5, Math.max(W, H) * .78);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, K('rgba(5,6,22,.36)', 'rgba(70,36,16,.18)')); c.fillStyle = vg; c.fillRect(0, 0, W, H);
    }
    // ---------- Overlay sprites and data ----------
    spr.glow = radialSprite(96, K('255,200,118', '255,214,140'), [[0, .9], [.35, .38], [1, 0]]);
    spr.puff = radialSprite(48, K('206,200,236', '255,250,236'), [[0, .95], [.5, .5], [1, 0]]);
    // Leaf sprites in four autumn tints.
    {
      const lc = K(['#d6a03a', '#b8602a', '#e2b44a', '#9a4a2c'], ['#e8ac30', '#cc6a28', '#f0bc40', '#aa4c2a']);
      spr.leaf = lc.map((col, i) => sprite(16, 16, 2, g => {
        path(g, col, null, 0, p => { p.moveTo(2, 8); p.quadraticCurveTo(7, 1.5 + i * .3, 14, 8); p.quadraticCurveTo(7, 14.5 - i * .3, 2, 8); p.closePath(); });
        path(g, null, 'rgba(60,24,12,.5)', .8, p => { p.moveTo(2, 8); p.lineTo(13, 8); }); path(g, null, 'rgba(255,230,150,.35)', .6, p => { p.moveTo(4, 7); p.lineTo(10, 5.6); });
      }));
    }
    // Clouds: soft elongated sprites; sunset-lit undersides. [y, w, speed, x0, alpha]
    const cdefs = [[.40, .24, .0042, .10, .50], [.45, .30, .0030, .55, .44], [.37, .20, .0060, .82, .46], [.43, .26, .0050, .30, .42], [.16, .17, .0034, .94, .30], [.10, .15, .0045, .02, .26]];
    clouds = cdefs.map((d, i) => {
      const w = Math.max(120, W * d[1]), h = w * .22, r = rng(70 + i * 17), n = 7 + Math.floor(r() * 4);
      const body = K('118,100,156', '255,246,226'), under = K('72,58,112', '236,196,152'), rim = K('250,176,120', '255,224,160');
      const puffs = []; for (let k = 0; k < n; k++) { const u = (k + .5) / n; puffs.push({ cx: w * (.10 + .80 * u) + (r() - .5) * w * .04, cy: h * (.64 - .16 * Math.sin(Math.PI * u) * (.6 + .4 * r())), rx: w * (.09 + .07 * r()), ry: h * (.30 + .22 * r() * Math.sin(Math.PI * u) + .08) }); }
      const sp = sprite(w, h, 1, g => { puffs.forEach(q => blob(g, q.cx, q.cy + q.ry * .22, q.rx * 1.05, q.ry, under, .36)); puffs.forEach(q => blob(g, q.cx, q.cy, q.rx, q.ry, body, .55)); puffs.forEach(q => blob(g, q.cx - q.rx * .1, q.cy + q.ry * .42, q.rx * .8, q.ry * .4, rim, K(.42, .5))); });
      return { y: d[0], w, h, v: d[2], x0: d[3], a: d[4] * K(1, 1.05), sp, p: i * 1.7 };
    });
    // Valley mist: two soft sprites, drawn as bands (front bands after the architecture, one behind it).
    {
      const mw = W * .95, mh = Math.max(46, 120 * F), rgb = K('190,164,196', '255,238,206');
      const make = seed => { const rr = rng(seed); return sprite(mw, mh, 1, g => { for (let i = 0; i < 12; i++) blob(g, mw * (.08 + .84 * rr()), mh * (.5 + .18 * (rr() - .5)), mw * (.09 + .10 * rr()), mh * (.14 + .22 * rr()), rgb, .55); }); };
      const a = make(31), b = make(97);
      mists = [{ sp: a, y: .66, v: .0070, x0: .1, a: 1, sy: 1 }, { sp: b, y: .75, v: -.0050, x0: .62, a: .85, sy: 1.1 }, { sp: a, y: .85, v: .0095, x0: .85, a: .75, sy: 1.15 }, { sp: b, y: .58, v: .0045, x0: .35, a: .7, sy: .95 }];
      backMists = [{ sp: b, y: .60, v: .0040, x0: .5, a: .8, sy: 1 }, { sp: a, y: .50, v: -.0030, x0: .2, a: .6, sy: .9 }];
    }
    // Stars (night): in the title zone they are dimmed.
    stars = [];
    if (dark) for (let i = 0; i < 90; i++) {
      const x = S0() * W, y = S0() * H * .42, bright = S0() < .1, r0 = S0(), b0 = S0(), sp0 = S0(), ph0 = S0();
      const cz = ss(.22, .30, x / W) * (1 - ss(.70, .78, x / W)) * ss(.04, .08, y / H) * (1 - ss(.30, .36, y / H));
      stars.push({ x, y, r: (bright ? 1.0 : .45 + r0 * .55) * Math.max(.7, F), b: (bright ? .8 : .26 + b0 * .5) * (1 - .55 * cz), sp: .4 + sp0 * 1.6, ph: ph0 * 6.28, big: bright && cz < .3 });
    }
    // Birds (both modes): slow crossings below the title zone. [y, speed, x0, size]
    birds = [[.40, .0105, .10, 6], [.46, .0085, .52, 7], [.375, .0120, .78, 5.5], [.43, .0095, .31, 6.5], [.49, .0078, .92, 5]].map((b, i) => ({ y: b[0], v: b[1], x0: b[2], ph: i * 1.3, sz: b[3] * Math.max(.7, F) }));
    // Leaves: about 25, slow wind toward the right, slow tumble.
    {
      const lr = rng(9191); leaves = [];
      for (let i = 0; i < 25; i++) {
        const yS = H * (.34 + .22 * lr()), yE = H * (.93 + .05 * lr()), vy = (11 + 9 * lr()) * Math.max(.7, F);
        leaves.push({ x0: W * (-.05 + .95 * lr()), yS, yE, vy, T: (yE - yS) / vy, wind: (6 + 9 * lr()) * Math.max(.7, F), ph: lr(), sw: (14 + 24 * lr()) * Math.max(.7, F), sf: .35 + .5 * lr(), p2: lr() * 6.28, rot0: lr() * 6.28, rw: (.4 + .8 * lr()) * (lr() < .5 ? -1 : 1), ff: .5 + .9 * lr(), s: (7 + 7 * lr()) * Math.max(.75, F), col: i % 4, a: .75 + .25 * lr(), seed: i });
      }
    }
    staticBuilds++;
  }
  function draw(timeSeconds) {
    if (destroyed || !width || !height) return;
    const t = Number.isFinite(timeSeconds) ? timeSeconds : (fixed === null ? elapsed : fixed);
    const dark = options.dark !== false, W = width, H = height, F = sc;
    const blit = i => { const l = layers[i]; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(l.cv, 0, l.topPx); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    blit(0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Twinkling stars and a shooting star roughly every 15 s (night only).
    if (dark) {
      ctx.fillStyle = '#f6ead5';
      for (let i = 0; i < stars.length; i++) { const q = stars[i], tw = .5 + .5 * Math.sin(t * q.sp + q.ph), a = q.b * (.3 + .7 * tw); ctx.globalAlpha = a; ctx.fillRect(q.x - q.r, q.y - q.r, q.r * 2, q.r * 2); if (q.big && tw > .75) { ctx.globalAlpha = a * .45; ctx.fillRect(q.x - q.r * 4, q.y - .4, q.r * 8, .8); ctx.fillRect(q.x - .4, q.y - q.r * 4, .8, q.r * 8); } }
      ctx.globalAlpha = 1;
      const k = Math.floor(t / 15), ph = t - k * 15, hr = rng(k * 7919 + 13), s0 = 2.5 + hr() * 9, dur = 1.3;
      if (ph >= s0 && ph <= s0 + dur) {
        const u = (ph - s0) / dur, left = hr() < .5, sx = (left ? .02 + .04 * hr() : .98 - .04 * hr()) * W, sy = (.05 + .12 * hr()) * H, ang = .35 + .2 * hr(), dir = left ? 1 : -1, len = W * .17;
        const e = 1 - Math.pow(1 - u, 2), hx = sx + dir * Math.cos(ang) * len * e, hy = sy + Math.sin(ang) * len * e, tl = W * .06 * Math.sin(Math.PI * u) + 4, tx = hx - dir * Math.cos(ang) * tl, ty = hy - Math.sin(ang) * tl;
        const g = ctx.createLinearGradient(tx, ty, hx, hy); g.addColorStop(0, 'rgba(255,246,222,0)'); g.addColorStop(1, 'rgba(255,248,230,' + (.8 * Math.sin(Math.PI * Math.min(1, u * 1.15 + .08))) + ')');
        ctx.strokeStyle = g; ctx.lineWidth = Math.max(1.1, 1.5 * F); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
      }
    }
    // Drifting clouds, mostly along the horizon, faded where they cross the title zone.
    for (let i = 0; i < clouds.length; i++) {
      const cl = clouds[i], span = W + cl.w * 1.3, x = ((cl.x0 * span + t * cl.v * W) % span + span) % span - cl.w * .65, y = cl.y * H + Math.sin(t * .05 + cl.p) * 3;
      const cx = (x + cl.w / 2) / W, cyf = (y + cl.h / 2) / H;
      const zone = ss(.18, .30, cx) * (1 - ss(.70, .82, cx)) * ss(.03, .09, cyf) * (1 - ss(.30, .37, cyf));
      ctx.globalAlpha = cl.a * (1 - .94 * zone); ctx.drawImage(cl.sp.cv, x, y, cl.w, cl.h);
    }
    ctx.globalAlpha = 1;
    blit(1);
    // Birds crossing slowly (small flapping silhouettes).
    ctx.strokeStyle = dark ? 'rgba(30,24,52,.72)' : 'rgba(90,64,48,.62)'; ctx.lineWidth = Math.max(1, 1.1 * F); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i < birds.length; i++) {
      const b = birds[i], span = W + 160, x = ((b.x0 * span + t * b.v * W) % span + span) % span - 80, y = b.y * H + Math.sin(t * .5 + b.ph) * 6, f = Math.sin(t * 3.2 + b.ph * 3) * b.sz * .5, sz = b.sz;
      ctx.moveTo(x - sz, y - f); ctx.quadraticCurveTo(x - sz * .45, y - f * .2 - sz * .35, x, y); ctx.quadraticCurveTo(x + sz * .45, y - f * .2 - sz * .35, x + sz, y - f);
    }
    ctx.stroke();
    blit(2);
    // Waterfall: flowing streaks clipped to the ribbon, travelling highlight bands, rising spray.
    if (fall) {
      const pts = fall.pts, N = pts.length - 1;
      ctx.save(); ctx.beginPath(); ctx.moveTo(pts[0].x - pts[0].h, pts[0].y); for (let i = 0; i <= N; i++) ctx.lineTo(pts[i].x - pts[i].h, pts[i].y); for (let i = N; i >= 0; i--) ctx.lineTo(pts[i].x + pts[i].h, pts[i].y); ctx.closePath(); ctx.clip();
      ctx.lineCap = 'butt';
      for (let j = 0; j < fall.lines.length; j++) {
        const L = fall.lines[j]; ctx.setLineDash(L.dash); ctx.lineDashOffset = -((t * L.v + L.ph) % L.plen);
        ctx.strokeStyle = L.light ? (dark ? 'rgba(255,252,255,.62)' : 'rgba(255,255,255,.8)') : (dark ? 'rgba(80,90,160,.38)' : 'rgba(150,120,80,.30)'); ctx.lineWidth = L.w;
        ctx.beginPath(); ctx.moveTo(L.pl[0][0], L.pl[0][1]); for (let i = 1; i < L.pl.length; i++) ctx.lineTo(L.pl[i][0], L.pl[i][1]); ctx.stroke();
      }
      ctx.setLineDash([]);
      for (let b = 0; b < fall.bands.length; b++) {
        const bd = fall.bands[b], bh = fall.len * .22, y = fall.lipY - bh + (((t * bd.v + bd.ph) % 1) + 1) % 1 * (fall.len + bh), g = ctx.createLinearGradient(0, y, 0, y + bh);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, dark ? 'rgba(255,250,255,.22)' : 'rgba(255,255,255,.34)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(fall.wfx - 48 * F, y, 96 * F, bh);
      }
      ctx.restore();
      // Pool ripples + river glints.
      if (pool) {
        ctx.lineWidth = Math.max(.8, F); ctx.strokeStyle = dark ? 'rgba(220,226,255,.5)' : 'rgba(255,255,255,.7)';
        for (let i = 0; i < 3; i++) { const a = ((t * .16 + i / 3) % 1 + 1) % 1; ctx.globalAlpha = .55 * Math.sin(Math.PI * a); ctx.beginPath(); ctx.ellipse(pool.x - 20 * F, pool.y - 4 * F, pool.rx * (.12 + .7 * a), pool.ry * (.12 + .7 * a), 0, 0, Math.PI * 2); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
      if (river) {
        const r = river; ctx.lineCap = 'round';
        ctx.setLineDash([4 * F, 42 * F]); ctx.lineDashOffset = -((t * 16 * F) % (46 * F)); ctx.strokeStyle = dark ? 'rgba(255,214,170,.45)' : 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5 * Math.max(.8, F);
        ctx.beginPath(); ctx.moveTo(r.p0[0], r.p0[1]); ctx.bezierCurveTo(r.p1[0], r.p1[1], r.p2[0], r.p2[1], r.p3[0], r.p3[1]); ctx.stroke();
        ctx.setLineDash([2 * F, 30 * F]); ctx.lineDashOffset = -((t * 10 * F) % (32 * F) + 14 * F); ctx.lineWidth = 1.1 * Math.max(.8, F);
        ctx.beginPath(); ctx.moveTo(r.p0[0] + 5 * F, r.p0[1] + 2 * F); ctx.bezierCurveTo(r.p1[0] + 5 * F, r.p1[1] + 3 * F, r.p2[0] + 6 * F, r.p2[1], r.p3[0] + 6 * F, r.p3[1]); ctx.stroke();
        ctx.setLineDash([]);
      }
      const baseA = dark ? .30 : .38;
      for (let i = 0; i < fall.spray.length; i++) {
        const p = fall.spray[i], a = ((t * p.v + p.ph) % 1 + 1) % 1, sz = p.sz * (.55 + a * 1.1);
        const x = p.lip ? fall.wfx + 3 * F + p.dx * 18 * F + a * 14 * F : pool.x - 10 * F + p.dx * 44 * F + a * 12 * F * (p.k - .3), y = p.lip ? fall.lipY + 6 * F - a * 20 * F : fall.baseY + 4 * F - a * 56 * F;
        ctx.globalAlpha = baseA * Math.pow(Math.sin(Math.PI * a), .9) * (p.lip ? .6 : 1); ctx.drawImage(spr.puff.cv, x - sz, y - sz, sz * 2, sz * 2);
      }
      ctx.globalAlpha = 1;
    }
    // Mist band behind the architecture.
    const drawMist = (list, base) => {
      for (let i = 0; i < list.length; i++) {
        const m = list[i], sw = m.sp.w, span = W + sw, x = (((m.x0 * span + t * m.v * W) % span) + span) % span - sw, h = m.sp.h * m.sy;
        ctx.globalAlpha = base * m.a * (.78 + .22 * Math.sin(t * .13 + i * 2)); ctx.drawImage(m.sp.cv, x, m.y * H - h / 2, sw, h);
      }
      ctx.globalAlpha = 1;
    };
    drawMist(backMists, dark ? .26 : .20);
    blit(3);
    // Canopies on the cliffs/terraces/valley: gentle sway.
    const gust = .6 + .4 * Math.sin(t * .21);
    const drawCanopies = grp => {
      for (let i = 0; i < canopies.length; i++) {
        const cn = canopies[i]; if (cn.grp !== grp) continue;
        const a = (Math.sin(t * .8 + cn.ph) * .010 + Math.sin(t * .33 - cn.x * .004) * .010 * gust) * cn.wob, sk = Math.sin(t * .7 + cn.ph + 1.2) * .026 * cn.wob * (.6 + .4 * gust);
        ctx.save(); ctx.translate(cn.x, cn.y); ctx.rotate(a); ctx.transform(1, 0, sk, 1, 0, 0); ctx.drawImage(cn.sp.cv, -cn.ox, -cn.oy, cn.sp.w, cn.sp.h); ctx.restore();
      }
    };
    drawCanopies(0);
    // Lantern and window glows: slow, low-amplitude flicker only.
    {
      const aK = { w: dark ? .62 : .30, l: dark ? .72 : .34, a: dark ? .34 : .12 }, rK = { w: 1, l: 1, a: 1 }, amp = { w: .07, l: .10, a: .05 };
      for (let i = 0; i < lights.length; i++) {
        const q = lights[i], f = .5 * Math.sin(t * 1.6 + q.ph * 2.3) + .3 * Math.sin(t * 2.7 + q.ph * 4.1) + .2 * Math.sin(t * .55 + q.ph), a = aK[q.k] * (1 + amp[q.k] * 2 * f), R = q.r * (1 + .03 * f);
        ctx.globalAlpha = Math.max(0, Math.min(1, a)); ctx.drawImage(spr.glow.cv, q.x - R, q.y - R, R * 2, R * 2);
        if (q.k === 'l') { const r2 = R * .22; ctx.globalAlpha = Math.max(0, Math.min(1, (dark ? .5 : .3) * (1 + amp.l * 2 * f))); ctx.drawImage(spr.glow.cv, q.x - r2, q.y - r2, r2 * 2, r2 * 2); }
      }
      ctx.globalAlpha = 1;
    }
    drawMist(mists, dark ? .24 : .17);
    blit(4);
    drawCanopies(1);
    // Falling autumn leaves: slow wind, slow tumble, dimmed over the title zone.
    for (let i = 0; i < leaves.length; i++) {
      const lf = leaves[i], uu = t / lf.T + lf.ph, n = Math.floor(uu), u = uu - n, age = u * lf.T;
      const hsh = Math.sin(n * 12.9898 + lf.seed * 78.233) * 43758.5453, off = (hsh - Math.floor(hsh) - .5) * W * .4;
      const x = lf.x0 + off + lf.wind * age + Math.sin(age * lf.sf + lf.p2) * lf.sw + Math.sin(age * lf.sf * 2.3 + lf.p2 * 1.7) * lf.sw * .25, y = lf.yS + u * (lf.yE - lf.yS) + Math.sin(age * lf.sf * 1.3 + lf.p2) * 3;
      const cx = x / W, cyf = y / H, zone = ss(.22, .30, cx) * (1 - ss(.70, .78, cx)) * ss(.04, .08, cyf) * (1 - ss(.30, .36, cyf));
      const al = Math.min(1, u / .07, (1 - u) / .1) * lf.a * (1 - .85 * zone); if (al <= .01) continue;
      const rot = lf.rot0 + age * lf.rw + Math.sin(age * lf.sf * 1.7 + lf.p2) * .8, flip = .3 + .7 * Math.abs(Math.cos(age * lf.ff + lf.p2)), s = lf.s;
      ctx.globalAlpha = al; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, flip); ctx.drawImage(spr.leaf[lf.col].cv, -s / 2, -s / 2, s, s); ctx.restore();
    }
    ctx.globalAlpha = 1;
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
    width = n.w; height = n.h; dpr = ratio; canvas.width = Math.max(1, Math.round(width * dpr)); canvas.height = Math.max(1, Math.round(height * dpr)); buildLandscape(); draw();
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
    lights = []; canopies = []; leaves = []; mists = []; backMists = []; clouds = []; birds = []; stars = []; fall = null; river = null; pool = null; sprites = []; spr = {};
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
