import { paginate, characters, MAX_CHARACTERS, safeFilename } from './layout.js';
import { drawPage } from './renderer.js';
import { PAPERS, paintPaper } from './paper.js';

const $ = id => document.getElementById(id);
const samples = {
  shanju: { title: '山居秋暝', author: '唐 · 王维', body: '空山新雨后，天气晚来秋。\n明月松间照，清泉石上流。\n竹喧归浣女，莲动下渔舟。\n随意春芳歇，王孙自可留。' },
  chibi: { title: '赤壁', author: '唐 · 杜牧', body: '折戟沉沙铁未销，自将磨洗认前朝。\n东风不与周郎便，铜雀春深锁二乔。' },
  lanting: { title: '兰亭集序', author: '晋 · 王羲之', body: '永和九年，岁在癸丑，暮春之初，会于会稽山阴之兰亭，修禊事也。群贤毕至，少长咸集。此地有崇山峻岭，茂林修竹，又有清流激湍，映带左右，引以为流觞曲水，列坐其次。虽无丝竹管弦之盛，一觞一咏，亦足以畅叙幽情。\n是日也，天朗气清，惠风和畅。仰观宇宙之大，俯察品类之盛，所以游目骋怀，足以极视听之娱，信可乐也。\n夫人之相与，俯仰一世。或取诸怀抱，悟言一室之内；或因寄所托，放浪形骸之外。虽趣舍万殊，静躁不同，当其欣于所遇，暂得于己，快然自足，不知老之将至。及其所之既倦，情随事迁，感慨系之矣。' }
};
const fields = ['title', 'author', 'body', 'font', 'paper', 'columns', 'rows', 'natural', 'punctuation', 'colophon', 'seal', 'lineMode', 'ink'];
let seed = 915, pageIndex = 0, layout, settings, timer, toastTimer;
let loadedFont = null, fontRequest = 0, busy = false;
const canvas = $('artwork');

function toast(message, error = false) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').className = error ? 'visible error' : 'visible';
  toastTimer = setTimeout(() => { $('toast').className = ''; }, error ? 6500 : 3500);
}

function readSettings() {
  const data = Object.fromEntries(fields.map(id => [id, $(id).type === 'checkbox' ? $(id).checked : $(id).value]));
  return { ...data, columns: Number(data.columns), rows: Number(data.rows), keepPunctuation: data.punctuation, style: document.querySelector('input[name="style"]:checked').value, seed };
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
    if (Number.isSafeInteger(saved.seed)) seed = saved.seed;
    $('saveStatus').textContent = '已恢复本机草稿';
  } catch { $('saveStatus').textContent = '本机草稿不可用'; }
}

function saveDraft() {
  try {
    localStorage.setItem('zizai-shufa-v1', JSON.stringify({ ...settings, font: settings.font === 'custom' ? 'kai' : settings.font }));
    $('saveStatus').textContent = '已保存至本机';
  } catch { $('saveStatus').textContent = '草稿未保存'; }
}

function syncButtons() {
  const empty = !layout?.pages.length;
  $('download').disabled = empty || busy;
  $('print').disabled = empty || busy;
  $('previousPage').disabled = empty || pageIndex === 0 || busy;
  $('nextPage').disabled = empty || pageIndex >= layout.pages.length - 1 || busy;
}

function renderCurrentPage() {
  const empty = !layout?.pages.length;
  $('emptyState').hidden = !empty;
  if (!empty) drawPage(canvas, layout.pages[pageIndex], settings, pageIndex, layout.pages.length);
  $('pageNumber').textContent = `${String(empty ? 0 : pageIndex + 1).padStart(2, '0')} / ${String(layout?.pages.length || 0).padStart(2, '0')}`;
  canvas.setAttribute('aria-label', `${settings.title || '无题'}，第 ${empty ? 0 : pageIndex + 1} 页，共 ${layout?.pages.length || 0} 页书法预览`);
  $('pageInfo').textContent = `正文 ${layout?.count || 0} 字 · 每页可容 ${layout?.capacity || 0} 字`;
  if (layout?.pages.length && settings.lineMode === 'lines') $('pageInfo').textContent = `正文 ${layout.count} 字 · 本页 ${layout.pages[pageIndex].columns.length} 列`;
  syncButtons();
}

function update() {
  clearTimeout(timer);
  settings = readSettings();
  document.querySelectorAll('[data-paper]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.paper === settings.paper)));
  $('paperDescription').textContent = (PAPERS[settings.paper] || PAPERS.warm).description;
  document.querySelectorAll('[data-sample]').forEach(button => {
    const sample = samples[button.dataset.sample];
    button.setAttribute('aria-pressed', String(['title', 'author', 'body'].every(key => settings[key] === sample[key])));
  });
  $('flowHint').textContent = settings.lineMode === 'lines' ? '依原文换列 · 长行自动接列' : '连续竖排 · 长文自动分页';
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
document.querySelectorAll('input[name="style"]').forEach(el => el.addEventListener('change', update));
document.querySelectorAll('[data-paper]').forEach(button => {
  const swatch = button.querySelector('canvas');
  const context = swatch.getContext('2d'); context.scale(swatch.width / 1600, swatch.height / 2000);
  paintPaper(context, button.dataset.paper, 915);
  button.addEventListener('click', () => { $('paper').value = button.dataset.paper; update(); });
});
document.querySelectorAll('[data-sample]').forEach(button => button.addEventListener('click', () => {
  const sample = samples[button.dataset.sample];
  for (const field of ['title', 'author', 'body']) $(field).value = sample[field];
  $('lineMode').value = button.dataset.sample === 'lanting' ? 'flow' : 'lines';
  pageIndex = 0; update();
  toast(`已载入《${sample.title}》${layout.pages.length > 1 ? `，完整排为 ${layout.pages.length} 页` : ''}`);
}));
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

async function withExport(action) {
  update();
  if (!layout?.pages.length || busy) return;
  busy = true; syncButtons();
  const controls = [...document.querySelectorAll('.editor input, .editor textarea, .editor select, .editor button, #newInk')];
  controls.forEach(control => { control.disabled = true; });
  try { await document.fonts.ready; await action(); }
  catch (error) { toast(`导出失败：${error.message || '请稍后重试'}`, true); }
  finally { controls.forEach(control => { control.disabled = false; }); busy = false; syncButtons(); }
}

$('download').addEventListener('click', () => withExport(async () => {
  const output = document.createElement('canvas');
  drawPage(output, layout.pages[pageIndex], settings, pageIndex, layout.pages.length, 2400);
  const blob = await new Promise(resolve => output.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('浏览器未能生成图片');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `${safeFilename(settings.title)}_第${pageIndex + 1}页.png`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  toast('高清图片已生成，请查看浏览器下载记录。');
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
  } finally { $('print').textContent = '整篇存 PDF ↗'; }
}));
window.addEventListener('afterprint', () => $('printRoot').replaceChildren());
restoreDraft(); update();
document.fonts.ready.then(renderCurrentPage);
