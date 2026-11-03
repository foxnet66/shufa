import { paginate, characters, MAX_CHARACTERS, safeFilename, verseRows, exportWidth } from './layout.js';
import { initArtViewer } from './art-viewer.js';
import { drawPage } from './renderer.js';
import { PAPERS, paintPaper } from './paper.js';
import { drawSeal } from './seal.js';
import { fontCoverage } from './font-coverage.js';
import { sealCoverage } from './fonts/seal-coverage.js';
import { BODY_FONTS, bodyFontState, loadBodyFont } from './body-fonts.js';
import { initStudioUI } from './studio-ui.js';
import { MOUNTS, mountGeometry } from './mounting.js';
import { CLASSICS_BY_ID as samples } from './classics.js';
import { initClassicsLibrary } from './classics-ui.js';

const $ = id => document.getElementById(id);
const fields = ['title', 'author', 'body', 'font', 'paper', 'columns', 'rows', 'natural', 'punctuation', 'colophon', 'seal', 'lineMode', 'ink', 'composition', 'sealStyle', 'sealFont', 'sealTexture', 'mount', 'scene'];
let seed = 915, pageIndex = 0, layout, settings, timer, toastTimer;
let loadedFont = null, fontRequest = 0, busy = false;
let sealReady = false, sealLoading = true, customSealFont = null, customSealCoverage = null, sealFontRequest = 0;
const canvas = $('artwork');
const viewer = initArtViewer({
  render(target) {
    if (!layout?.pages.length) return null;
    drawPage(target, layout.pages[pageIndex], settings, pageIndex, layout.pages.length, Math.min(5400, exportWidth(settings)));
    return { title:settings.title, index:pageIndex, count:layout.pages.length };
  },
  navigate(direction) {
    if (busy || !layout?.pages.length) return;
    pageIndex = Math.max(0, Math.min(layout.pages.length - 1, pageIndex + direction)); renderCurrentPage();
  }
});

function toast(message, error = false) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').className = error ? 'visible error' : 'visible';
  toastTimer = setTimeout(() => { $('toast').className = ''; }, error ? 6500 : 3500);
}

function readSettings() {
  const scroll = $('composition').value === 'scroll';
  for (const option of $('columns').options) option.hidden = !scroll && Number(option.value) > 12;
  if (!scroll && Number($('columns').value) > 12) $('columns').value = '10';
  const data = Object.fromEntries(fields.map(id => [id, $(id).type === 'checkbox' ? $(id).checked : $(id).value]));
  return { ...data, columns: Number(data.columns), rows: data.rows === 'auto' ? verseRows(data.body).rows : Number(data.rows), keepPunctuation: data.punctuation, style: document.querySelector('input[name="style"]:checked').value, seed };
}

function restoreDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem('zizai-shufa-v1') || 'null');
    if (!saved || typeof saved !== 'object') return;
    for (const id of fields) {
      const el = $(id), value = saved[id];
      if (el.type === 'checkbox') { if (typeof value === 'boolean') el.checked = value; }
      else if (typeof value === 'string' || typeof value === 'number') {
        if (el.tagName === 'SELECT') {
          if ([...el.options].some(o => o.value === String(value))) el.value = value;
        } else el.value = String(value).slice(0, el.maxLength > 0 ? el.maxLength : 16000);
      }
    }
    if (saved.style === 'clean' || saved.style === 'ruled') document.querySelector(`input[name="style"][value="${saved.style}"]`).checked = true;
    if (!saved.composition) {
      $('composition').value = 'album'; $('rows').value = 'auto'; $('lineMode').value = 'flow';
    }
    if (Number.isSafeInteger(saved.seed)) seed = saved.seed;
    $('saveStatus').textContent = '草稿已恢复';
  } catch { $('saveStatus').textContent = '本机草稿不可用'; }
}

function saveDraft() {
  try {
    localStorage.setItem('zizai-shufa-v1', JSON.stringify({ ...settings, rows: $('rows').value, font: settings.font === 'custom' ? 'kai' : settings.font, sealFont: settings.sealFont === 'custom' ? 'kai' : settings.sealFont }));
    $('saveStatus').textContent = '草稿已存';
  } catch { $('saveStatus').textContent = '草稿未保存'; }
}

function syncButtons() {
  const empty = !layout?.pages.length;
  const awaitingFont = !!settings?.seal.trim() && settings.sealFont === 'seal' && sealLoading;
  const awaitingBody = BODY_FONTS[settings?.font] && bodyFontState(settings.font).status !== 'ready';
  $('download').disabled = empty || busy || awaitingFont || awaitingBody;
  $('print').disabled = empty || busy || awaitingFont || awaitingBody;
  $('inspectArtwork').disabled = empty || busy;
  $('previousPage').disabled = empty || pageIndex === 0 || busy;
  $('nextPage').disabled = empty || pageIndex >= layout.pages.length - 1 || busy;
}

function renderCurrentPage() {
  const empty = !layout?.pages.length;
  $('emptyState').hidden = !empty;
  if (!empty) drawPage(canvas, layout.pages[pageIndex], settings, pageIndex, layout.pages.length);
  $('pageNumber').textContent = `${String(empty ? 0 : pageIndex + 1).padStart(2, '0')} / ${String(layout?.pages.length || 0).padStart(2, '0')}`;
  canvas.setAttribute('aria-label', `${settings.title || '无题'}，第 ${empty ? 0 : pageIndex + 1} 页，共 ${layout?.pages.length || 0} 页书法预览`);
  $('pageInfo').textContent = `${layout?.count || 0} 字`;
  if (layout?.pages.length && settings.lineMode === 'lines') $('pageInfo').textContent = `${layout.count} 字 · 本页 ${layout.pages[pageIndex].columns.length} 列`;
  syncButtons();
  viewer.refresh();
}

function update() {
  clearTimeout(timer);
  settings = readSettings();
  $('titleLengthNote').hidden = characters(settings.title, true).length <= 14;
  document.querySelector('.paper-stage').dataset.scene = settings.scene;
  const bodyMeta = BODY_FONTS[settings.font], bodyState = bodyFontState(settings.font);
  settings.bodyRenderFont = settings.font;
  $('bodyFontRetry').hidden = !(bodyMeta && bodyState.status === 'error');
  $('bodyFontStatus').classList.remove('font-warning');
  if (bodyMeta) {
    if (bodyState.status === 'idle') {
      const selected = settings.font;
      loadBodyFont(selected).then(() => { if ($('font').value === selected) update(); }).catch(() => { if ($('font').value === selected) update(); });
    }
    const current = bodyFontState(settings.font);
    if (current.status === 'ready') {
      const missing = [...new Set(characters(`${settings.title}${settings.author}${settings.colophon}${settings.body}`))].filter(c => current.coverage && !current.coverage.has(c.codePointAt(0)));
      $('bodyFontStatus').textContent = `${bodyMeta.name} · 已就绪。${missing.length ? `「${missing.slice(0, 6).join('、')}」等 ${missing.length} 字不在字库中，将使用系统后备字体。` : ''}`;
      $('bodyFontStatus').classList.toggle('font-warning', missing.length > 0);
    } else {
      settings.bodyRenderFont = 'kai';
      $('bodyFontStatus').textContent = current.status === 'error' ? '字体加载失败，预览暂用楷体。请重新加载或切换字体后导出。' : `正在加载${bodyMeta.name}，预览暂用楷体；就绪后即可导出。`;
      $('bodyFontStatus').classList.toggle('font-warning', current.status === 'error');
    }
  } else $('bodyFontStatus').textContent = settings.font === 'custom' ? '当前使用本次导入字体，刷新后需重新导入。' : '设备字体随系统而异。';
  document.querySelectorAll('[data-body-font]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.bodyFont === settings.font)));
  const sealChars = characters(settings.seal, true).slice(0, 4);
  const coverage = settings.sealFont === 'seal' ? sealCoverage : settings.sealFont === 'custom' ? customSealCoverage : null;
  const missing = coverage ? sealChars.filter(char => !coverage.has(char.codePointAt(0))) : [];
  settings.sealRenderFont = settings.sealFont;
  let sealStatus = settings.sealFont === 'custom' ? '已导入独立印章字体，刷新后需重新导入。' : '印章字体与正文独立设置。';
  if (settings.sealFont === 'seal') {
    sealStatus = '篆书字体已就绪。';
    if (!sealReady) { settings.sealRenderFont = 'kai'; sealStatus = sealLoading ? '正在加载篆书，预览暂用楷体；就绪后可导出。' : '篆书加载失败，整方暂用楷体；可刷新或导入字体。'; }
  }
  if (missing.length && (settings.sealFont !== 'seal' || sealReady)) {
    settings.sealRenderFont = 'kai'; sealStatus = `当前字体缺「${[...new Set(missing)].join('、')}」，整方暂用楷体。可调整印文或导入字体。`;
  }
  $('sealFontStatus').textContent = sealStatus;
  $('sealFontStatus').classList.toggle('font-warning', missing.length > 0 || (settings.sealFont === 'seal' && !sealLoading && !sealReady));
  $('sealLayoutHint').textContent = ['不钤印', '单字居中', '双字纵排', '三字：右一大，左两小', '四字：右起纵读'][sealChars.length];
  const proof = $('sealPreview');
  if (sealChars.length) drawSeal(proof, sealChars, settings);
  else proof.getContext('2d').clearRect(0, 0, proof.width, proof.height);
  proof.setAttribute('aria-label', `印章「${sealChars.join('')}」放大预览`);
  const geometry = mountGeometry(settings);
  canvas.parentElement.dataset.mounted = String(geometry.mount !== 'none');
  canvas.style.aspectRatio = `${geometry.width} / ${geometry.height}`;
  const outputWidth = exportWidth(settings);
  document.querySelector('.paper-stage').classList.toggle('scroll-stage', settings.composition === 'scroll');
  $('exportDimensions').textContent = `高清 PNG · ${outputWidth} × ${Math.round(outputWidth * geometry.height / geometry.width)} 像素${geometry.mount === 'none' ? '' : ' · 含装裱'}`;
  document.querySelectorAll('[data-mount]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mount === settings.mount)));
  $('mountDescription').textContent = (MOUNTS[settings.mount] || MOUNTS.none).description;
  const genre = verseRows(settings.body).genre;
  $('layoutDescription').textContent = `${$('rows').value === 'auto' ? genre + ' · 自动' : '自定'} ${settings.columns} 列 × ${settings.rows} 字；${settings.composition !== 'free' ? '右列题名、落款与钤印' : '落款跟随正文末列'}。`;
  document.querySelectorAll('[data-paper]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.paper === settings.paper)));
  $('paperDescription').textContent = (PAPERS[settings.paper] || PAPERS.warm).description;
  document.querySelectorAll('[data-sample]').forEach(button => {
    const sample = samples[button.dataset.sample];
    button.setAttribute('aria-pressed', String(['title', 'author', 'body'].every(key => settings[key] === sample[key])));
  });
  $('flowHint').textContent = settings.lineMode === 'lines' ? '依原文换列' : '连续竖排';
  const count = characters(settings.body, settings.keepPunctuation).length;
  $('charCount').textContent = `${count} / ${MAX_CHARACTERS} 字`;
  try {
    layout = paginate(settings.body, settings);
    pageIndex = Math.min(pageIndex, Math.max(0, layout.pages.length - 1));
    renderCurrentPage(); saveDraft();
  } catch (e) {
    layout = null;
    renderCurrentPage();
    $('pageInfo').textContent = e.message;
    toast(e.message, true);
  }
}

fields.forEach(id => $(id).addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(update, 130); }));
document.querySelectorAll('[data-body-font]').forEach(button => button.addEventListener('click', () => { $('font').value = button.dataset.bodyFont; update(); }));
$('bodyFontRetry').addEventListener('click', () => {
  const selected = $('font').value;
  loadBodyFont(selected, true).then(() => { if ($('font').value === selected) update(); }).catch(() => { if ($('font').value === selected) update(); });
  update();
});
document.querySelectorAll('input[name="style"]').forEach(el => el.addEventListener('change', update));
document.querySelectorAll('[data-mount]').forEach(button => button.addEventListener('click', () => {
  $('mount').value = button.dataset.mount; update();
}));
document.querySelectorAll('[data-paper]').forEach(button => {
  const swatch = button.querySelector('canvas');
  const context = swatch.getContext('2d'); context.scale(swatch.width / 1600, swatch.height / 2000);
  paintPaper(context, button.dataset.paper, 915);
  button.addEventListener('click', () => { $('paper').value = button.dataset.paper; update(); });
});
let beforeClassicLoad = null;
function loadClassic(id) {
  const sample = samples[id];
  if (!sample || busy) return false;
  beforeClassicLoad = { title: $('title').value, author: $('author').value, body: $('body').value, lineMode: $('lineMode').value, pageIndex };
  $('classicUndo').hidden = false;
  for (const field of ['title', 'author', 'body']) $(field).value = sample[field];
  $('lineMode').value = settings.composition === 'album' || ['古文', '古体', '四言'].includes(sample.category) ? 'flow' : 'lines';
  pageIndex = 0; update();
  toast(`已载入《${sample.title}》${layout.pages.length > 1 ? `，完整排为 ${layout.pages.length} 页` : ''}`);
  return true;
}
document.querySelectorAll('[data-sample]').forEach(button => button.addEventListener('click', () => loadClassic(button.dataset.sample)));
$('classicUndo').addEventListener('click', () => {
  if (!beforeClassicLoad || busy) return;
  for (const field of ['title', 'author', 'body', 'lineMode']) $(field).value = beforeClassicLoad[field];
  pageIndex = beforeClassicLoad.pageIndex; beforeClassicLoad = null; $('classicUndo').hidden = true;
  update(); toast('已恢复载入前文字。');
});
$('heroSample').addEventListener('click', () => {
  if (busy) return;
  $('composition').value = 'scroll'; $('columns').value = '24'; $('rows').value = '14';
  $('font').value = 'mashan'; $('mount').value = 'silk'; $('paper').value = 'white';
  loadClassic('lanting');
  document.querySelector('[data-editor-tab="writing"]').click();
  $('desk').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
});
$('composition').addEventListener('change', () => {
  const scroll = $('composition').value === 'scroll';
  $('columns').value = scroll ? '24' : '10';
  $('rows').value = scroll ? '14' : $('composition').value === 'album' ? 'auto' : '16';
  $('lineMode').value = 'flow'; pageIndex = 0; update();
});
$('newInk').addEventListener('click', () => { seed = (seed + 7919) >>> 0; update(); if (!$('natural').checked) toast('开启「自然墨色」可同时调整笔墨浓淡。'); });
$('previousPage').addEventListener('click', () => { if (pageIndex > 0) { pageIndex--; renderCurrentPage(); } });
$('nextPage').addEventListener('click', () => { if (pageIndex < layout.pages.length - 1) { pageIndex++; renderCurrentPage(); } });

$('fontImport').addEventListener('click', () => $('fontFile').click());
$('fontFile').addEventListener('change', async e => {
  const file = e.target.files?.[0];
  if (!file) return;
  const request = ++fontRequest;
  if (file.size > 30 * 1024 * 1024) { toast('请导入 30 MB 以内的字体文件。', true); e.target.value = ''; return; }
  try {
    const face = new FontFace('ShufaCustom', await file.arrayBuffer());
    await face.load();
    if (request !== fontRequest) return;
    if (loadedFont) document.fonts.delete(loadedFont);
    document.fonts.add(face); loadedFont = face;
    let option = $('font').querySelector('option[value="custom"]');
    if (!option) { option = document.createElement('option'); option.value = 'custom'; $('font').append(option); }
    option.textContent = file.name; $('font').value = 'custom';
    $('fontHelp').textContent = `已导入 ${file.name}，字体留在本机；刷新页面后需重新导入。`;
    update(); toast('字体已就绪，作品已重新排版。');
  } catch { toast('字体无法读取，请选择有效的 TTF、OTF 或 WOFF 字体。', true); }
  finally { e.target.value = ''; }
});

$('sealFontImport').addEventListener('click', () => $('sealFontFile').click());
$('sealFontFile').addEventListener('change', async e => {
  const file = e.target.files?.[0]; if (!file) return;
  const request = ++sealFontRequest;
  if (file.size > 30 * 1024 * 1024) { toast('请导入 30 MB 以内的印章字体。', true); e.target.value = ''; return; }
  try {
    const buffer = await file.arrayBuffer();
    const face = new FontFace('ShufaSealCustom', buffer); await face.load();
    if (request !== sealFontRequest) return;
    let coverage = null;
    try { coverage = fontCoverage(buffer); } catch { /* WOFF or unusual cmap: inspect the proof visually. */ }
    if (customSealFont) document.fonts.delete(customSealFont);
    document.fonts.add(face); customSealFont = face; customSealCoverage = coverage;
    let option = $('sealFont').querySelector('option[value="custom"]');
    if (!option) { option = document.createElement('option'); option.value = 'custom'; $('sealFont').append(option); }
    option.textContent = file.name; $('sealFont').value = 'custom'; update();
    toast(coverage ? '印章字体已更新，正文保持原字体。' : '印章字体已加载，请核对印面字形。');
  } catch { toast('印章字体无法读取，请选择有效字体文件。', true); }
  finally { e.target.value = ''; }
});

async function withExport(action) {
  update();
  if (!layout?.pages.length || busy) return;
  busy = true; syncButtons();
  const controls = [...document.querySelectorAll('.editor input, .editor textarea, .editor select, .editor button, #newInk, #scene, #heroSample')];
  const disabledBeforeExport = controls.map(control => control.disabled);
  controls.forEach(control => { control.disabled = true; });
  try { await loadBodyFont(settings.font); await document.fonts.ready; await action(); }
  catch (error) { toast(`导出失败：${error.message || '请稍后重试'}`, true); }
  finally { controls.forEach((control, index) => { control.disabled = disabledBeforeExport[index]; }); busy = false; syncButtons(); }
}

$('download').addEventListener('click', () => withExport(async () => {
  const output = document.createElement('canvas');
  drawPage(output, layout.pages[pageIndex], settings, pageIndex, layout.pages.length, exportWidth(settings));
  const blob = await new Promise(resolve => output.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('浏览器未能生成图片');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `${safeFilename(settings.title)}_第${pageIndex + 1}页.png`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  toast('PNG 已生成。');
}));

$('print').addEventListener('click', () => withExport(async () => {
  $('print').textContent = '正在准备整篇…';
  const root = $('printRoot'); root.replaceChildren();
  try {
    // Render sequentially to avoid retaining a canvas for every page.
    const output = document.createElement('canvas');
    for (let i = 0; i < layout.pages.length; i++) {
      drawPage(output, layout.pages[i], settings, i, layout.pages.length, 1800);
      const img = new Image(); img.alt = `第 ${i + 1} 页`;
      img.src = output.toDataURL('image/jpeg', .96);
      await img.decode(); root.append(img);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    toast('已准备全部册页，请在打印窗口选择「另存为 PDF」。');
    window.print();
  } finally { $('print').textContent = '整篇 PDF'; }
}));
window.addEventListener('afterprint', () => $('printRoot').replaceChildren());
initStudioUI(); restoreDraft(); initClassicsLibrary(loadClassic); update();

function renderHero() {
  const hero = { ...settings, ...samples.lanting, composition:'scroll', columns:24, rows:14, font:'mashan', bodyRenderFont:bodyFontState('mashan').status === 'ready' ? 'mashan' : 'kai', paper:'white', mount:'silk', style:'clean', lineMode:'flow', keepPunctuation:false, natural:true, seal:'自在', sealFont:'seal', sealRenderFont:sealReady ? 'seal' : 'kai', sealStyle:'intaglio', sealTexture:'fresh', colophon:'', ink:'balanced', seed:915 };
  const pages = paginate(hero.body, hero).pages;
  drawPage($('heroArtwork'), pages[0], hero, 0, pages.length, 1800);
}
renderHero();
loadBodyFont('mashan').then(renderHero).catch(() => {});
document.fonts.ready.then(renderCurrentPage);
const builtinSeal = new FontFace('CNSSeal', `url("${new URL('./fonts/CNS-ShuoWen.ttf', import.meta.url).href}")`);
builtinSeal.load().then(face => { document.fonts.add(face); sealReady = true; }).catch(() => { sealReady = false; }).finally(() => { sealLoading = false; update(); renderHero(); });
