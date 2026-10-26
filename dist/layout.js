export const MAX_CHARACTERS = 4000;
const segmenter = new Intl.Segmenter('zh', { granularity: 'grapheme' });

export function characters(text, keepPunctuation = false) {
  return [...segmenter.segment(text.normalize('NFC'))].map(x => x.segment)
    .filter(c => !/^\s+$/u.test(c) && (keepPunctuation || !/^\p{P}+$/u.test(c)));
}

export function paginate(text, { columns = 10, rows = 16, keepPunctuation = false } = {}) {
  if (!Number.isInteger(columns) || columns < 6 || columns > 12 || !Number.isInteger(rows) || rows < 10 || rows > 22) {
    throw new RangeError('章法参数超出范围');
  }
  const chars = characters(text, keepPunctuation);
  if (chars.length > MAX_CHARACTERS) throw new RangeError(`正文最多支持 ${MAX_CHARACTERS} 字，请分篇制作。`);
  const capacity = (columns - 2) * rows;
  const pages = [];
  for (let offset = 0; offset < chars.length; offset += capacity) {
    const page = chars.slice(offset, offset + capacity);
    pages.push({ characters: page, columns: Array.from({ length: columns - 2 }, (_, i) => page.slice(i * rows, (i + 1) * rows)), offset });
  }
  return { pages, count: chars.length, capacity, columns, rows };
}

export function random(seed) {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}

export function safeFilename(title) {
  return (title || '自在小楷').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim().slice(0, 60) || '自在小楷';
}
