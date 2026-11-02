const notes = {
  writing: '别急，一笔一画都有自己的节奏。',
  paper: '纸有自己的脾气，挑一张顺眼的。',
  seal: '留一点呼吸，再盖上属于你的印。'
};

export function showStudioNote(message) {
  document.getElementById('deskNote').textContent = message;
}

export function setEditorTab(name, focus = false) {
  if (!Object.hasOwn(notes, name)) return;
  document.querySelectorAll('[data-editor-tab]').forEach(button => {
    const active = button.dataset.editorTab === name;
    button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1;
    document.getElementById(`panel-${button.dataset.editorTab}`).hidden = !active;
    if (active && focus) button.focus();
  });
  document.getElementById('deskNote').textContent = notes[name];
}

export function initStudioUI() {
  const tabs = [...document.querySelectorAll('[data-editor-tab]')];
  tabs.forEach((button, index) => {
    button.addEventListener('click', () => setEditorTab(button.dataset.editorTab));
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); setEditorTab(tabs[next].dataset.editorTab, true); }
    });
  });
  setEditorTab('writing');
}
