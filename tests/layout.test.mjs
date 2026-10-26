import test from 'node:test';
import assert from 'node:assert/strict';
import { paginate, characters, safeFilename, signaturePosition, verseRows, pageGeometry, verticalCenters } from '../dist/layout.js';

test('long text is preserved across pages in right-to-left column order', () => {
  const text = Array.from({ length: 397 }, (_, i) => String.fromCodePoint(0x4e00 + i)).join('');
  const result = paginate(text, { columns: 10, rows: 16 });
  assert.equal(result.pages.length, 4);
  assert.equal(result.capacity, 128);
  assert.deepEqual(result.pages.map(p => p.characters.length), [128, 128, 128, 13]);
  assert.equal(result.pages.flatMap(p => p.columns.flat()).join(''), text);
  assert.equal(result.pages[1].offset, 128);
});
test('boundary pages never add a blank sheet', () => {
  assert.equal(paginate('春'.repeat(128)).pages.length, 1);
  assert.equal(paginate('春'.repeat(129)).pages.length, 2);
  assert.equal(paginate(' ，。\n ').pages.length, 0);
});
test('punctuation toggle and grapheme segmentation preserve text units', () => {
  assert.deepEqual(characters('春，江。\n𠮷👨‍👩‍👧‍👦'), ['春', '江', '𠮷', '👨‍👩‍👧‍👦']);
  assert.deepEqual(characters('春，江。', true), ['春', '，', '江', '。']);
});
test('invalid or oversized input is rejected instead of truncated', () => {
  assert.throws(() => paginate('春'.repeat(4001)), /4000/);
  assert.throws(() => paginate('春', { columns: 2, rows: 16 }), RangeError);
  assert.throws(() => paginate('春', { columns: 8, rows: 0 }), RangeError);
});
test('export filenames cannot introduce paths', () => {
  assert.equal(safeFilename('../春江:夜?'), '..春江夜');
  assert.equal(safeFilename(' /:*? '), '自在小楷');
});

test('verse lines retain column breaks, wrap long lines, and preserve every character', () => {
  const text = '空山新雨后，天气晚来秋。\n\n明月松间照，清泉石上流。\n' + '春'.repeat(30);
  const layout = paginate(text, { columns: 6, rows: 12, lineMode: 'lines' });
  assert.deepEqual(layout.pages.map(p => p.columns.map(c => c.length)), [[10, 10, 12, 12], [6]]);
  assert.equal(layout.pages.flatMap(p => p.columns.flat()).join(''), characters(text).join(''));
  assert.equal(layout.pages[1].offset, 44);
});

test('signature follows sparse text and only final pages carry a seal', () => {
  const settings = { columns: 10, rows: 16, author: '王维', seal: '自在' };
  const sparse = paginate('春'.repeat(20), settings).pages[0];
  const full = paginate('春'.repeat(128), settings).pages[0];
  const a = signaturePosition(sparse, settings, true), b = signaturePosition(full, settings, true);
  assert.ok(a.x > b.x, 'sparse signature should follow text rather than sit on the far left');
  assert.ok(a.sealY < 1770 && b.sealY < 1770);
  assert.deepEqual(signaturePosition(full, settings, false).sealChars, []);
  const long = signaturePosition(full, { ...settings, rows: 12, colophon: '春'.repeat(20) }, true);
  assert.ok(long.y >= 180);
  assert.ok(long.sealY + long.sealSize / 2 <= 1770);
});

test('album reserves only the inscription column and keeps text complete', () => {
  const settings = { composition: 'album', columns: 10, rows: 15, title: '山居秋暝', author: '王维', seal: '自在' };
  const layout = paginate('春'.repeat(136), settings);
  assert.equal(layout.capacity, 135);
  assert.deepEqual(layout.pages.map(p => p.characters.length), [135, 1]);
  const position = signaturePosition(layout.pages[1], settings, true);
  assert.ok(position.x > 1300);
  assert.ok(position.y > 500 && position.sealY < 1600);
  assert.equal(pageGeometry(settings).height, 1760);
  assert.equal(pageGeometry({}).height, 2000);
});

test('verse classification chooses five or seven character layouts conservatively', () => {
  assert.equal(verseRows('空山新雨后，天气晚来秋。明月松间照，清泉石上流。').rows, 15);
  assert.equal(verseRows('折戟沉沙铁未销，自将磨洗认前朝。东风不与周郎便，铜雀春深锁二乔。').rows, 14);
  assert.equal(verseRows('这是散文，长短句子不一。').genre, '诗文');
});

test('optical vertical spacing remains ordered within the writing area', () => {
  const centers = verticalCenters([70, 8, 65, 55, 73], 100, 116);
  assert.ok(centers.every((y, i) => i === 0 || y > centers[i - 1]));
  assert.ok(centers[0] >= 116 && centers.at(-1) < 616);
  assert.notEqual(Math.round(centers[1] - centers[0]), Math.round(centers[3] - centers[2]));
});
