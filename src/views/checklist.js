const STORAGE_KEY = 'factorio-checklist-session';

function persist(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function downloadSession(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${state.name.toLowerCase().replace(/\s+/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importSession(e, state, rerender) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const loaded = JSON.parse(text);
    if (!loaded.checklist || !Array.isArray(loaded.checklist.sections)) {
      throw new Error('Invalid session format');
    }
    state.name = loaded.name || state.name;
    state.checklist = loaded.checklist;
    state.checked = loaded.checked || {};
    persist(state);
    rerender();
  } catch (err) {
    alert(`Could not import: ${err.message}`);
  }
}

export function renderChecklist(container, state) {
  const rerender = () => renderChecklist(container, state);
  container.innerHTML = '';

  const header = document.createElement('header');
  header.innerHTML = `<h1>${state.name}</h1>`;

  const controls = document.createElement('div');
  controls.className = 'controls';

  const renameBtn = document.createElement('button');
  renameBtn.textContent = 'Rename Session';
  renameBtn.onclick = () => {
    const next = prompt('Session name', state.name);
    if (next) {
      state.name = next;
      persist(state);
      rerender();
    }
  };

  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Download Session JSON';
  exportBtn.onclick = () => downloadSession(state);

  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.accept = 'application/json';
  importInput.onchange = (e) => importSession(e, state, rerender);

  controls.append(renameBtn, exportBtn, importInput);
  container.append(header, controls);

  state.checklist.sections.forEach((section) => {
    const sectionEl = document.createElement('section');
    sectionEl.innerHTML = `<h2>${section.title}</h2>`;

    (section.groups || []).forEach((group) => {
      const groupEl = document.createElement('div');
      groupEl.className = 'group';
      groupEl.innerHTML = `<h3>${group.title}</h3>`;

      const list = document.createElement('ul');
      (group.items || []).forEach((item, idx) => {
        const id = `${section.id}::${group.title}::${idx}`;
        const li = document.createElement('li');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = Boolean(state.checked[id]);
        cb.onchange = () => {
          state.checked[id] = cb.checked;
          persist(state);
        };
        const label = document.createElement('span');
        label.textContent = item;
        li.append(cb, label);
        list.append(li);
      });
      groupEl.append(list);
      sectionEl.append(groupEl);
    });

    container.append(sectionEl);
  });
}

export { STORAGE_KEY };
