// Headless smoke test: stub a minimal DOM + canvas, load main.js, and drive a
// full playthrough (enter campaign -> briefing -> explorer -> lab -> claim) to
// surface runtime errors the logic tests can't reach.

const listeners = new Map(); // element -> {type: [fn]}
function mkEl(tag = 'div') {
  const el = {
    tagName: tag, _children: [], _handlers: {}, _attrs: {},
    style: {}, classList: {
      _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      toggle(c, on) { if (on === undefined) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); } else on ? this._s.add(c) : this._s.delete(c); },
      contains(c) { return this._s.has(c); },
    },
    _innerHTML: '', set innerHTML(v) { this._innerHTML = v; this._children = []; }, get innerHTML() { return this._innerHTML; },
    textContent: '', value: '0', checked: false, disabled: false, hidden: false,
    width: 300, height: 150,
    appendChild(c) { this._children.push(c); return c; },
    addEventListener(t, fn) { (this._handlers[t] ||= []).push(fn); },
    setAttribute(k, v) { this._attrs[k] = v; }, getAttribute(k) { return this._attrs[k] ?? null; },
    getContext() { return ctxStub(); },
    getBoundingClientRect() { return { left: 0, top: 0, width: this.width, height: this.height }; },
    focus() {}, querySelectorAll() { return []; },
    click() { (this._handlers.click || []).forEach((fn) => fn({})); },
    dispatch(t, e = {}) { (this._handlers[t] || []).forEach((fn) => fn(e)); },
  };
  return el;
}
function ctxStub() {
  const g = { addColorStop() {} };
  return new Proxy({
    createLinearGradient: () => g,
    measureText: () => ({ width: 10 }),
    setLineDash() {}, save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {},
    arc() {}, fill() {}, stroke() {}, fillRect() {}, closePath() {}, clearRect() {}, translate() {}, rotate() {}, fillText() {},
  }, { get: (t, p) => (p in t ? t[p] : () => {}), set: () => true });
}

const byId = new Map();
function getEl(id) { if (!byId.has(id)) byId.set(id, mkEl()); return byId.get(id); }

const screens = ['screen-home', 'screen-missions', 'screen-briefing', 'screen-explorer', 'screen-lab', 'screen-result']
  .map((id) => { const e = mkEl('section'); e._attrs.id = id; e.id = id; return e; });

global.requestAnimationFrame = () => 0; // no recursion
global.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; } };
global.document = {
  getElementById: getEl,
  createElement: (t) => mkEl(t),
  addEventListener(t, fn) { (listeners.get('doc') || listeners.set('doc', {}).get('doc'))[t] = fn; },
  querySelectorAll(sel) {
    if (sel === '.screen') return screens;
    return []; // [data-nav] not present in stub; fine
  },
};
// capture DOMContentLoaded
const docL = {};
global.document.addEventListener = (t, fn) => { docL[t] = fn; };

let errors = 0;
const step = (name, fn) => { try { fn(); console.log('  ok  ' + name); } catch (e) { console.log(' FAIL ' + name + ' :: ' + e.stack.split('\n').slice(0,3).join(' | ')); errors++; } };

await import('../js/main.js');

step('DOMContentLoaded init', () => docL.DOMContentLoaded());
step('enter campaign', () => getEl('enter-btn').click());

// find first mission card and open briefing
step('open first mission briefing', () => {
  const grid = getEl('mission-grid');
  const card = grid._children.find((c) => (c._handlers.click || []).length);
  if (!card) throw new Error('no clickable mission card');
  card.click();
});
step('open event explorer', () => getEl('btn-explorer').click());
step('identify an object', () => {
  // simulate a canvas click by invoking the click handler with coords over center
  getEl('detector-canvas').dispatch('click', { clientX: 280, clientY: 280 });
});
step('guess a process', () => {
  const box = getEl('exp-process');
  const b = box._children[0];
  b && b.click();
});
step('next explorer event', () => getEl('exp-next').click());
step('go to analysis lab', () => getEl('exp-to-lab').click());
step('toggle every cut on', () => {
  const panel = getEl('cuts-panel');
  // cut checkboxes are the first input in each cut-row; dispatch change=checked
  const findInputs = (el, acc = []) => { if (el._handlers && el._handlers.change) acc.push(el); (el._children||[]).forEach((c) => findInputs(c, acc)); return acc; };
  const inputs = findInputs(panel);
  for (const inp of inputs) { inp.checked = true; inp.dispatch('change', {}); }
  console.log(`       (${inputs.length} cut toggles fired)`);
});
step('raise luminosity', () => { const r = getEl('lumi-range'); r.value = '4'; r.dispatch('input', {}); });
step('claim discovery', () => { const b = getEl('btn-claim'); b.dispatch('click', {}); });
step('progress saved', () => { if (!global.localStorage.getItem('cq_progress_v2')) throw new Error('progress not saved'); });

console.log(errors === 0 ? '\nDOM SMOKE: ALL PASS' : `\nDOM SMOKE: ${errors} FAILURES`);
process.exit(errors ? 1 : 0);
