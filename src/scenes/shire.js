/* Original Canvas2D landscape, v2: five cached parallax layers + animated overlays.
   No imports, storage, network, audio, or remote images. */
function createShireScene(canvas, options = {}) {
  if (!canvas || typeof canvas.getContext !== 'function') throw new TypeError('A canvas element is required.');
  options = options && typeof options === 'object' ? options : {};
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas2D is unavailable.');
  const doc = canvas.ownerDocument || document;
  const win = doc.defaultView || window;
  // [name, parallax factor, top fraction, bottom fraction]
  const DEFS = [['sky', .12, 0, 1], ['far', .3, .36, .72], ['mid', .5, .50, .74], ['hobbit', .75, .38, 1], ['foreground', 1, .50, 1]];
  const layers = DEFS.map(d => {
    const cv = doc.createElement('canvas');
    const g = cv.getContext('2d');
    if (!g) throw new Error('Cached Canvas2D is unavailable.');
    return { name: d[0], f: d[1], y0: d[2], y1: d[3], cv, g, top: 0, topPx: 0 };
  });
  const media = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let width = 0, height = 0, dpr = 1, destroyed = false, raf = 0;
  let frames = 0, staticBuilds = 0, lastFrame = -Infinity, elapsed = 0, lastTick = null;
  let motion = options.motion !== false && !(media && media.matches);
  const fixed = Number.isFinite(options.fixedTime) ? options.fixedTime : null;
  const maxFPS = Math.min(24, Math.max(1, Number(options.fps) || 24));
  // Parallax state (CSS px): pad is the oversize margin on each side of every layer.
  let pad = 0, padPx = 0, amp = 0, ptrTarget = 0, ptrCur = 0, sc = 1;
  // Scene objects built together with the cached layers.
  let windows = [], chimney = null, lantern = null, mill = null, stars = [], clouds = [], mists = [], flies = [], butterflies = [], birds = [];
  let blades = [[], [], []], bladeFlowers = [], trees = [], sprites = [], spr = {}, vignette = null;
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
  function buildLandscape() {
    const W = width, H = height, S = Math.min(W / 1000, H / 720), dark = options.dark !== false;
    sc = S;
    const X = n => n * W / 1000, Y = n => n * H / 720;
    amp = Math.min(18, 6 + W * .008); pad = Math.ceil(amp) + 2; padPx = Math.round(pad * dpr);
    const lw = Math.round(W * dpr) + padPx * 2;
    layers.forEach(l => {
      l.top = Math.floor(H * l.y0); l.topPx = Math.round(l.top * dpr);
      l.cv.width = lw; l.cv.height = Math.max(1, Math.round(Math.ceil(H * l.y1) * dpr) - l.topPx);
      l.g.setTransform(dpr, 0, 0, dpr, padPx, -l.topPx);
    });
    sprites.forEach(s => { s.cv.width = 1; s.cv.height = 1; }); sprites = []; spr = {};
    const Lm = -pad - 2, Rm = W + pad + 2; // ridge endpoints stay oversize
    const S0 = rng(16321);
    // ---------- Layer 0: sky ----------
    let c = layers[0].g;
    const sky = gradient(c, 0, 0, 0, H, dark ? [[0, '#141f36'], [.16, '#1f2c48'], [.32, '#41475f'], [.50, '#ad8a86'], [.62, '#d8b08a'], [.80, '#8f9370'], [1, '#536248']] : [[0, '#7fa8b9'], [.26, '#aac6c4'], [.46, '#dcd5b6'], [.64, '#e8d19c'], [1, '#7e8e58']]);
    c.fillStyle = sky; c.fillRect(-pad, 0, W + pad * 2, H);
    const haze = c.createRadialGradient(X(320), Y(335), 0, X(320), Y(335), X(680));
    haze.addColorStop(0, 'rgba(239,193,148,.20)'); haze.addColorStop(1, 'rgba(223,184,157,0)'); c.fillStyle = haze; c.fillRect(-pad, 0, W + pad * 2, H);
    const glow2 = c.createRadialGradient(X(640), Y(360), 0, X(640), Y(360), X(520));
    glow2.addColorStop(0, dark ? 'rgba(244,164,110,.16)' : 'rgba(255,230,160,.22)'); glow2.addColorStop(1, 'rgba(244,164,110,0)'); c.fillStyle = glow2; c.fillRect(-pad, 0, W + pad * 2, H);
    const mx = X(148), my = Y(129), mr = 15 * S;
    const moonHalo = c.createRadialGradient(mx, my, mr, mx, my, mr * 6); moonHalo.addColorStop(0, dark ? 'rgba(236,215,175,.13)' : 'rgba(255,238,180,.30)'); moonHalo.addColorStop(1, 'rgba(236,215,175,0)'); c.fillStyle = moonHalo; c.fillRect(mx - mr * 6, my - mr * 6, mr * 12, mr * 12);
    ellipse(c, mx, my, mr, mr, dark ? '#ddd5bb' : '#f5e4af');
    if (dark) { c.save(); c.beginPath(); c.arc(mx, my, mr, 0, Math.PI * 2); c.clip(); ellipse(c, mx + 5 * S, my - 4 * S, mr * .90, mr * .90, sky); c.restore(); }
    // ---------- Layer 1: far ridges + distant windmill tower ----------
    c = layers[1].g;
    path(c, gradient(c, 0, Y(300), 0, Y(480), dark ? [[0, '#6c6f86'], [1, '#575b70']] : [[0, '#94a39c'], [1, '#7f9288']]), null, 0, p => { p.moveTo(Lm, Y(366)); p.bezierCurveTo(X(115), Y(302), X(178), Y(333), X(286), Y(359)); p.bezierCurveTo(X(438), Y(389), X(534), Y(306), X(655), Y(327)); p.bezierCurveTo(X(780), Y(342), X(820), Y(310), Rm, Y(355)); p.lineTo(Rm, H); p.lineTo(Lm, H); });
    path(c, gradient(c, 0, Y(340), 0, Y(480), dark ? [[0, '#626f78'], [1, '#52626a']] : [[0, '#8a9f8c'], [1, '#76917c']]), null, 0, p => { p.moveTo(Lm, Y(388)); p.bezierCurveTo(X(140), Y(360), X(190), Y(411), X(355), Y(387)); p.bezierCurveTo(X(480), Y(371), X(603), Y(343), X(748), Y(374)); p.bezierCurveTo(X(873), Y(406), X(930), Y(366), Rm, Y(380)); p.lineTo(Rm, H); p.lineTo(Lm, H); });
    {
      const ms = Math.max(S * 1.1, .5), mxp = X(500), by = Y(364);
      path(c, dark ? '#5c6c75' : '#8aa088', null, 0, p => { p.moveTo(mxp - 110 * ms, by + 12 * ms); p.bezierCurveTo(mxp - 60 * ms, by - 12 * ms, mxp + 50 * ms, by - 14 * ms, mxp + 120 * ms, by + 12 * ms); p.closePath(); });
      const body = dark ? '#474c61' : '#6e7c78', capc = dark ? '#363b50' : '#56645f', lit = dark ? '#8d8aa0' : '#a9b4a8';
      path(c, body, null, 0, p => { p.moveTo(mxp - 14 * ms, by); p.lineTo(mxp - 9 * ms, by - 52 * ms); p.lineTo(mxp + 9 * ms, by - 52 * ms); p.lineTo(mxp + 14 * ms, by); p.closePath(); });
      path(c, null, lit, 1.2 * ms, p => { p.moveTo(mxp + 12 * ms, by - 2 * ms); p.lineTo(mxp + 8 * ms, by - 50 * ms); });
      path(c, capc, null, 0, p => { p.moveTo(mxp - 12 * ms, by - 52 * ms); p.quadraticCurveTo(mxp, by - 72 * ms, mxp + 12 * ms, by - 52 * ms); p.closePath(); });
      c.fillStyle = capc; c.fillRect(mxp - 16 * ms, by - 54 * ms, 32 * ms, 3 * ms);
      c.fillStyle = '#e8b66a'; c.fillRect(mxp - 2 * ms, by - 36 * ms, 4 * ms, 6 * ms);
      c.fillStyle = capc; c.fillRect(mxp - 16 * ms, by - 2 * ms, 32 * ms, 4 * ms);
      mill = { x: mxp, y: by - 54 * ms, r: 40 * ms, ms };
    }
    // ---------- Layer 2: mid hill, distant homes, small trees ----------
    c = layers[2].g;
    path(c, gradient(c, 0, Y(365), 0, Y(570), dark ? [[0, '#68715b'], [1, '#3e574a']] : [[0, '#8d9b68'], [1, '#647e50']]), null, 0, p => { p.moveTo(Lm, Y(424)); p.bezierCurveTo(X(140), Y(405), X(178), Y(367), X(311), Y(392)); p.bezierCurveTo(X(476), Y(427), X(555), Y(474), X(704), Y(444)); p.bezierCurveTo(X(844), Y(398), X(918), Y(401), Rm, Y(428)); p.lineTo(Rm, H); p.lineTo(Lm, H); });
    path(c, null, 'rgba(195,183,130,.24)', 2 * S, p => { p.moveTo(X(250), Y(410)); p.bezierCurveTo(X(343), Y(413), X(362), Y(437), X(443), Y(451)); });
    for (const v of [[193, 404, 11], [224, 406, 9], [338, 399, 8]]) { const x = X(v[0]), y = Y(v[1]), s = v[2] * S; ellipse(c, x, y, s, s * .54, '#3e5044'); c.fillStyle = '#d5ad6b'; c.fillRect(x - s * .3, y - s * .09, 2 * S, 2 * S); }
    function trunk(g, x, y, s) {
      path(g, null, '#344536', 4 * s, p => { p.moveTo(x, y); p.bezierCurveTo(x + 3 * s, y - 18 * s, x - 4 * s, y - 29 * s, x + 2 * s, y - 49 * s); p.moveTo(x, y - 24 * s); p.lineTo(x - 18 * s, y - 43 * s); p.moveTo(x, y - 32 * s); p.lineTo(x + 21 * s, y - 48 * s); });
    }
    const CANOPY = [[-21, -48, 21, 16], [3, -59, 25, 20], [23, -46, 22, 18], [-5, -39, 27, 16]];
    function smallTree(x, y, s, shade) { trunk(c, x, y, s); CANOPY.forEach(a => ellipse(c, x + a[0] * s, y + a[1] * s, a[2] * s, a[3] * s, shade)); }
    smallTree(X(124), Y(424), .53 * S, '#475b4c'); smallTree(X(155), Y(418), .36 * S, '#4c5e4c'); smallTree(X(268), Y(397), .4 * S, '#465a4a');
    // ---------- Layer 3: hobbit hill, hedge, path, home, fence ----------
    c = layers[3].g;
    const SH = -115, DY = 8, PX = n => X(n + SH), PY = n => Y(n + DY);
    path(c, gradient(c, 0, Y(435), 0, H, dark ? [[0, '#4f6345'], [.7, '#2b4939'], [1, '#1c352e']] : [[0, '#778c50'], [.7, '#526d40'], [1, '#334f35']]), null, 0, p => { p.moveTo(Lm, Y(483)); p.bezierCurveTo(X(173), Y(414), X(279), Y(465), X(410), Y(493)); p.bezierCurveTo(X(548), Y(527), X(589), Y(466), X(744), Y(463)); p.bezierCurveTo(X(881), Y(455), X(921), Y(486), Rm, Y(475)); p.lineTo(Rm, H); p.lineTo(Lm, H); });
    for (let i = 0; i < 5; i++) { const yy = 478 + i * 22; path(c, null, 'rgba(169,177,111,.075)', 1.2 * S, p => { p.moveTo(X(-30), Y(yy)); p.bezierCurveTo(X(100), Y(yy - 39), X(208), Y(yy - 9), X(351), Y(yy + 21)); }); }
    // Hedge along the fence line, built from overlapping leaf lobes.
    const fenceY = x => 545 + (x - 110) * .235;
    {
      const hr = rng(444);
      for (let x = 62; x < 342; x += 5) { const yb = fenceY(x) - 4, rr = (11 + hr() * 8) * S; ellipse(c, X(x), Y(yb) - (9 + hr() * 7) * S, rr, rr * .9, '#2a4231'); }
      for (let x = 66; x < 340; x += 6) { const yb = fenceY(x) - 4, rr = (7 + hr() * 7) * S; ellipse(c, X(x) - 2 * S, Y(yb) - (15 + hr() * 8) * S, rr, rr * .85, hr() > .5 ? '#3a5638' : '#47633f'); }
      for (let i = 0; i < 90; i++) { const x = 66 + hr() * 276, yb = fenceY(x) - 4; ellipse(c, X(x), Y(yb) - (6 + hr() * 26) * S, (1 + hr() * 1.6) * S, (.9 + hr() * 1.1) * S, i % 4 ? '#6f8a50' : '#cbb27a'); }
    }
    // Winding flagstone walk, widened toward the viewer.
    path(c, '#857c62', '#555f46', 2 * S, p => { p.moveTo(PX(773), PY(587)); p.bezierCurveTo(PX(721), PY(602), PX(699), PY(624), PX(625), PY(641)); p.bezierCurveTo(PX(539), PY(664), PX(453), PY(669), PX(386), H); p.lineTo(PX(204), H); p.bezierCurveTo(PX(322), PY(658), PX(491), PY(640), PX(588), PY(627)); p.bezierCurveTo(PX(670), PY(617), PX(710), PY(592), PX(748), PY(585)); });
    const stones = rng(2937);
    for (let i = 0; i < 46; i++) {
      const t = i / 45, yy = 590 + DY + 130 * t, center = 759 + SH - 440 * Math.pow(t, 1.28), spread = 5 + 63 * t, x = center + (stones() - .5) * spread * 1.5, y = yy + (stones() - .5) * 6;
      path(c, i % 3 === 0 ? '#a39a7a' : i % 3 === 1 ? '#928a6c' : '#746f58', 'rgba(52,63,43,.42)', .8 * S, p => { p.moveTo(X(x - 5 - 9 * t), Y(y - 2 - 2 * t)); p.lineTo(X(x + 5 + 9 * t), Y(y - 3)); p.lineTo(X(x + 8 + 9 * t), Y(y + 2 + 3 * t)); p.lineTo(X(x - 6 - 9 * t), Y(y + 3 + 3 * t)); p.closePath(); });
    }
    // Main turf-roofed home (about 1.3x the v1 scale); local coordinates keep door and windows round.
    const hs = Math.min(S * 1.3, W * .00131), hx = W * .63, hy = Y(598), s = hs;
    c.save(); c.translate(hx, hy); c.scale(s, s);
    path(c, '#263d2d', null, 0, p => { p.moveTo(-235, 9); p.bezierCurveTo(-194, -68, -161, -151, -62, -166); p.bezierCurveTo(27, -193, 112, -170, 157, -115); p.bezierCurveTo(198, -70, 201, -24, 248, 16); p.closePath(); });
    path(c, gradient(c, 0, -172, 0, 15, [[0, '#687347'], [.40, '#52633b'], [1, '#324b30']]), null, 0, p => { p.moveTo(-238, 4); p.bezierCurveTo(-178, -79, -177, -133, -64, -155); p.bezierCurveTo(48, -183, 123, -141, 157, -104); p.bezierCurveTo(197, -54, 206, -12, 248, 16); p.bezierCurveTo(121, 29, -141, 24, -238, 4); });
    path(c, '#8e8774', '#414937', 2, p => { p.moveTo(70, -145); p.lineTo(67, -216); p.lineTo(90, -216); p.lineTo(96, -134); p.closePath(); });
    c.fillStyle = '#aaa18b'; c.fillRect(62, -221, 34, 9); c.fillStyle = '#4c5143'; c.fillRect(67, -224, 24, 4);
    for (let i = 0; i < 4; i++) { path(c, null, 'rgba(65,67,53,.44)', 1, p => { p.moveTo(70, -201 + i * 15); p.lineTo(90, -202 + i * 15); }); }
    chimney = { x: hx + 79 * s, y: hy - 224 * s, s };
    path(c, '#5f6147', '#283e2b', 3, p => { p.moveTo(-151, 3); p.bezierCurveTo(-151, -99, -97, -127, -16, -132); p.bezierCurveTo(74, -139, 136, -88, 147, 2); p.closePath(); });
    path(c, gradient(c, 0, -130, 0, 10, [[0, '#b2a47a'], [1, '#8f8965']]), null, 0, p => { p.moveTo(-139, 0); p.bezierCurveTo(-144, -84, -87, -118, -13, -120); p.bezierCurveTo(68, -126, 125, -84, 133, 0); p.closePath(); });
    for (let i = 0; i < 17; i++) { const a = Math.PI + i * Math.PI / 16, x = -4 + 143 * Math.cos(a), y = 1 + 122 * Math.sin(a); c.save(); c.translate(x, y); c.rotate(a + Math.PI / 2); c.fillStyle = i % 3 === 0 ? '#9e9b7c' : '#85866b'; c.fillRect(-9, -7, 17, 13); c.restore(); }
    path(c, null, '#304c30', 10, p => { p.moveTo(-175, -40); p.bezierCurveTo(-153, -112, -85, -141, -15, -139); p.bezierCurveTo(71, -147, 129, -104, 151, -46); });
    const grass = rng(53); for (let i = 0; i < 62; i++) { const x = -176 + grass() * 334, y = -146 + Math.pow((x + 15) / 190, 2) * 84; path(c, null, i % 2 ? '#71804b' : '#4f683b', 1.1, p => { p.moveTo(x, y + 6); p.quadraticCurveTo(x - 1, y, x - 5 + grass() * 10, y - 5 - grass() * 7); }); }
    ellipse(c, -8, -45, 53, 56, '#575e42'); ellipse(c, -8, -45, 47, 50, '#293c2b');
    ellipse(c, -8, -45, 42, 46, gradient(c, -50, -90, 25, 0, [[0, '#66764a'], [.45, '#425d38'], [1, '#294b30']]), '#7d8756', 2);
    c.save(); c.beginPath(); c.ellipse(-8, -45, 40, 44, 0, 0, Math.PI * 2); c.clip();
    for (let x = -42; x < 35; x += 12) { path(c, null, 'rgba(17,41,25,.45)', 1.2, p => { p.moveTo(x, -93); p.lineTo(x, 3); }); path(c, null, 'rgba(174,181,109,.12)', 1, p => { p.moveTo(x + 2, -93); p.lineTo(x + 2, 3); }); } c.restore();
    ellipse(c, 6, -43, 5, 5, '#9f8748', '#d0b56e', 1); ellipse(c, 5, -44, 1.3, 1.3, '#ecd49b');
    path(c, '#b0a17a', '#626a48', 1, p => { p.moveTo(-63, 4); p.lineTo(43, 4); p.lineTo(51, 13); p.lineTo(-69, 13); p.closePath(); });
    // Iron bracket above the door: the lantern itself hangs from here each frame.
    c.fillStyle = '#2f3326'; c.fillRect(-13, -141, 10, 5); ellipse(c, -8, -135, 2.4, 2.4, '#3d4130');
    lantern = { x: hx - 8 * s, y: hy - 133 * s, s };
    windows = [];
    for (const v of [[-101, -55, 18], [91, -54, 19]]) {
      const [x, y, r] = v; ellipse(c, x, y, r + 5, r + 5, '#606746'); ellipse(c, x, y, r + 1, r + 1, '#382f22');
      ellipse(c, x, y, r - 1, r - 1, gradient(c, x, y - r, x, y + r, [[0, '#f2d797'], [.5, '#dca65b'], [1, '#b9803e']]));
      path(c, null, '#625639', 2.5, p => { p.moveTo(x - r, y); p.lineTo(x + r, y); p.moveTo(x, y - r); p.lineTo(x, y + r); });
      path(c, null, '#c2b181', 1, p => { p.arc(x, y, r + 3, Math.PI * 1.05, Math.PI * 1.8); });
      c.fillStyle = '#555a38'; c.fillRect(x - r - 5, y + r + 5, r * 2 + 10, 5);
      windows.push({ x: hx + x * s, y: hy + y * s, r: r * s });
    }
    for (let i = 0; i < 18; i++) { const x = 117 + Math.sin(i * 1.7) * 9, y = -100 + i * 5.4; ellipse(c, x, y, 4, 2.5, i % 2 ? '#3d5734' : '#516a3c'); }
    for (const v of [[-69, 1, 9], [58, 1, 10]]) { path(c, '#896b4d', '#514c34', 1, p => { p.moveTo(v[0] - v[2], v[1] - 12); p.lineTo(v[0] + v[2], v[1] - 12); p.lineTo(v[0] + v[2] * .7, v[1] + 4); p.lineTo(v[0] - v[2] * .7, v[1] + 4); p.closePath(); }); for (let i = 0; i < 5; i++) { ellipse(c, v[0] - 7 + i * 3.5, v[1] - 15 - Math.sin(i), 4, 5, '#526a3c'); } ellipse(c, v[0] - 3, v[1] - 21, 2, 2, '#c2a572'); }
    c.restore();
    // Low split-rail fence, left of the walk and clear of the home.
    const posts = [110, 160, 210, 258, 304].map(x => [x, fenceY(x) + 8]);
    for (let j = 0; j < 2; j++) path(c, null, '#777855', (j ? 3 : 4) * S, p => { posts.forEach((v, i) => i ? p.lineTo(X(v[0]), Y(v[1] - 18 + j * 10)) : p.moveTo(X(v[0]), Y(v[1] - 18 + j * 10))); });
    posts.forEach(v => { path(c, null, '#414d36', 7 * S, p => { p.moveTo(X(v[0]), Y(v[1] + 5)); p.lineTo(X(v[0] - 1), Y(v[1] - 29)); }); path(c, null, '#8b8861', 2 * S, p => { p.moveTo(X(v[0] - 2), Y(v[1] - 27)); p.lineTo(X(v[0] - 1), Y(v[1] + 1)); }); });
    // Static clumps on the upper slope (the lowest 25% is animated).
    const clump = rng(9051);
    for (let i = 0; i < 70; i++) { const x = clump() * 1000, y = 470 + clump() * 70, l = (3 + clump() * 6) * (y / 720); if (x > 350 && x < 990) continue; path(c, null, i % 3 ? 'rgba(108,130,73,.34)' : 'rgba(28,53,36,.6)', .9 * S, p => { p.moveTo(X(x), Y(y)); p.quadraticCurveTo(X(x + 2), Y(y - l * .65), X(x - 3), Y(y - l)); }); }
    // ---------- Layer 4: foreground trunks (canopies are swaying sprites) ----------
    c = layers[4].g;
    trees = [];
    [[67, 505, 1.28, 11], [18, 508, .91, 23], [222, 528, .78, 37]].forEach((tp, ti) => {
      const ts = tp[2] * S, tx = X(tp[0]), ty = Y(tp[1]);
      trunk(c, tx, ty, ts);
      const base = dark ? (ti % 2 ? '#3b5543' : '#2e4639') : (ti % 2 ? '#4b6b42' : '#3c5c3c');
      const ox = 54 * ts, oy = 86 * ts, tr = rng(tp[3] * 101);
      const sp = sprite(108 * ts, 68 * ts, dpr, g => {
        CANOPY.forEach(a => ellipse(g, ox + a[0] * ts, oy + a[1] * ts, a[2] * ts, a[3] * ts, base));
        CANOPY.forEach(a => ellipse(g, ox + a[0] * ts - a[2] * ts * .12, oy + a[1] * ts - a[3] * ts * .22, a[2] * ts * .8, a[3] * ts * .62, dark ? 'rgba(120,150,110,.14)' : 'rgba(170,200,120,.22)'));
        CANOPY.forEach(a => ellipse(g, ox + a[0] * ts + a[2] * ts * .1, oy + a[1] * ts + a[3] * ts * .45, a[2] * ts * .78, a[3] * ts * .42, 'rgba(16,36,30,.22)'));
        for (let i = 0; i < 40; i++) { const a = CANOPY[i % 4], ang = tr() * 6.28, rr = Math.sqrt(tr()); ellipse(g, ox + a[0] * ts + Math.cos(ang) * a[2] * ts * .9 * rr, oy + a[1] * ts + Math.sin(ang) * a[3] * ts * .9 * rr, (1.2 + tr() * 1.8) * ts, (1 + tr() * 1.3) * ts, i % 3 ? (dark ? 'rgba(135,165,105,.34)' : 'rgba(190,215,130,.4)') : 'rgba(20,44,34,.4)'); }
      });
      trees.push({ x: tx, y: ty - 40 * ts, ox, oy: oy - 40 * ts, sp, ph: ti * 1.9 + .6, wob: 1 - ti * .12 });
    });
    vignette = c.createRadialGradient(W * .52, H * .45, W * .12, W * .52, H * .45, Math.max(W, H) * .76);
    vignette.addColorStop(0, 'rgba(10,24,24,0)'); vignette.addColorStop(.65, 'rgba(10,24,24,.03)'); vignette.addColorStop(1, 'rgba(10,24,24,.40)');
    // ---------- Overlay data & sprites ----------
    spr.glow = radialSprite(96, '255,205,120', [[0, .9], [.35, .38], [1, 0]]);
    spr.puff = radialSprite(48, '211,207,190', [[0, .95], [.5, .5], [1, 0]]);
    spr.fly = radialSprite(32, '226,214,130', [[0, 1], [.3, .45], [1, 0]]);
    // Clouds: soft elongated sprites tinted by the sky.
    const cdefs = [[.05, .25, .0042, .10, .50], [.10, .21, .0071, .55, .46], [.17, .30, .0030, .82, .44], [.25, .28, .0055, .28, .40], [.32, .24, .0088, .68, .42], [.21, .19, .0049, .96, .38]];
    clouds = cdefs.map((d, i) => {
      const w = Math.max(120, W * d[1]), h = w * .22, r = rng(70 + i * 17), n = 7 + Math.floor(r() * 4);
      const body = dark ? '124,133,163' : '255,250,238', under = dark ? '66,74,104' : '204,188,160', rim = dark ? '226,229,246' : '255,255,250';
      const puffs = []; for (let k = 0; k < n; k++) { const u = (k + .5) / n; puffs.push({ cx: w * (.10 + .80 * u) + (r() - .5) * w * .04, cy: h * (.64 - .16 * Math.sin(Math.PI * u) * (.6 + .4 * r())), rx: w * (.09 + .07 * r()), ry: h * (.30 + .22 * r() * Math.sin(Math.PI * u) + .08) }); }
      const sp = sprite(w, h, 1, g => { puffs.forEach(q => blob(g, q.cx, q.cy + q.ry * .22, q.rx * 1.05, q.ry, under, .34)); puffs.forEach(q => blob(g, q.cx, q.cy, q.rx, q.ry, body, .55)); puffs.forEach(q => blob(g, q.cx - q.rx * .14, q.cy - q.ry * .36, q.rx * .76, q.ry * .5, rim, dark ? .42 : .55)); });
      return { y: d[0], w, h, v: d[2], x0: d[3], a: d[4] * (dark ? 1 : 1.15), sp, p: i * 1.7 };
    });
    // Valley mist: two soft sprites, three bands.
    {
      const mw = W * .95, mh = Math.max(40, 100 * S), rgb = dark ? '176,186,205' : '250,240,214';
      const make = seed => { const rr = rng(seed); return sprite(mw, mh, 1, g => { for (let i = 0; i < 12; i++) blob(g, mw * (.08 + .84 * rr()), mh * (.5 + .18 * (rr() - .5)), mw * (.09 + .10 * rr()), mh * (.14 + .22 * rr()), rgb, .55); }); };
      const a = make(31), b = make(97);
      mists = [{ sp: a, y: 462, v: .0075, x0: .1, a: 1, sy: 1 }, { sp: b, y: 436, v: -.0052, x0: .62, a: .8, sy: .9 }, { sp: a, y: 480, v: .0105, x0: .85, a: .75, sy: 1.15 }];
    }
    // Stars: individually twinkling points in the upper sky (night only).
    stars = [];
    if (dark) for (let i = 0; i < 96; i++) { const x = S0() * W, y = S0() * H * .40, bright = S0() < .12, r0 = S0(), b0 = S0(), sp0 = S0(), ph0 = S0(); if (Math.hypot(x - mx, y - my) < mr * 4.5) continue; stars.push({ x, y, r: (bright ? 1.05 : .45 + r0 * .55) * Math.max(.7, S), b: bright ? .85 : .28 + b0 * .5, sp: .6 + sp0 * 2.6, ph: ph0 * 6.28, big: bright }); }
    // Fireflies cluster near the path and the hedge; butterflies and birds by day.
    flies = []; butterflies = []; birds = [];
    const fr = rng(4242), pathPt = t => [759 + SH - 440 * Math.pow(t, 1.28), 590 + DY + 130 * t];
    if (dark) {
      for (let i = 0; i < 28; i++) {
        let ax, ay; const g = i % 14;
        if (g < 5) { const q = pathPt(.12 + fr() * .8); ax = q[0] + (fr() - .5) * 60; ay = q[1] - 6 - fr() * 24; } else if (g < 12) { ax = 90 + fr() * 250; ay = fenceY(ax) - 10 - fr() * 38; } else { ax = 560 + fr() * 380; ay = 610 + fr() * 90; }
        flies.push({ ax: X(ax), ay: Y(ay), r1: (16 + fr() * 28) * S, r2: (6 + fr() * 14) * S, w1: .18 + fr() * .26, w2: .5 + fr() * .5, p1: fr() * 6.28, p2: fr() * 6.28, p3: fr() * 6.28, pw: .5 + fr() * .7, pp: fr() * 6.28, sz: (8 + fr() * 5) * Math.max(.7, S) });
      }
    } else {
      const cols = ['245,232,190', '233,190,80', '196,212,232', '240,170,140', '250,250,244'];
      for (let i = 0; i < 10; i++) butterflies.push({ ax: X(60 + fr() * 880), ay: Y(560 + fr() * 130), r1: (40 + fr() * 70) * S, r2: (16 + fr() * 20) * S, w1: .16 + fr() * .18, w2: .45 + fr() * .4, p1: fr() * 6.28, p2: fr() * 6.28, fp: 7 + fr() * 4, c: cols[i % cols.length], sz: (3 + fr() * 1.6) * Math.max(.7, S) });
      [[.34, .0105, .1], [.27, .0075, .45], [.08, .0092, .7], [.38, .0125, .9]].forEach((b, i) => birds.push({ y: b[0], v: b[1], x0: b[2], ph: i * 1.3, sz: (6 + i % 2 * 2) * Math.max(.7, S) }));
    }
    // Animated blades in the lowest 25% of the canvas (batched in draw).
    {
      const br = rng(731), list = [[], [], []]; bladeFlowers = []; let n = 0, guard = 0;
      while (n < 126 && guard++ < 2000) {
        const xu = br() * 1000, yu = 540 + br() * (186 + DY), cy = Y(yu), r1 = br(), r2 = br(), r3 = br();
        const pathX = 759 + SH - 440 * Math.pow(Math.max(0, (yu - 590 - DY) / 130), 1.28);
        if (yu > 598 && Math.abs(xu - pathX) < 10 + (yu - 598) * .65) continue;
        if (xu > 340 && yu < 630) continue;
        const k = n % 3, l = (5 + r1 * 13) * (.65 + .45 * yu / 720) * S * 1.25;
        list[k].push({ x: X(xu), y: cy, l, lean: (r2 - .5) * 4 * S, ph: r3 * 6.28, fl: n % 9 === 0 ? (n % 2 ? 0 : 1) : -1 }); n++;
      }
      for (let i = 0; i < 20; i++) { const r1 = br(), r2 = br(), r3 = br(); list[0].push({ x: X(i * 52 + r1 * 40), y: H + 3 * S, l: (22 + r2 * 24) * S, lean: (r3 - .5) * 5 * S, ph: r1 * 6.28, fl: -1 }); }
      blades = list;
    }
    staticBuilds++;
  }
  function draw(timeSeconds) {
    if (destroyed || !width || !height) return;
    const t = Number.isFinite(timeSeconds) ? timeSeconds : (fixed === null ? elapsed : fixed);
    const dark = options.dark !== false, W = width, H = height, S = sc;
    if (parallaxOn()) { ptrCur += (ptrTarget - ptrCur) * .14; if (Math.abs(ptrTarget - ptrCur) < .0005) ptrCur = ptrTarget; } else { ptrCur = ptrTarget = 0; }
    const off = layers.map(l => Math.round(-ptrCur * amp * l.f * dpr) / dpr);
    const blit = i => { const l = layers[i]; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(l.cv, -padPx + Math.round(off[i] * dpr), l.topPx); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    blit(0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const o0 = off[0], o1 = off[1], o2 = off[2], o3 = off[3], o4 = off[4];
    // Twinkling stars and a shooting star roughly every 14 s (night only).
    if (dark) {
      ctx.fillStyle = '#f6ead5';
      for (let i = 0; i < stars.length; i++) { const q = stars[i], tw = .5 + .5 * Math.sin(t * q.sp + q.ph), a = q.b * (.25 + .75 * tw * tw); ctx.globalAlpha = a; ctx.fillRect(q.x + o0 - q.r, q.y - q.r, q.r * 2, q.r * 2); if (q.big && tw > .7) { ctx.globalAlpha = a * .5; ctx.fillRect(q.x + o0 - q.r * 4, q.y - .4, q.r * 8, .8); ctx.fillRect(q.x + o0 - .4, q.y - q.r * 4, .8, q.r * 8); } }
      ctx.globalAlpha = 1;
      const k = Math.floor(t / 14), ph = t - k * 14, hr = rng(k * 7919 + 13), s0 = 3 + hr() * 8, dur = 1.1;
      if (ph >= s0 && ph <= s0 + dur) {
        const u = (ph - s0) / dur, left = hr() < .5, sx = (left ? .04 + .20 * hr() : .96 - .20 * hr()) * W, sy = (.04 + .12 * hr()) * H, ang = .35 + .25 * hr(), dir = left ? 1 : -1, len = W * .24;
        const e = 1 - Math.pow(1 - u, 2), hx2 = sx + dir * Math.cos(ang) * len * e + o0, hy2 = sy + Math.sin(ang) * len * e, tl = W * .075 * Math.sin(Math.PI * u) + 4, tx2 = hx2 - dir * Math.cos(ang) * tl, ty2 = hy2 - Math.sin(ang) * tl;
        const g = ctx.createLinearGradient(tx2, ty2, hx2, hy2); g.addColorStop(0, 'rgba(255,246,222,0)'); g.addColorStop(1, 'rgba(255,248,230,' + (.95 * Math.sin(Math.PI * Math.min(1, u * 1.2 + .1))) + ')');
        ctx.strokeStyle = g; ctx.lineWidth = Math.max(1.2, 1.7 * S); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(tx2, ty2); ctx.lineTo(hx2, hy2); ctx.stroke();
        ctx.globalAlpha = .9; ellipse(ctx, hx2, hy2, 1.6 * S + .6, 1.6 * S + .6, '#fff7e0'); ctx.globalAlpha = 1;
      }
    }
    // Drifting clouds, faded where they cross the central title zone.
    for (let i = 0; i < clouds.length; i++) {
      const cl = clouds[i], span = W + cl.w * 1.3, x = ((cl.x0 * span + t * cl.v * W) % span + span) % span - cl.w * .65, y = cl.y * H + Math.sin(t * .05 + cl.p) * 3;
      const cx = (x + cl.w / 2) / W, cyf = (y + cl.h / 2) / H;
      const zone = ss(.24, .36, cx) * (1 - ss(.64, .76, cx)) * ss(.06, .12, cyf) * (1 - ss(.28, .34, cyf));
      ctx.globalAlpha = cl.a * (1 - .82 * zone); ctx.drawImage(cl.sp.cv, x + o0 * 1.4, y, cl.w, cl.h);
    }
    ctx.globalAlpha = 1;
    // Tiny daytime birds crossing slowly.
    if (!dark && birds.length) {
      ctx.strokeStyle = 'rgba(66,76,82,.7)'; ctx.lineWidth = Math.max(1, 1.1 * S); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
      for (let i = 0; i < birds.length; i++) {
        const b = birds[i], span = W + 160, x = ((b.x0 * span + t * b.v * W) % span + span) % span - 80 + o0, y = b.y * H + Math.sin(t * .6 + b.ph) * 5, f = Math.sin(t * 6 + b.ph * 3) * b.sz * .55, sz = b.sz;
        ctx.moveTo(x - sz, y - f); ctx.quadraticCurveTo(x - sz * .45, y - f * .2 - sz * .35, x, y); ctx.quadraticCurveTo(x + sz * .45, y - f * .2 - sz * .35, x + sz, y - f);
      }
      ctx.stroke();
    }
    blit(1);
    // Windmill sails turn slowly (tower is on the cached far layer).
    if (mill) {
      ctx.save(); ctx.translate(mill.x + o1, mill.y); ctx.rotate(t * .33);
      const r = mill.r, ms = mill.ms;
      ctx.strokeStyle = dark ? '#2f3448' : '#4b5854'; ctx.fillStyle = dark ? 'rgba(48,53,74,.62)' : 'rgba(86,100,94,.55)'; ctx.lineWidth = Math.max(1, 1.5 * ms); ctx.lineCap = 'round';
      ctx.beginPath(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca, q = (d, w) => [ca * d * r + nx * w * ms, sa * d * r + ny * w * ms]; const p1 = q(.2, 1.5), p2 = q(.96, 1.5), p3 = q(.96, 8), p4 = q(.2, 8); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p3[0], p3[1]); ctx.lineTo(p4[0], p4[1]); ctx.closePath(); }
      ctx.fill(); ellipse(ctx, 0, 0, 2.6 * ms, 2.6 * ms, dark ? '#2a2e40' : '#444f4c'); ctx.restore();
    }
    blit(2);
    // Low valley mist rolling across the mid-hill base.
    {
      const base = dark ? .20 : .06;
      for (let i = 0; i < mists.length; i++) {
        const m = mists[i], sw = m.sp.w, span = W + sw, x = (((m.x0 * span + t * m.v * W) % span) + span) % span - sw + o2, h = m.sp.h * m.sy;
        ctx.globalAlpha = base * m.a * (.75 + .25 * Math.sin(t * .13 + i * 2)); ctx.drawImage(m.sp.cv, x, m.y * H / 720 - h / 2, sw, h);
      }
      ctx.globalAlpha = 1;
    }
    blit(3);
    // Home: window glow flicker, swaying lantern, thickening chimney smoke.
    const flick = i => .025 * Math.sin(t * 11 + i * 3) * Math.sin(t * 3.3 + i) + .02 * Math.sin(t * 17.3 + i * 1.7);
    windows.forEach((w, i) => { const pulse = (dark ? .17 : .06) + .035 * Math.sin(t * .8 + i * 2) + .018 * Math.sin(t * 2.1) + flick(i); ctx.globalAlpha = Math.max(0, pulse * 2.4); const R = w.r * 3; ctx.drawImage(spr.glow.cv, w.x + o3 - R, w.y - R, R * 2, R * 2); });
    ctx.globalAlpha = 1;
    if (lantern) {
      const { x, y, s } = lantern, lf = .72 + .13 * Math.sin(t * 9.7) + .08 * Math.sin(t * 15.3 + 1) + .06 * Math.sin(t * 3.1), ang = .07 * Math.sin(t * 1.25) + .03 * Math.sin(t * 2.9 + 1) + .02 * Math.sin(t * .4);
      ctx.save(); ctx.translate(x + o3, y); ctx.scale(s, s); ctx.rotate(ang);
      ctx.strokeStyle = '#2a2c22'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 10); ctx.stroke();
      ctx.fillStyle = '#2b2a20'; ctx.beginPath(); ctx.moveTo(-8, 15); ctx.lineTo(-3, 9.5); ctx.lineTo(3, 9.5); ctx.lineTo(8, 15); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,208,120,' + Math.min(1, (dark ? .95 : .72) * lf + .1) + ')'; ctx.fillRect(-6, 15, 12, 19);
      ctx.fillStyle = 'rgba(255,244,196,' + (.9 * lf) + ')'; ctx.beginPath(); ctx.ellipse(0, 26, 2.2, 5.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2b2a20'; ctx.lineWidth = 1.6; ctx.strokeRect(-6, 15, 12, 19); ctx.beginPath(); ctx.moveTo(0, 15); ctx.lineTo(0, 34); ctx.stroke();
      ctx.fillStyle = '#2b2a20'; ctx.fillRect(-8, 34, 16, 3);
      ctx.restore();
      const gx = x + o3 - Math.sin(ang) * 25 * s, gy = y + Math.cos(ang) * 25 * s, GR = 62 * s;
      ctx.globalAlpha = (dark ? .62 : .22) * lf; ctx.drawImage(spr.glow.cv, gx - GR, gy - GR, GR * 2, GR * 2); ctx.globalAlpha = 1;
    }
    if (chimney) {
      const { x, y, s } = chimney, thick = .8 + .35 * (.5 + .5 * Math.sin(t * .09)) + .15 * (Math.sin(t * .31) * .5 + .5);
      for (let i = 0; i < 10; i++) {
        const age = ((t * .085 + i / 10) % 1 + 1) % 1, drift = Math.sin(age * 4 + t * .18) * 12 * age, sx = x + o3 + (drift - age * 19) * s, sy = y - age * 125 * s, r = (6 + age * 22 * (.9 + .25 * thick)) * s;
        ctx.globalAlpha = Math.min(.5, .16 * Math.sin(Math.PI * age) * thick * (1 - age * .25)); ctx.drawImage(spr.puff.cv, sx - r, sy - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
    }
    // Fireflies (night): lazy loops, soft pulse, short fading trail.
    for (let i = 0; i < flies.length; i++) {
      const f = flies[i], pulse = .12 + .88 * Math.pow(.5 + .5 * Math.sin(t * f.pw + f.pp), 2.2);
      for (let k = 3; k >= 0; k--) {
        const tt = t - k * .13, x = f.ax + Math.sin(tt * f.w1 + f.p1) * f.r1 + Math.sin(tt * f.w2 + f.p2) * f.r2 + o3, y = f.ay + Math.cos(tt * f.w1 * 1.3 + f.p3) * f.r1 * .45 + Math.sin(tt * f.w2 * .8 + f.p1) * f.r2 * .6;
        const z = f.sz * (k ? .72 - k * .12 : 1); ctx.globalAlpha = Math.min(1, pulse * (k ? .34 / k : .95)); ctx.drawImage(spr.fly.cv, x - z, y - z, z * 2, z * 2);
        if (!k) { ctx.globalAlpha = Math.min(1, pulse); ctx.fillStyle = '#fff2b0'; ctx.fillRect(x - .8 * S - .2, y - .8 * S - .2, 1.6 * S + .4, 1.6 * S + .4); }
      }
    }
    ctx.globalAlpha = 1;
    // Butterflies (day).
    for (let i = 0; i < butterflies.length; i++) {
      const b = butterflies[i], x = b.ax + Math.sin(t * b.w1 + b.p1) * b.r1 + Math.sin(t * b.w2 + b.p2) * b.r2 + o3, y = b.ay + Math.cos(t * b.w1 * 1.4 + b.p2) * b.r1 * .35 + Math.sin(t * b.fp * .5 + b.p1) * 2.5 * S;
      const fl = .2 + .8 * Math.abs(Math.sin(t * b.fp + b.p1)), wd = b.sz * fl;
      ctx.fillStyle = 'rgb(' + b.c + ')'; ctx.globalAlpha = .92; ctx.beginPath(); ctx.ellipse(x - wd * .55, y - b.sz * .25, wd, b.sz * .78, -.4, 0, Math.PI * 2); ctx.ellipse(x + wd * .55, y - b.sz * .25, wd, b.sz * .78, .4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = .75; ctx.fillStyle = '#4a4636'; ctx.fillRect(x - .5, y - b.sz * .55, 1, b.sz * 1.1);
    }
    ctx.globalAlpha = 1;
    blit(4);
    // Foreground: swaying canopy sprites, then wind-swept blades (3 batched strokes).
    const gust = .6 + .4 * Math.sin(t * .21);
    for (let i = 0; i < trees.length; i++) {
      const tr = trees[i], a = (Math.sin(t * .9 + tr.ph) * .011 + Math.sin(t * .37 - tr.x * .004) * .011 * gust) * tr.wob, sk = Math.sin(t * .75 + tr.ph + 1.2) * .03 * tr.wob * (.6 + .4 * gust);
      ctx.save(); ctx.translate(tr.x + o4, tr.y); ctx.rotate(a); ctx.transform(1, 0, sk, 1, 0, 0); ctx.drawImage(tr.sp.cv, -tr.ox, -tr.oy, tr.sp.w, tr.sp.h); ctx.restore();
    }
    const styles = ['rgba(24,48,34,.82)', 'rgba(112,134,76,.62)', 'rgba(52,84,50,.72)'], widths = [1.5, 1.2, 1.35];
    bladeFlowers.length = 0; ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      ctx.beginPath(); const arr = blades[k];
      for (let i = 0; i < arr.length; i++) {
        const b = arr[i], u = b.x / W, wave = Math.sin(t * 1.45 - u * 14 + b.ph * .15) * .6 + Math.sin(t * .8 - u * 5 + 1.3) * .4, dx = wave * (.5 + .5 * gust) * b.l * .42 + b.lean;
        ctx.moveTo(b.x + o4, b.y); ctx.quadraticCurveTo(b.x + o4 + dx * .35, b.y - b.l * .65, b.x + o4 + dx, b.y - b.l);
        if (b.fl >= 0) bladeFlowers.push(b.x + o4 + dx, b.y - b.l, b.fl);
      }
      ctx.strokeStyle = styles[k]; ctx.lineWidth = widths[k] * Math.max(.8, S); ctx.stroke();
    }
    for (let fc = 0; fc < 2; fc++) { ctx.beginPath(); for (let i = 0; i < bladeFlowers.length; i += 3) if (bladeFlowers[i + 2] === fc) { ctx.moveTo(bladeFlowers[i] + 1.8 * S, bladeFlowers[i + 1]); ctx.arc(bladeFlowers[i], bladeFlowers[i + 1], 1.8 * S + .3, 0, Math.PI * 2); } ctx.fillStyle = fc ? '#c5ab77' : '#cfc09a'; ctx.fill(); }
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);
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
  // No pointer/mouse tracking exists in this scene: layers never shift with the cursor.
  function parallaxOn() { return false; }
  function shouldRun() { return !destroyed && !doc.hidden && motion && fixed === null; }
  function tick(timestamp) { raf = 0; if (!shouldRun()) return; if (lastTick !== null) elapsed += Math.max(0, Math.min(.2, (timestamp - lastTick) / 1000)); lastTick = timestamp; if (timestamp - lastFrame >= 1000 / maxFPS) { lastFrame = timestamp; draw(elapsed); } raf = win.requestAnimationFrame(tick); }
  function sync() { if (raf) win.cancelAnimationFrame(raf); raf = 0; lastTick = null; lastFrame = -Infinity; if (shouldRun()) raf = win.requestAnimationFrame(tick); else if (!doc.hidden) draw(); }
  function visibility() { sync(); }
  function preference() { motion = options.motion !== false && !(media && media.matches); if (!motion) { ptrCur = ptrTarget = 0; } sync(); }
  function onResize() { resize(false); }
  let observer = null;
  function destroy() {
    if (destroyed) return; destroyed = true; if (raf) win.cancelAnimationFrame(raf); raf = 0;
    if (observer) observer.disconnect(); observer = null;
    doc.removeEventListener('visibilitychange', visibility); win.removeEventListener('resize', onResize);
    if (media) { if (media.removeEventListener) media.removeEventListener('change', preference); else if (media.removeListener) media.removeListener(preference); }
    layers.forEach(l => { l.cv.width = 1; l.cv.height = 1; }); sprites.forEach(s => { s.cv.width = 1; s.cv.height = 1; });
    windows = []; chimney = null; lantern = null; mill = null; stars = []; clouds = []; mists = []; flies = []; butterflies = []; birds = []; blades = [[], [], []]; bladeFlowers = []; trees = []; sprites = []; spr = {}; vignette = null; ptrCur = ptrTarget = 0;
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
