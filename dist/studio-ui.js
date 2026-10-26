let greetingIndex = 0, speakingTimer;
const notes = {
  writing: '别急，一笔一画都有自己的节奏。',
  paper: '纸有自己的脾气，挑一张顺眼的。',
  seal: '留一点呼吸，再盖上属于你的印。'
};

export function foxSays(message) {
  document.getElementById('foxNote').textContent = message;
  const fox = document.querySelector('.mascot-hero');
  fox.classList.add('is-speaking'); clearTimeout(speakingTimer);
  speakingTimer = setTimeout(() => fox.classList.remove('is-speaking'), 1200);
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
  const greetings = ['我负责备纸，你负责喜欢。', '今天写的，都是你的好字。', '点「选纸」，我藏了几张好纸。', '写完别忘了，给自己盖个印。'];
  document.getElementById('foxGreeting').addEventListener('click', () => foxSays(greetings[++greetingIndex % greetings.length]));
  setEditorTab('writing');
}
