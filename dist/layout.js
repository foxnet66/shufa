export const MAX_CHARACTERS = 4000;
const segmenter = new Intl.Segmenter('zh', { granularity: 'grapheme' });

export function characters(text, keepPunctuation = false) {
  return [...segmenter.segment(text.normalize('NFC'))].map(x => x.segment)
    .filter(c => !/^\s+$/u.test(c) && (keepPunctuation || !/^\p{P}+$/u.test(c)));
}

export function paginate(text, { columns = 10, rows = 16, keepPunctuation = false, lineMode = 'flow' } = {}) {
  if (!Number.isInteger(columns) || columns < 6 || columns > 12 || !Number.isInteger(rows) || rows < 10 || rows > 22) {
    throw new RangeError('章法参数超出范围');
  }
  const chars = characters(text, keepPunctuation);
  if (chars.length > MAX_CHARACTERS) throw new RangeError(`正文最多支持 ${MAX_CHARACTERS} 字，请分篇制作。`);
  const capacity = (columns - 2) * rows;
  const pages = [];
  const textColumns = [];
  const paragraphs = lineMode === 'lines' ? text.split(/\r?\n/) : [text];
  for (const paragraph of paragraphs) {
    const units = characters(paragraph, keepPunctuation);
    for (let i = 0; i < units.length; i += rows) textColumns.push(units.slice(i, i + rows));
  }
  let offset = 0;
  for (let i = 0; i < textColumns.length; i += columns - 2) {
    const pageColumns = textColumns.slice(i, i + columns - 2);
    const page = pageColumns.flat();
    pages.push({ characters: page, columns: pageColumns, offset });
    offset += page.length;
  }
  return { pages, count: chars.length, capacity, columns, rows };
}

// Keep the signature next to the last written column, even on a sparse final page.
export function signaturePosition(page, settings, isLastPage) {
  const { columns, rows } = settings;
  const left = 132, right = 1468, top = 180, bottom = 1770;
  const cw = (right - left) / columns, rh = (bottom - top) / rows;
  const size = Math.min(cw * .74, rh * .78);
  const note = isLastPage ? (settings.colophon || settings.author) : '續';
  const noteChars = characters(note || '', true).slice(0, 20);
  const sealChars = isLastPage ? characters(settings.seal || '', true).slice(0, 4) : [];
  const sealSize = Math.min(87, cw * .7);
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
