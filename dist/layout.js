export const MAX_CHARACTERS = 4000;
const segmenter = new Intl.Segmenter('zh', { granularity: 'grapheme' });

export function characters(text, keepPunctuation = false) {
  return [...segmenter.segment(text.normalize('NFC'))].map(x => x.segment)
    .filter(c => !/^\s+$/u.test(c) && (keepPunctuation || !/^\p{P}+$/u.test(c)));
}

export function verseRows(text) {
  const clauses = text.split(/[，。！？；,.!?;\n]+/).map(s => characters(s).length).filter(Boolean).slice(0, 12);
  if (clauses.length >= 4 && clauses.filter(n => n === 5).length / clauses.length >= .8) return { rows: 15, genre: '五言诗' };
  if (clauses.length >= 4 && clauses.filter(n => n === 7).length / clauses.length >= .8) return { rows: 14, genre: '七言诗' };
  return { rows: 15, genre: '诗文' };
}

export function pageGeometry(settings) {
  const album = settings.composition === 'album';
  return { width: 1600, height: album ? 1760 : 2000, left: 126, right: 1474, top: album ? 116 : 180, bottom: album ? 1600 : 1770, album };
}

export function verticalCenters(heights, step, top) {
  if (!heights.length) return [];
  const ink = heights.map(h => Math.max(step * .24, Math.min(step * .91, h)));
  const target = heights.length * step - step * .18;
  const gap = heights.length > 1 ? (target - ink.reduce((a, b) => a + b, 0)) / (heights.length - 1) : 0;
  let cursor = top + step * .09;
  return ink.map(h => { const center = cursor + h / 2; cursor += h + gap; return center; });
}

export function paginate(text, { columns = 10, rows = 16, keepPunctuation = false, lineMode = 'flow', composition = 'free' } = {}) {
  if (!Number.isInteger(columns) || columns < 6 || columns > 12 || !Number.isInteger(rows) || rows < 10 || rows > 22) {
    throw new RangeError('章法参数超出范围');
  }
  const chars = characters(text, keepPunctuation);
  if (chars.length > MAX_CHARACTERS) throw new RangeError(`正文最多支持 ${MAX_CHARACTERS} 字，请分篇制作。`);
  const bodyColumns = columns - (composition === 'album' ? 1 : 2);
  const capacity = bodyColumns * rows;
  const pages = [];
  const textColumns = [];
  const paragraphs = lineMode === 'lines' ? text.split(/\r?\n/) : [text];
  for (const paragraph of paragraphs) {
    const units = characters(paragraph, keepPunctuation);
    for (let i = 0; i < units.length; i += rows) textColumns.push(units.slice(i, i + rows));
  }
  let offset = 0;
  for (let i = 0; i < textColumns.length; i += bodyColumns) {
    const pageColumns = textColumns.slice(i, i + bodyColumns);
    const page = pageColumns.flat();
    pages.push({ characters: page, columns: pageColumns, offset });
    offset += page.length;
  }
  return { pages, count: chars.length, capacity, columns, rows };
}

// Keep the signature next to the last written column, even on a sparse final page.
export function signaturePosition(page, settings, isLastPage) {
  const { columns, rows } = settings;
  const { left, right, top, bottom, album } = pageGeometry(settings);
  const cw = (right - left) / columns, rh = (bottom - top) / rows;
  const size = Math.min(cw * .74, rh * .78);
  const note = isLastPage ? (settings.colophon || settings.author) : '續';
  const noteChars = characters(note || '', true).slice(0, 20);
  const sealChars = isLastPage ? characters(settings.seal || '', true).slice(0, 4) : [];
  const sealSize = Math.min(87, cw * .7);
  if (album) {
    const titleLength = Math.min(14, characters(settings.title || '無題', true).length);
    const titleStep = Math.min(rh * .84, (bottom - top) * .43 / Math.max(1, titleLength));
    const titleEnd = top + rh * 2.6 + titleLength * titleStep;
    const end = bottom - (sealChars.length ? sealSize + 72 : 48);
    const start = Math.max(titleEnd + rh * .65, end - Math.max(0, noteChars.length - 1) * rh * .65);
    const step = Math.min(rh * .65, (end - start) / Math.max(1, noteChars.length - 1));
    return { x: right - cw / 2, y: start, noteChars, noteSize: Math.min(size * .69, Math.max(10, step * .9)), step, sealChars, sealSize, sealY: bottom - sealSize / 2 - 24 };
  }
  const used = page.columns.filter(c => c.length);
  const lastLength = used.at(-1)?.length || 0;
  const x = Math.max(left + cw / 2, right - (used.length + 1.5) * cw);
  const end = Math.min(bottom - (sealChars.length ? sealSize + 68 : size / 2), top + Math.max(lastLength, 5) * rh - rh * .35);
  const step = Math.min(rh * .6, 52, Math.max(1, end - top - rh) / Math.max(1, noteChars.length - 1));
  const noteSize = Math.min(size * .46, step * .88);
  const y = end - Math.max(0, noteChars.length - 1) * step;
  const sealY = Math.min(bottom - sealSize / 2 - 10, end + noteSize / 2 + 35 + sealSize / 2);
  return { x, y, noteChars, noteSize, step, sealChars, sealSize, sealY };
}

export function random(seed) {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}

export function safeFilename(title) {
  return (title || '自在小楷').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim().slice(0, 60) || '自在小楷';
}
