const panels = ['writing', 'paper', 'seal'];

export function setEditorTab(name, focus = false) {
  if (!panels.includes(name)) return;
  document.querySelectorAll('[data-editor-tab]').forEach(button => {
    const active = button.dataset.editorTab === name;
    button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1;
    document.getElementById(`panel-${button.dataset.editorTab}`).hidden = !active;
    if (active && focus) button.focus();
  });
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
