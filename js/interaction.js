// interaction.js
// Canvas mouse handling (click + hover hit-testing) and the object "inspector"
// panel where the player reads detector signals and assigns an identity.

import { hitTest } from './detector.js';
import { IDENTITIES, KIND_HINT } from './content.js';

// Translate a mouse event to canvas pixel coordinates, accounting for any CSS
// scaling of the canvas element.
function canvasCoords(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  return { x: (evt.clientX - rect.left) * sx, y: (evt.clientY - rect.top) * sy };
}

// Attach click/hover handlers to the detector canvas.
//   handlers.onClickObject(id|null)
//   handlers.onHoverObject(id|null)
export function attachCanvas(canvas, handlers) {
  let lastHover = undefined;
  canvas.addEventListener('mousemove', (e) => {
    const { x, y } = canvasCoords(canvas, e);
    const id = hitTest(x, y);
    canvas.style.cursor = id ? 'pointer' : 'crosshair';
    if (id !== lastHover) {
      lastHover = id;
      handlers.onHoverObject && handlers.onHoverObject(id);
    }
  });
  canvas.addEventListener('mouseleave', () => {
    lastHover = null;
    handlers.onHoverObject && handlers.onHoverObject(null);
  });
  canvas.addEventListener('click', (e) => {
    const { x, y } = canvasCoords(canvas, e);
    const id = hitTest(x, y);
    handlers.onClickObject && handlers.onClickObject(id);
  });
}

// Beginner-friendly detector readout for an object (design doc §8).
function readout(object) {
  const lvl = (e) => (e < 3 ? 'low' : e < 10 ? 'medium' : 'high');
  const hasTrack = object.kind !== 'photon';
  const many = object.kind === 'jet' || object.kind === 'bjet' || object.kind === 'tau';
  const rows = [
    ['Track', many ? `${object.nprong || 'many'} (spray)` : hasTrack ? 'yes' : 'none'],
    ['pT', `${Math.round(object.pt)} GeV`],
    ['Reaches muon system', object.reachesMuonSystem ? 'yes' : 'no'],
    ['ECAL energy', lvl(object.ecal)],
    ['HCAL energy', lvl(object.hcal)],
    ['Isolation', object.iso < 0.15 ? 'isolated' : 'in activity'],
  ];
  if (object.displaced) rows.push(['Secondary vertex', 'displaced']);
  if (object.charge) rows.push(['Charge', object.charge]);
  return rows;
}

// Render the inspector for the active object into `container`.
//   object       : the selected object (or null to clear)
//   assignedLabel: identity already assigned, if any
//   onIdentify(label): called when the player picks an identity
export function renderInspector(container, object, assignedLabel, onIdentify) {
  container.innerHTML = '';
  if (!object) {
    const hint = document.createElement('p');
    hint.className = 'muted';
    hint.textContent = 'Click a track or cluster in the detector to inspect it.';
    container.appendChild(hint);
    return;
  }

  const title = document.createElement('h3');
  title.textContent = 'Candidate selected';
  container.appendChild(title);

  const table = document.createElement('div');
  table.className = 'readout';
  for (const [k, v] of readout(object)) {
    const row = document.createElement('div');
    row.className = 'readout-row';
    row.innerHTML = `<span>${k}</span><b>${v}</b>`;
    table.appendChild(row);
  }
  container.appendChild(table);

  const q = document.createElement('p');
  q.className = 'muted';
  q.textContent = assignedLabel
    ? `You identified this as: ${assignedLabel}`
    : 'What is this object?';
  container.appendChild(q);

  const btns = document.createElement('div');
  btns.className = 'id-buttons';
  for (const label of IDENTITIES) {
    const b = document.createElement('button');
    b.className = 'chip';
    if (assignedLabel === label) b.classList.add('chip-active');
    b.textContent = label;
    b.addEventListener('click', () => onIdentify(label));
    btns.appendChild(b);
  }
  container.appendChild(btns);
}
