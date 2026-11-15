'use strict';
// Minimal DOM/Canvas mock shared by the scene-contract and plugin-lifecycle tests.
// It records every event listener, observer, and animation-frame request so tests can prove
// nothing is left behind, and it records every listener TYPE ever registered so tests can
// prove no pointer/mouse listener is ever added.

function eventTarget(extra = {}) {
  const live = new Map();
  const everTypes = new Set();
  return Object.assign(extra, {
    addEventListener(type, fn) {
      everTypes.add(type);
      if (!live.has(type)) live.set(type, new Set());
      live.get(type).add(fn);
    },
    removeEventListener(type, fn) { live.get(type)?.delete(fn); },
    emit(type, ev = {}) { [...(live.get(type) || [])].forEach(f => f(ev)); },
    listenerCount() { return [...live.values()].reduce((n, s) => n + s.size, 0); },
    countOf(type) { return live.get(type)?.size || 0; },
    everTypes() { return [...everTypes]; },
  });
}

function makeContext(mode) {
  // Any method call is a no-op unless the harness is told to fail rendering.
  const state = { calls: 0 };
  const base = {
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createConicGradient: () => ({ addColorStop() {} }),
    createPattern: () => ({}),
    measureText: () => ({ width: 10 }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    createImageData: () => ({ data: new Uint8ClampedArray(4) }),
    isPointInPath: () => false,
  };
  return new Proxy(base, {
    get(o, k) {
      if (k in o) {
        if (mode.failRender && typeof o[k] === 'function') return () => { throw new Error('Injected render failure'); };
        return o[k];
      }
      if (k === 'canvas') return null;
      return (...a) => { state.calls++; if (mode.failRender) throw new Error('Injected render failure'); };
    },
    set(o, k, v) { o[k] = v; return true; },
  });
}

function harness(opts = {}) {
  const mode = { failRender: false };
  const media = eventTarget({ matches: !!opts.reduced });
  let rafId = 0;
  const queue = new Map();
  let observers = 0;
  const cssDims = { width: opts.width || 1360, height: opts.height || 980 };
  const win = eventTarget({
    devicePixelRatio: opts.dpr || 1,
    innerWidth: cssDims.width,
    innerHeight: cssDims.height,
    matchMedia: () => media,
    requestAnimationFrame(f) {
      if (opts.rafThrows) throw new Error('Injected RAF failure');
      queue.set(++rafId, f); return rafId;
    },
    cancelAnimationFrame(id) { queue.delete(id); },
    ResizeObserver: class {
      constructor(cb) { this.cb = cb; }
      observe() { if (opts.observerThrows) throw new Error('Injected observer failure'); observers++; this.on = true; }
      disconnect() { if (this.on) { observers--; this.on = false; } }
    },
  });
  const created = [];
  const doc = eventTarget({
    hidden: false,
    defaultView: win,
    createElement(tag) {
      const el = { tag, width: 0, height: 0, style: {}, dataset: {}, attrs: {},
        setAttribute(k, v) { this.attrs[k] = v; }, remove() { this.removed = true; if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this); },
        getContext: () => (opts.cachedContextNull && created.length >= 0 ? null : makeContext(mode)),
        getBoundingClientRect: () => ({ ...cssDims }), ownerDocument: doc };
      created.push(el);
      return el;
    },
  });
  const canvas = { tag: 'canvas', width: 0, height: 0, style: {}, dataset: {}, attrs: {}, ownerDocument: doc,
    setAttribute(k, v) { this.attrs[k] = v; }, remove() { this.removed = true; },
    getContext: () => (opts.primaryContextNull ? null : makeContext(mode)),
    getBoundingClientRect: () => ({ ...cssDims }) };
  return { win, doc, media, canvas, mode, queue, created, observed: () => observers,
    totalListeners: () => win.listenerCount() + doc.listenerCount() + media.listenerCount(),
    allListenerTypes: () => [...win.everTypes(), ...doc.everTypes(), ...media.everTypes()],
    flush(n = 1, step = 50, startAt = 0) {
      let t = startAt;
      for (let i = 0; i < n; i++) { const batch = [...queue.values()]; queue.clear(); t += step; batch.forEach(f => f(t)); }
      return t;
    },
    cssDims };
}

module.exports = { harness, eventTarget, makeContext };
