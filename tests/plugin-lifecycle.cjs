'use strict';
// Drives the BUILT plugin (desktop/plugin.js) through its real life cycle against a DOM mock.
// Run after: python3 tools/build.py        node tests/plugin-lifecycle.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const { harness } = require('./harness.cjs');

const file = path.join(__dirname, '..', 'desktop', 'plugin.js');
const raw = fs.readFileSync(file, 'utf8');
const code = raw
  .replace(/^import \{ THEMES_AREA \} from '@hermes\/plugin-sdk'/m, "const THEMES_AREA = 'themes'")
  .replace('export default {', 'globalThis.__plugin = {');
assert.ok(code !== raw && code.includes('globalThis.__plugin'), 'could not adapt module for test');

const COLOR_KEYS = ['background', 'foreground', 'card', 'cardForeground', 'muted', 'mutedForeground', 'popover', 'popoverForeground', 'primary', 'primaryForeground', 'secondary', 'secondaryForeground', 'accent', 'accentForeground', 'border', 'input', 'ring', 'midground', 'midgroundForeground', 'composerRing', 'destructive', 'destructiveForeground', 'sidebarBackground', 'sidebarBorder', 'userBubble', 'userBubbleBorder'];
const NAMES = ['shire-hearth', 'rivendell-vale', 'moria-gate', 'lothlorien-glade'];

function setup() {
  const h = harness();
  const classes = new Set();
  const styleProps = new Map();
  const root = {
    dataset: {},
    classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c) },
    style: { getPropertyValue: k => styleProps.get(k) || '', setProperty: (k, v) => styleProps.set(k, v), removeProperty: k => styleProps.delete(k) },
  };
  const body = { children: [], prepends: 0, prepend(el) { this.prepends++; el.parent = this; this.children.unshift(el); } };
  const head = { children: [], appendChild(el) { el.parent = this; this.children.push(el); return el; } };
  h.doc.documentElement = root; h.doc.body = body; h.doc.head = head;
  const observers = [];
  class MO { constructor(cb) { this.cb = cb; this.live = false; observers.push(this); } observe() { this.live = true; } disconnect() { this.live = false; } }
  const sandbox = { document: h.doc, window: h.win, console: { warn() {}, log() {}, error() {} }, MutationObserver: MO,
    requestAnimationFrame: h.win.requestAnimationFrame, cancelAnimationFrame: h.win.cancelAnimationFrame,
    Math, Date, Number, Object, Array, JSON, Map, Set, Float32Array, Uint8ClampedArray, Proxy, Error, TypeError, performance: { now: () => 0 } };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  const registered = [];
  const disposers = [];
  sandbox.__plugin.register({ register: r => registered.push(r), onDispose: f => disposers.push(f) });
  const trigger = (times = 1) => { for (let i = 0; i < times; i++) observers.filter(o => o.live).forEach(o => o.cb()); h.flush(2, 16); };
  const canvases = () => body.children.filter(c => c.tag === 'canvas' && !c.removed);
  const styles = () => head.children.filter(c => c.tag === 'style' && !c.removed);
  return { h, root, body, head, styles, classes, styleProps, observers, registered, disposers, trigger, canvases, plugin: sandbox.__plugin };
}

const out = [];

// 1. Registration: four themes, full palettes, per-theme CSS.
{
  const t = setup();
  assert.equal(t.plugin.id, 'middle-earth-themes');
  assert.deepEqual(t.registered.map(r => r.id), NAMES);
  for (const r of t.registered) {
    assert.equal(r.area, 'themes'); const d = r.data;
    assert.equal(d.name, r.id); assert.ok(d.label && d.description);
    for (const key of COLOR_KEYS) { assert.match(d.colors[key], /^#[0-9a-f]{6}$/i, r.id + ' light ' + key); assert.match(d.darkColors[key], /^#[0-9a-f]{6}$/i, r.id + ' dark ' + key); }
    assert.equal(d.customCSS, undefined, r.id + ': CSS is owned by the plugin, not the theme field');
  }
  assert.equal(t.styles().length, 0, 'no stylesheet until one of these themes is active');
  assert.equal(t.canvases().length, 0, 'no scene until one of these themes is active');
  assert.equal(t.observers.filter(o => o.live).length, 1);
  out.push('registration: 4 themes, 26 color keys x2 modes each, scoped CSS');
}

// 2. Activation, switching, accent retints: never more than one canvas.
{
  const t = setup();
  t.root.dataset.hermesTheme = 'shire-hearth'; t.classes.add('dark'); t.trigger();
  assert.equal(t.canvases().length, 1); assert.equal(t.canvases()[0].dataset.meScene, 'shire-hearth');
  assert.ok(JSON.parse(t.styleProps.get('--me-quote')).length > 5, 'quote variable set');
  // The plugin installs its own stylesheet (Desktop's customCSS path varies by version).
  assert.equal(t.styles().length, 1, 'exactly one stylesheet'); const css0 = t.styles()[0];
  assert.equal(css0.id, 'middle-earth-theme-css'); assert.ok(css0.textContent.includes('@font-face'), 'font embedded');
  assert.ok(css0.textContent.includes('aui_assistant-message-root'), 'reply backing rule present');
  assert.ok(css0.textContent.includes('canvas[data-me-scene]'), 'scene dimming rule present');
  assert.ok(!/pointer-events:\s*auto/.test(css0.textContent), 'CSS must not enable pointer capture');
  const yamlVersion = fs.readFileSync(path.join(__dirname, '..', 'plugin.yaml'), 'utf8').match(/^version:\s*"?([\d.]+)"?/m)[1];
  assert.equal(t.root.dataset.meVersion, yamlVersion, 'in-app version marker matches plugin.yaml');
  for (let round = 0; round < 3; round++) for (const n of NAMES) {
    t.root.dataset.hermesTheme = n; t.trigger();
    assert.equal(t.canvases().length, 1, 'one canvas after switching to ' + n);
    assert.equal(t.canvases()[0].dataset.meScene, n);
    assert.equal(t.styles().length, 1, 'one stylesheet after switching to ' + n);
    assert.ok(t.styles()[0].textContent.includes(`data-hermes-theme="${n}"`), 'stylesheet is for ' + n);
    for (const other of NAMES.filter(x => x !== n)) assert.ok(!t.styles()[0].textContent.includes(`data-hermes-theme="${other}"`), n + ' stylesheet leaks ' + other);
    t.root.dataset.hermesTheme = n + '-accent-c8ad70'; t.trigger();
    assert.equal(t.canvases().length, 1, 'one canvas on accent retint of ' + n);
    assert.equal(t.styles().length, 1, 'accent retint keeps exactly one stylesheet');
    assert.ok(t.styles()[0].textContent.includes(`data-hermes-theme="${n}"`), 'retint keeps ' + n + ' stylesheet');
    assert.equal(t.canvases()[0].dataset.meScene, n);
  }
  // Light/dark toggles refresh the live scene without creating a new one.
  const before = t.body.prepends;
  for (let i = 0; i < 6; i++) { i % 2 ? t.classes.add('dark') : t.classes.delete('dark'); t.trigger(); }
  assert.equal(t.body.prepends, before, 'mode changes must not recreate the canvas'); assert.equal(t.canvases().length, 1);
  // Bursts of mutations coalesce into one sync.
  t.root.dataset.hermesTheme = 'mono'; t.trigger();
  assert.equal(t.canvases().length, 0, 'other themes remove the scene'); assert.equal(t.styleProps.has('--me-quote'), false, 'quote cleared');
  assert.equal(t.styles().length, 0, 'other themes remove the stylesheet'); assert.equal(t.root.dataset.meVersion, undefined, 'version marker cleared');
  const p0 = t.body.prepends; t.root.dataset.hermesTheme = 'moria-gate'; t.trigger(25);
  assert.equal(t.body.prepends, p0 + 1, '25 rapid mutations create exactly one canvas');
  out.push('switching: exactly 1 canvas across 3 rounds x 4 themes x accent retints; mode toggles do not recreate; bursts coalesce; other themes clear the scene');
}

// 3. A failing scene leaves nothing behind, does not retry-storm, and recovers.
{
  const t = setup();
  t.h.mode.failRender = true;
  t.root.dataset.hermesTheme = 'rivendell-vale'; t.trigger();
  assert.equal(t.canvases().length, 0, 'failed scene leaves no canvas');
  assert.equal(t.styles().length, 1, 'the stylesheet still applies even if the scene cannot start');
  assert.equal(t.h.totalListeners(), 0, 'failed scene leaves no listeners');
  const p = t.body.prepends; t.trigger(8);
  assert.equal(t.body.prepends, p, 'no retry storm for the same theme');
  t.h.mode.failRender = false; t.root.dataset.hermesTheme = 'lothlorien-glade'; t.trigger();
  assert.equal(t.canvases().length, 1); assert.equal(t.canvases()[0].dataset.meScene, 'lothlorien-glade');
  out.push('failure: no canvas/listeners left, no retry storm, recovers on the next theme');
}

// 4. Disposal is complete and idempotent; no pointer listener ever existed.
{
  const t = setup();
  t.root.dataset.hermesTheme = 'shire-hearth'; t.classes.add('dark'); t.trigger();
  t.root.dataset.hermesTheme = 'moria-gate'; t.trigger();
  assert.equal(t.canvases().length, 1);
  assert.equal(t.disposers.length, 1);
  assert.equal(t.styles().length, 1, 'stylesheet present while active');
  t.disposers[0](); t.disposers[0]();
  assert.equal(t.styles().length, 0, 'stylesheet removed on disposal'); assert.equal(t.root.dataset.meVersion, undefined, 'version marker removed');
  assert.equal(t.canvases().length, 0, 'canvas removed'); assert.equal(t.h.totalListeners(), 0, 'listeners removed');
  assert.equal(t.h.observed(), 0, 'ResizeObservers removed'); assert.equal(t.observers.filter(o => o.live).length, 0, 'MutationObserver removed');
  assert.equal(t.h.queue.size, 0, 'no animation callbacks left'); assert.equal(t.styleProps.has('--me-quote'), false);
  const bad = t.h.allListenerTypes().filter(x => /^(pointer|mouse|touch|wheel|click|drag)/i.test(x));
  assert.deepEqual(bad, [], 'pointer-like listeners: ' + bad.join(','));
  t.root.dataset.hermesTheme = 'shire-hearth'; t.trigger(); assert.equal(t.canvases().length, 0, 'inert after disposal');
  out.push('disposal: idempotent; 0 canvases, listeners, observers and RAF; no pointer listener ever registered');
}

console.log('PASS plugin lifecycle:\n  ' + out.join('\n  '));
