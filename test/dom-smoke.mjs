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

const screens = ['screen-home', 'screen-accelerator', 'screen-missions', 'screen-briefing', 'screen-explorer', 'screen-lab', 'screen-result']
  .map((id) => { const e = mkEl('section'); e._attrs.id = id; e.id = id; byId.set(id, e); return e; });

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
const { EXPERIMENTS } = await import('../js/accelerator.js');

step('DOMContentLoaded init', () => docL.DOMContentLoaded());

// geometry: CMS<->ATLAS and ALICE<->LHCb are diametrically opposite
step('interaction-point geometry (opposite pairs)', () => {
  const A = Object.fromEntries(EXPERIMENTS.map((e) => [e.id, e.angle]));
  const opp = (a, b) => {
    let d = (((A[a] - A[b]) % 360) + 360) % 360; // 0..360
    if (d > 180) d = 360 - d;                    // 0..180
    return Math.abs(d - 180) < 1;                // opposite == 180 apart
  };
  if (!opp('cms', 'atlas')) throw new Error(`CMS/ATLAS not opposite: ${A.cms} vs ${A.atlas}`);
  if (!opp('alice', 'lhcb')) throw new Error(`ALICE/LHCb not opposite: ${A.alice} vs ${A.lhcb}`);
});

step('enter LHC -> accelerator', () => getEl('enter-btn').click());
step('accelerator draws + energy readout set', () => {
  if (!getEl('acc-energy').textContent.includes('TeV')) throw new Error('energy readout not updated');
});
// acc-canvas is 520x520 -> center (260,260), R=208. CMS at angle 0 => (468,260).
step('hover/click ATLAS shows info', () => {
  getEl('acc-canvas').dispatch('mousemove', { clientX: 52, clientY: 260 }); // ATLAS (angle 180)
  getEl('acc-canvas').dispatch('click', { clientX: 52, clientY: 260 });
  if (!/ATLAS/.test(getEl('acc-info').innerHTML)) throw new Error('ATLAS info not shown');
});
step('click CMS enters campaign', () => {
  getEl('acc-canvas').dispatch('click', { clientX: 468, clientY: 260 }); // CMS (angle 0)
  const grid = getEl('mission-grid');
  if (!grid._children.some((c) => (c._handlers.click || []).length)) throw new Error('campaign not rendered');
});

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
