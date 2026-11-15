/* Middle-earth Themes for Hermes Desktop.
 * One plugin, four themes (Shire, Rivendell, Moria, Lothlorien). Each theme paints its own
 * original Canvas2D scene behind the app; only the active theme's scene runs.
 * The whole-window approach is informed by Borealis (MIT), https://github.com/Adolanium/hermes-borealis
 * See THIRD-PARTY-NOTICES.txt. No network, tools, permissions, telemetry, mouse tracking,
 * or conversation-content reads. Not affiliated with the Tolkien Estate or any studio.
 *
 * GENERATED FILE: edit src/ and themes/, then run `python3 tools/build.py`.
 */
/* ───── scene: shire-hearth ───── */
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

/* ───── scene: rivendell-vale ───── */
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

/* ───── scene: moria-gate ───── */
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

/* ───── scene: lothlorien-glade ───── */
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

import { THEMES_AREA } from '@hermes/plugin-sdk'

const FONT_FAMILY = '"Middle-earth Decorative"'
// Two voices: the assistant reads in a book serif (system fonts, nothing to download), while your own
// messages and the text box keep the app's clean sans. Code stays monospace everywhere.
const ASSISTANT_FONT = '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif'
const FONT_CSS = "@font-face{font-family:'Middle-earth Decorative';src:url(data:font/woff2;base64,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) format('woff2');font-style:normal;font-weight:400;font-display:swap}"
const THEME_DATA = [
  {
    "name": "shire-hearth",
    "label": "The Shire · Hearth & Hills",
    "description": "Rolling green hills, a round green door, chimney smoke, a turning windmill and fireflies. Twilight in dark mode, bright morning in light mode.",
    "quotes": [
      "Not all those who wander are lost.",
      "It's a dangerous business, Frodo, going out your door.",
      "All we have to decide is what to do with the time that is given us.",
      "Where there's life there's hope, as my Gaffer says.",
      "Short cuts make long delays."
    ],
    "colors": {
      "background": "#f1ead9",
      "foreground": "#233b2c",
      "card": "#faf4e5",
      "cardForeground": "#233b2c",
      "muted": "#e4ddc9",
      "mutedForeground": "#52634f",
      "popover": "#fbf5e7",
      "popoverForeground": "#233b2c",
      "primary": "#326a42",
      "primaryForeground": "#fff7e2",
      "secondary": "#e0dfca",
      "secondaryForeground": "#233b2c",
      "accent": "#d7dfc7",
      "accentForeground": "#233b2c",
      "border": "#c8c3a6",
      "input": "#c2c5a6",
      "ring": "#326a42",
      "midground": "#326a42",
      "midgroundForeground": "#fff7e2",
      "composerRing": "#326a42",
      "destructive": "#b73b34",
      "destructiveForeground": "#fff7e2",
      "sidebarBackground": "#ece6d4",
      "sidebarBorder": "#ccc8ae",
      "userBubble": "#e3dfcb",
      "userBubbleBorder": "#c8c3a6"
    },
    "darkColors": {
      "background": "#0d1b15",
      "foreground": "#f0e6ce",
      "card": "#16291e",
      "cardForeground": "#f0e6ce",
      "muted": "#203326",
      "mutedForeground": "#b4bda3",
      "popover": "#1c3023",
      "popoverForeground": "#f0e6ce",
      "primary": "#dbbc7c",
      "primaryForeground": "#162315",
      "secondary": "#243c2b",
      "secondaryForeground": "#f0e6ce",
      "accent": "#2e4931",
      "accentForeground": "#f0e6ce",
      "border": "#41513a",
      "input": "#40513b",
      "ring": "#dbbc7c",
      "midground": "#dbbc7c",
      "midgroundForeground": "#162315",
      "composerRing": "#dbbc7c",
      "destructive": "#f39386",
      "destructiveForeground": "#2c1410",
      "sidebarBackground": "#101e16",
      "sidebarBorder": "#34452f",
      "userBubble": "#223a29",
      "userBubbleBorder": "#41513a"
    }
  },
  {
    "name": "rivendell-vale",
    "label": "Rivendell · The Last Homely House",
    "description": "A hidden Elven valley: a waterfall, graceful terraces and bridges, falling autumn leaves and warm lanterns.",
    "quotes": [
      "The Road goes ever on and on.",
      "Roads go ever ever on, over rock and under tree."
    ],
    "colors": {
      "background": "#f6e6c0",
      "foreground": "#3a2618",
      "primary": "#9a4a1c",
      "mutedForeground": "#6b5440",
      "border": "#d9bb80",
      "card": "#fbf0d6",
      "cardForeground": "#3a2618",
      "muted": "#eddcb8",
      "popover": "#eedeb9",
      "popoverForeground": "#3a2618",
      "primaryForeground": "#fbf6e8",
      "secondary": "#ebd3ac",
      "secondaryForeground": "#3a2618",
      "accent": "#e9d0a9",
      "accentForeground": "#3a2618",
      "input": "#dfcfac",
      "ring": "#9a4a1c",
      "midground": "#9a4a1c",
      "midgroundForeground": "#fbf6e8",
      "composerRing": "#9a4a1c",
      "destructive": "#b73b34",
      "destructiveForeground": "#fbf6e8",
      "sidebarBackground": "#efdfba",
      "sidebarBorder": "#d9bb80",
      "userBubble": "#edd6b0",
      "userBubbleBorder": "#d9bb80"
    },
    "darkColors": {
      "background": "#161c3e",
      "foreground": "#f1e6cf",
      "primary": "#e8ba60",
      "mutedForeground": "#b4aecb",
      "border": "#3b3d70",
      "card": "#1e2550",
      "cardForeground": "#f1e6cf",
      "muted": "#282c4a",
      "popover": "#2a2e4b",
      "popoverForeground": "#f1e6cf",
      "primaryForeground": "#14120d",
      "secondary": "#403c45",
      "secondaryForeground": "#f1e6cf",
      "accent": "#4d4547",
      "accentForeground": "#f1e6cf",
      "input": "#353852",
      "ring": "#e8ba60",
      "midground": "#e8ba60",
      "midgroundForeground": "#14120d",
      "composerRing": "#e8ba60",
      "destructive": "#f39386",
      "destructiveForeground": "#14120d",
      "sidebarBackground": "#121733",
      "sidebarBorder": "#3b3d70",
      "userBubble": "#2f2f42",
      "userBubbleBorder": "#3b3d70"
    }
  },
  {
    "name": "moria-gate",
    "label": "Moria · The Western Gate",
    "description": "Starlit doors of stone beside a black lake: silver ithildin glow, rising embers and slow ripples.",
    "quotes": [
      "Speak, friend, and enter.",
      "Fly, you fools!"
    ],
    "colors": {
      "background": "#d3d9e0",
      "foreground": "#1b2536",
      "primary": "#2f568c",
      "mutedForeground": "#46556b",
      "border": "#a9b3c0",
      "card": "#e2e6eb",
      "cardForeground": "#1b2536",
      "muted": "#cad0d8",
      "popover": "#ccd2d9",
      "popoverForeground": "#1b2536",
      "primaryForeground": "#fbf6e8",
      "secondary": "#bfc9d6",
      "secondaryForeground": "#1b2536",
      "accent": "#bcc7d4",
      "accentForeground": "#1b2536",
      "input": "#bdc3cc",
      "ring": "#2f568c",
      "midground": "#2f568c",
      "midgroundForeground": "#fbf6e8",
      "composerRing": "#2f568c",
      "destructive": "#b73b34",
      "destructiveForeground": "#fbf6e8",
      "sidebarBackground": "#cdd2d9",
      "sidebarBorder": "#a9b3c0",
      "userBubble": "#c3ccd8",
      "userBubbleBorder": "#a9b3c0"
    },
    "darkColors": {
      "background": "#0a1020",
      "foreground": "#dbe6f5",
      "primary": "#9cc3ff",
      "mutedForeground": "#8b9fc0",
      "border": "#24324f",
      "card": "#101a2e",
      "cardForeground": "#dbe6f5",
      "muted": "#1b2131",
      "popover": "#1d2333",
      "popoverForeground": "#dbe6f5",
      "primaryForeground": "#14120d",
      "secondary": "#27344d",
      "secondaryForeground": "#dbe6f5",
      "accent": "#303f5a",
      "accentForeground": "#dbe6f5",
      "input": "#272e3e",
      "ring": "#9cc3ff",
      "midground": "#9cc3ff",
      "midgroundForeground": "#14120d",
      "composerRing": "#9cc3ff",
      "destructive": "#f39386",
      "destructiveForeground": "#14120d",
      "sidebarBackground": "#080d1a",
      "sidebarBorder": "#24324f",
      "userBubble": "#1c253b",
      "userBubbleBorder": "#24324f"
    }
  },
  {
    "name": "lothlorien-glade",
    "label": "Lothlórien · The Golden Wood",
    "description": "Towering mallorn trees, silver lanterns, drifting golden leaves and floating motes of light.",
    "quotes": [
      "Still round the corner there may wait a new road or a secret gate.",
      "I will take the Ring, though I do not know the way."
    ],
    "colors": {
      "background": "#f2efcb",
      "foreground": "#2b4325",
      "primary": "#7a5d0c",
      "mutedForeground": "#55633f",
      "border": "#c9c48f",
      "card": "#faf7dc",
      "cardForeground": "#2b4325",
      "muted": "#e8e6c3",
      "popover": "#eae8c4",
      "popoverForeground": "#2b4325",
      "primaryForeground": "#fbf6e8",
      "secondary": "#e4ddb4",
      "secondaryForeground": "#2b4325",
      "accent": "#e1dbb0",
      "accentForeground": "#2b4325",
      "input": "#dadab7",
      "ring": "#7a5d0c",
      "midground": "#7a5d0c",
      "midgroundForeground": "#fbf6e8",
      "composerRing": "#7a5d0c",
      "destructive": "#b73b34",
      "destructiveForeground": "#fbf6e8",
      "sidebarBackground": "#ebe8c5",
      "sidebarBorder": "#c9c48f",
      "userBubble": "#e6e0b8",
      "userBubbleBorder": "#c9c48f"
    },
    "darkColors": {
      "background": "#0d2023",
      "foreground": "#f1e8c9",
      "primary": "#e2c566",
      "mutedForeground": "#a9b8ae",
      "border": "#2d4b47",
      "card": "#132a2c",
      "cardForeground": "#f1e8c9",
      "muted": "#1f3030",
      "popover": "#223232",
      "popoverForeground": "#f1e8c9",
      "primaryForeground": "#14120d",
      "secondary": "#384130",
      "secondaryForeground": "#f1e8c9",
      "accent": "#444b34",
      "accentForeground": "#f1e8c9",
      "input": "#2d3c3a",
      "ring": "#e2c566",
      "midground": "#e2c566",
      "midgroundForeground": "#14120d",
      "composerRing": "#e2c566",
      "destructive": "#f39386",
      "destructiveForeground": "#14120d",
      "sidebarBackground": "#0b1a1d",
      "sidebarBorder": "#2d4b47",
      "userBubble": "#27342b",
      "userBubbleBorder": "#2d4b47"
    },
    "sidebarScrim": 0.84
  }
]
const MAKERS = {
  'shire-hearth': createShireScene,
  'rivendell-vale': createRivendellScene,
  'moria-gate': createMoriaScene,
  'lothlorien-glade': createLothlorienScene
}

const makeCSS = (name, scrim = 0.64, veilLight = '#ffffff', veilDark = '#000000') => {
  const T = `:root:is([data-hermes-theme="${name}"], [data-hermes-theme^="${name}-accent-"])`
  return `
${FONT_CSS}
${T} {
  isolation: isolate;
  background-color: var(--ui-bg-chrome) !important;
  --ui-chat-surface-background: transparent !important;
  --ui-sidebar-surface-background: transparent !important;
  --ui-editor-surface-background: transparent !important;
  --ui-terminal-surface-background: var(--ui-bg-chrome);
  --me-rule: color-mix(in srgb, var(--theme-midground) 30%, transparent);
  --me-halo: color-mix(in srgb, var(--ui-bg-chrome) 82%, transparent);
}
${T} body, ${T} #root, ${T} [data-contrib-shell], ${T} [data-slot="sidebar-wrapper"],
${T} [data-slot="sidebar"], ${T} [data-slot="sidebar-inner"], ${T} [data-slot="bots-roster"],
${T} [data-chat-surface], ${T} [data-slot="composer-bounds"], ${T} [data-slot="aui_thread-viewport"] {
  background-color: transparent !important;
  background-image: none !important;
}
${T} [data-glass-opaque], ${T} [data-glass-raised] {
  --ui-chat-surface-background: var(--ui-bg-chrome) !important;
  --ui-editor-surface-background: var(--ui-bg-chrome) !important;
  --ui-sidebar-surface-background: var(--ui-bg-sidebar) !important;
}
/* The scene must NEVER be see-through. In Desktop's glass mode the page background is transparent and the
   native window material (Windows Mica/Acrylic) shows through any translucent paint, but only while the
   window is focused, so a half-transparent scene looked like a colored haze that vanished when the window
   lost focus. The canvas is therefore always fully opaque; calming it behind a conversation is done by a
   solid-color veil laid on top of it. */
${T} { --me-veil: ${veilLight}; }
${T}.dark { --me-veil: ${veilDark}; }
${T} canvas[data-me-scene] { opacity: 1 !important; }
${T} [data-me-veil] {
  background: var(--me-veil);
  opacity: .5;
  transition: opacity 900ms ease;
}
${T}:has([data-slot="aui_intro"]) [data-me-veil] { opacity: 0; }
${T} [data-slot="composer-surface"] {
  background: var(--ui-bg-editor) !important;
  border: 1px solid var(--me-rule) !important;
  border-radius: 12px !important;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--ui-bg-chrome) 75%, transparent), 0 8px 28px #0003 !important;
}
${T} [data-slot="composer-surface"]:focus-within {
  border-color: var(--theme-midground) !important;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--ui-bg-chrome) 75%, transparent), 0 0 34px color-mix(in srgb, var(--theme-midground) 22%, transparent), 0 8px 28px #0003 !important;
}
${T} [data-slot="composer-rich-input"] { caret-color: var(--theme-midground); }
${T} [data-slot="pane-tab"], ${T} [data-slot="sidebar-group-label"],
${T} [data-slot="aui_assistant-message-content"] :is(h1,h2,h3) {
  font-family: ${FONT_FAMILY}, Palatino, Georgia, serif !important;
  font-weight: 400;
  letter-spacing: .015em;
}
${T} .wordmark, ${T} .wordmark * {
  font-family: ${FONT_FAMILY}, Palatino, Georgia, serif !important;
  font-weight: 400 !important;
}
${T} .wordmark {
  width: min(calc(100% - 2rem), 44rem) !important;
  mix-blend-mode: normal !important;
  text-shadow: 0 2px 24px var(--me-halo);
}
${T} .wordmark > span:not([aria-hidden]) > span { color: var(--theme-foreground); }
${T} [data-slot="aui_intro"] p:not(.wordmark) {
  color: var(--ui-text-secondary);
  font-family: Palatino, Georgia, serif;
  font-size: 1.05rem;
  line-height: 1.65;
  max-width: 44ch;
  margin-inline: auto;
}
${T} [data-slot="aui_intro"]::after {
  content: var(--me-quote, "");
  display: block;
  margin: 1.2rem auto 0;
  width: fit-content;
  max-width: 46ch;
  padding: .5rem 1.2rem;
  border-radius: 20px;
  background: color-mix(in srgb, var(--ui-bg-chrome) 42%, transparent);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  text-wrap: balance;
  text-align: center;
  font-family: Palatino, "Palatino Linotype", Georgia, serif;
  font-style: italic;
  font-size: .98rem;
  line-height: 1.55;
  letter-spacing: .02em;
  color: var(--theme-midground);
  text-shadow: 0 1px 14px var(--me-halo);
}
${T} [data-slot="aui_assistant-message-content"] :is(p,li) { line-height: 1.75; }
/* The assistant's replies sit on a soft translucent backing, so the scene can stay bright behind the
   conversation while the words stay easy to read. Negative margin cancels the padding: no layout shift. */
${T} [data-slot="aui_assistant-message-root"] {
  margin: -.55rem -.9rem;
  padding: .55rem .9rem;
  border-radius: 16px;
  background: color-mix(in srgb, var(--ui-bg-chrome) 70%, transparent);
}
${T} [data-slot="aui_assistant-message-content"] {
  font-family: ${ASSISTANT_FONT};
  font-size: 1.04em;
}
${T} [data-slot="aui_assistant-message-content"] :is(pre, code, kbd) { font-size: .9em; }
@media (prefers-reduced-transparency: reduce) {
  ${T} [data-slot="aui_assistant-message-root"] { background: var(--ui-bg-chrome); }
}
${T} [data-slot="aui_assistant-message-content"] :is(h1,h2) {
  padding-bottom: .3em;
  background: linear-gradient(90deg, var(--me-rule), transparent 85%) left bottom / 100% 1px no-repeat;
}
${T} [data-slot="aui_assistant-message-content"] blockquote {
  border-inline-start: 2px solid var(--theme-midground);
  padding-inline-start: .9rem;
  font-family: Palatino, "Palatino Linotype", Georgia, serif;
  font-style: italic;
  color: var(--ui-text-secondary);
}
${T} [data-slot="aui_assistant-message-content"] a { text-decoration-color: color-mix(in srgb, var(--theme-midground) 55%, transparent); text-underline-offset: .2em; }
${T} [data-slot="aui_assistant-message-content"] hr { border: 0; height: 1px; background: linear-gradient(90deg, transparent, var(--me-rule), transparent); }
${T} .composer-human-message {
  background: color-mix(in srgb, var(--theme-midground) 11%, var(--ui-bg-editor)) !important;
  border-color: var(--me-rule) !important;
  border-radius: 14px !important;
}
${T} :is(pre,code,kbd) { font-family: var(--dt-font-mono, ui-monospace, monospace) !important; }
${T} pre { background: var(--ui-bg-editor) !important; border: 1px solid var(--me-rule); border-radius: 8px; }
${T} [data-slot="sidebar"] {
  background-image: linear-gradient(90deg, color-mix(in srgb, var(--ui-bg-chrome) ${Math.round(scrim * 100)}%, transparent) 0%, color-mix(in srgb, var(--ui-bg-chrome) ${Math.round(scrim * 47)}%, transparent) 60%, transparent 100%) !important;
}
/* The sidebar scrim starts below the tab strip, so give the strip and top bar their own translucent backing:
   otherwise tab labels sit straight on the scene (dark text on a dark cliff in light mode). */
${T} :is(div[class*="group/pane-header"], div[class*="relative flex min-w-0 shrink-0 bg-(--ui-sidebar-surface-background)"]) {
  background: color-mix(in srgb, var(--ui-bg-chrome) 62%, transparent) !important;
}
/* The window controls float above everything in their own fixed container. */
${T} div[class*="fixed z-70 flex flex-row items-center"] {
  background: color-mix(in srgb, var(--ui-bg-chrome) 62%, transparent);
  border-radius: 10px;
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
}
${T} [data-slot="sidebar-menu-button"][data-active="true"] {
  box-shadow: inset 2px 0 0 var(--theme-midground);
  background: color-mix(in srgb, var(--theme-midground) 10%, transparent) !important;
}
${T} [data-slot="statusbar"] { background: color-mix(in srgb, var(--ui-bg-chrome) 88%, transparent) !important; border-top: 1px solid var(--me-rule); }
${T} [data-slot="profile-rail"] { background: color-mix(in srgb, var(--ui-bg-chrome) 70%, transparent) !important; }
${T} [data-panel-header] { border-color: var(--me-rule); }
${T} [data-slot="composer-surface"] button[data-variant="default"] {
  background: var(--theme-midground) !important;
  color: var(--dt-midground-foreground) !important;
  border-radius: 8px !important;
}
${T} :is([data-slot="dropdown-menu-content"], [data-slot="dialog-content"], [data-slot="popover-content"]) {
  border-color: var(--me-rule) !important;
  border-radius: 12px !important;
}
${T} ::selection { background: color-mix(in srgb, var(--theme-midground) 38%, transparent); }
@media (max-width: 700px) { ${T} [data-slot="aui_intro"]::after { font-size: .85rem; max-width: 30ch; } }
@media (prefers-reduced-motion: reduce) { ${T} [data-me-veil] { transition: none; } }
@media (forced-colors: active) {
  ${T} :is(canvas[data-me-scene], [data-me-veil]) { display: none; }
  ${T} [data-slot="aui_intro"]::after { color: CanvasText; text-shadow: none; }
}
`
}

const THEMES = THEME_DATA.map(t => ({
  ...t,
  make: MAKERS[t.name],
  // The stylesheet is installed by this plugin itself (see watchScenes), not through the theme's
  // customCSS field. Desktop versions differ in how (or whether) they apply that field to a
  // plugin-contributed theme; owning the <style> tag makes the result identical everywhere.
  css: makeCSS(t.name, t.sidebarScrim, t.colors.background, t.darkColors.background),
  desktopTheme: {
    name: t.name,
    label: t.label,
    description: t.description,
    colors: t.colors,
    darkColors: t.darkColors
  }
}))

const resolveTheme = n => THEMES.find(t => n === t.name || n.startsWith(`${t.name}-accent-`)) || null

const setQuote = theme => {
  const style = document.documentElement.style
  const had = style.getPropertyValue('--me-quote')
  if (theme && theme.quotes && theme.quotes.length) {
    if (!had) style.setProperty('--me-quote', JSON.stringify(theme.quotes[Math.floor(Math.random() * theme.quotes.length)]))
  } else if (had) {
    style.removeProperty('--me-quote')
  }
}

const VERSION = '1.0.2'
const STYLE_ID = 'middle-earth-theme-css'

function watchScenes() {
  const root = document.documentElement
  let styleEl = null
  let stage = null
  let canvas = null
  let veil = null
  let active = null
  let failedFor = null
  let lastDark = null
  let pending = 0
  let disposed = false

  // One <style> tag, present only while one of these themes is active, holding that theme's CSS.
  const setStyle = theme => {
    if (!theme) {
      if (styleEl) styleEl.remove()
      styleEl = null
      return
    }
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = STYLE_ID
      document.head.appendChild(styleEl)
    }
    if (styleEl.dataset.theme !== theme.name) {
      styleEl.dataset.theme = theme.name
      styleEl.textContent = theme.css
    }
  }

  const teardown = () => {
    if (stage) stage.destroy()
    if (canvas) canvas.remove()
    if (veil) veil.remove()
    stage = canvas = veil = active = null
    lastDark = null
  }

  function sync() {
    pending = 0
    if (disposed) return
    const theme = resolveTheme(root.dataset.hermesTheme || '')
    const dark = root.classList.contains('dark')
    if (theme !== failedFor) failedFor = null
    setStyle(theme)
    setQuote(theme)
    if (theme) root.dataset.meVersion = VERSION
    else delete root.dataset.meVersion

    // Switching between two of these themes swaps the scene; there is never more than one canvas.
    if (active && theme !== active) teardown()
    if (!theme || failedFor === theme) return

    if (!stage) {
      // Veil first, canvas second: both sit at z-index -1, and the later one in the page paints on top,
      // so the canvas lands FIRST in the DOM (below) and the veil right after it (above).
      veil = document.createElement('div')
      veil.setAttribute('aria-hidden', 'true')
      veil.dataset.meVeil = ''
      veil.style.cssText = 'position:fixed;inset:0;z-index:-1;pointer-events:none;'
      document.body.prepend(veil)
      canvas = document.createElement('canvas')
      canvas.setAttribute('aria-hidden', 'true')
      canvas.dataset.meScene = theme.name
      canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:-1;pointer-events:none;'
      document.body.prepend(canvas)
      try {
        stage = theme.make(canvas, { dark })
        active = theme
        lastDark = dark
      } catch (error) {
        console.warn(`[middle-earth-themes] ${theme.name} scene unavailable; keeping the palette.`, error)
        canvas.remove()
        veil.remove()
        canvas = veil = stage = null
        failedFor = theme
      }
    } else if (dark !== lastDark) {
      lastDark = dark
      if (stage.refresh) stage.refresh({ dark })
    }
  }

  const observer = new MutationObserver(() => { if (!pending) pending = requestAnimationFrame(sync) })
  observer.observe(root, { attributes: true, attributeFilter: ['data-hermes-theme', 'class', 'style'] })
  sync()

  return () => {
    disposed = true
    setStyle(null)
    delete root.dataset.meVersion
    setQuote(null)
    observer.disconnect()
    cancelAnimationFrame(pending)
    teardown()
  }
}

export default {
  id: 'middle-earth-themes',
  name: 'Middle-earth Themes',
  register(ctx) {
    for (const t of THEMES) ctx.register({ id: t.name, area: THEMES_AREA, data: t.desktopTheme })
    ctx.onDispose(watchScenes())
  }
}
