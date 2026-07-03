// classify.js
// The event-classification bar and the feedback message area.

import { CLASSES } from './content.js';

// Render classification buttons into `container`.
//   onClassify(value): called when the player picks a class
//   disabled: when true, buttons are non-interactive (event already submitted)
export function renderClassifyBar(container, onClassify, disabled = false) {
  container.innerHTML = '';
  const label = document.createElement('span');
  label.className = 'classify-label';
  label.textContent = 'Classify this event:';
  container.appendChild(label);

  for (const c of CLASSES) {
    const b = document.createElement('button');
    b.className = 'btn class-btn';
    b.textContent = c.label;
    b.disabled = disabled;
    b.addEventListener('click', () => onClassify(c.value));
    container.appendChild(b);
  }
}

// Render a feedback message. `feedback` = { tone: 'good'|'bad', text }.
export function renderFeedback(container, feedback) {
  container.innerHTML = '';
  if (!feedback) return;
  const box = document.createElement('div');
  box.className = `feedback feedback-${feedback.tone}`;
  box.textContent = feedback.text;
  container.appendChild(box);
}
