import { searchClassics } from './classics.js';

// Browsing never writes to the manuscript; only the explicit load button does.
export function initClassicsLibrary(onLoad) {
  const $ = id => document.getElementById(id);
  let selected = null;
  const show = entry => {
    selected = entry || null;
    $('classicLoad').disabled = !selected;
    $('classicPreviewTitle').textContent = entry?.label || '未找到相关篇目';
    $('classicPreviewMeta').textContent = entry ? `${entry.author} · ${entry.count} 字` : '可更换体裁或检索词。';
    $('classicPreviewBody').textContent = entry?.body || '';
    $('classicPreviewBody').scrollTop = 0;
    $('classicNote').textContent = entry?.note || '';
    $('classicNote').hidden = !entry?.note;
    $('classicSource').hidden = !entry;
    if (entry) $('classicSource').href = entry.source;
  };
  const refresh = () => {
    const matches = searchClassics($('classicSearch').value, $('classicCategory').value);
    const retained = matches.find(entry => entry.id === selected?.id) || matches[0];
    $('classicList').replaceChildren(...matches.map(entry => {
      const option = document.createElement('option');
      option.value = entry.id; option.textContent = `${entry.label} · ${entry.author.split(' · ').at(-1)}`;
      option.selected = entry.id === retained?.id;
      return option;
    }));
    $('classicList').disabled = !matches.length;
    $('classicCount').textContent = `${matches.length} 篇`;
    show(retained);
  };
  $('classicSearch').addEventListener('input', refresh);
  $('classicCategory').addEventListener('change', refresh);
  $('classicList').addEventListener('change', () => {
    show(searchClassics().find(entry => entry.id === $('classicList').value));
  });
  $('classicLoad').addEventListener('click', () => {
    if (selected && onLoad(selected.id)) {
      $('classicLoad').closest('details').open = false;
      $('classicUndo').focus({ preventScroll: true });
    }
  });
  refresh();
}
