'use strict';
// Contract every scene in src/scenes must satisfy. Run: node tests/scene-contract.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const { harness } = require('./harness.cjs');

const ROOT = path.join(__dirname, '..');
const SCENES = [
  ['shire', 'createShireScene'],
  ['rivendell', 'createRivendellScene'],
  ['moria', 'createMoriaScene'],
  ['lothlorien', 'createLothlorienScene'],
];
const POINTER = /^(pointer|mouse|touch|wheel|click|dblclick|contextmenu|drag|dragstart|gesture)/i;
const STATS_KEYS = ['frames', 'frameCount', 'paused', 'motion', 'width', 'height', 'dpr', 'fps', 'staticBuilds', 'destroyed', 'fixedTime', 'dark', 'layers'];

function load(h, file, fn) {
  const sandbox = { document: h.doc, window: h.win, console, Math, Date, Number, Object, Array, JSON, Map, Set, Float32Array, Uint8ClampedArray, Proxy, Error, TypeError, performance: { now: () => 0 } };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox);
  assert.equal(typeof sandbox[fn], 'function', `${fn} must be a global function`);
  return sandbox[fn];
}

let failures = 0;
const report = [];
for (const [name, fn] of SCENES) {
  const file = path.join(ROOT, 'src', 'scenes', name + '.js');
  if (!fs.existsSync(file)) { console.log(`SKIP ${name}: no scene file yet`); continue; }
  try {
    const src = fs.readFileSync(file, 'utf8');
    assert.ok(!/^\s*(import|export)\s/m.test(src), 'no import/export');
    for (const bad of ['fetch(', 'XMLHttpRequest', 'localStorage', 'sessionStorage', 'WebSocket', 'new Image', 'Audio(', 'AudioContext', 'sendBeacon', 'eval(']) {
      assert.ok(!src.includes(bad), `forbidden API in source: ${bad}`);
    }

    // 1. API shape, DPR cap, frame cap, caching.
    let h = harness({ dpr: 3 });
    let make = load(h, file, fn);
    let s = make(h.canvas);
    for (const k of STATS_KEYS) assert.ok(k in s.stats(), 'stats.' + k);
    for (const k of ['draw', 'refresh', 'stats', 'destroy']) assert.equal(typeof s[k], 'function', k);
    assert.equal(s.stats().dpr, 1.5, 'DPR capped at 1.5');
    assert.ok(s.stats().layers >= 3, 'cached layers: ' + s.stats().layers);
    const f0 = s.stats().frames, b0 = s.stats().staticBuilds;
    h.flush(1000, 1, 0); // ~1 simulated second at 1ms steps
    const delta = s.stats().frames - f0;
    assert.ok(delta <= 24 && delta >= 20, `frames in one simulated second: ${delta}`);
    assert.equal(s.stats().staticBuilds, b0, 'static art is cached, not rebuilt per frame');

    // 2. Hidden pause / resume.
    h.doc.hidden = true; h.doc.emit('visibilitychange');
    assert.equal(h.queue.size, 0, 'no RAF while hidden'); assert.equal(s.stats().paused, true);
    h.doc.hidden = false; h.doc.emit('visibilitychange'); assert.equal(h.queue.size, 1, 'RAF resumes');

    // 3. Reduced motion toggles live; static frame has no loop.
    h.media.matches = true; h.media.emit('change');
    assert.equal(h.queue.size, 0, 'no loop under reduced motion'); assert.equal(s.stats().motion, false);
    h.media.matches = false; h.media.emit('change'); assert.equal(h.queue.size, 1);

    // 4. Day/night refresh, manual draw, idempotent destroy.
    s.refresh({ dark: false }); assert.equal(s.stats().dark, false);
    s.refresh({ dark: true }); assert.equal(s.stats().dark, true);
    const fr = s.stats().frames; s.draw(10); assert.equal(s.stats().frames, fr + 1);
    s.destroy(); s.destroy();
    assert.equal(h.queue.size, 0, 'RAF cleared'); assert.equal(h.observed(), 0, 'observers cleared');
    assert.equal(h.totalListeners(), 0, 'listeners cleared');
    const stopped = s.stats().frames; s.draw(20); s.refresh(); assert.equal(s.stats().frames, stopped, 'inert after destroy');

    // 5. NEVER any pointer/mouse/touch listener, during the whole life cycle.
    const types = h.allListenerTypes();
    assert.deepEqual(types.filter(t => POINTER.test(t)), [], 'pointer-like listeners registered: ' + types.join(','));
    h.win.emit('pointermove', { clientX: 5 }); h.win.emit('mousemove', { clientX: 5 });

    // 6. Static modes: reduced motion at start, motion:false, fixedTime.
    h = harness({ reduced: true }); make = load(h, file, fn); s = make(h.canvas);
    assert.equal(s.stats().motion, false); assert.equal(h.queue.size, 0, 'reduced motion: no loop'); assert.ok(s.stats().frames >= 1, 'static frame painted'); s.destroy();
    h = harness(); make = load(h, file, fn); s = make(h.canvas, { motion: false }); assert.equal(h.queue.size, 0); s.destroy();
    h = harness(); make = load(h, file, fn); s = make(h.canvas, { fixedTime: 3 }); assert.equal(h.queue.size, 0); assert.equal(s.stats().paused, true); s.destroy();

    // 7. Failed startup must roll back everything and throw.
    for (const fault of ['primaryContextNull', 'cachedContextNull', 'failRender', 'observerThrows', 'rafThrows']) {
      h = harness({ [fault]: true === (fault !== 'failRender') });
      if (fault === 'failRender') h.mode.failRender = true;
      make = load(h, file, fn);
      assert.throws(() => make(h.canvas), undefined, `${fault} should fail closed`);
      assert.equal(h.totalListeners(), 0, `${fault} leaked listeners (${h.allListenerTypes().join(',')})`);
      assert.equal(h.observed(), 0, `${fault} leaked observers`);
      assert.equal(h.queue.size, 0, `${fault} leaked RAF`);
    }

    // 8. Sizes and both modes build; title zone is the scene author's job, checked visually.
    for (const [w, hh, dark] of [[1360, 980, true], [900, 650, false], [360, 650, true], [360, 650, false]]) {
      h = harness({ dpr: 3, width: w, height: hh }); make = load(h, file, fn);
      s = make(h.canvas, { dark }); assert.equal(s.stats().width, w); assert.equal(s.stats().dark, dark);
      s.draw(7.5); s.destroy(); assert.equal(h.totalListeners(), 0);
    }
    report.push(`PASS ${name}`);
  } catch (e) {
    failures++; report.push(`FAIL ${name}: ${e.message}`);
  }
}
console.log(report.join('\n'));
if (failures) { console.error(`${failures} scene(s) failed the contract`); process.exit(1); }
