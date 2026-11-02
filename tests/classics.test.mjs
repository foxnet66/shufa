import test from 'node:test';
import assert from 'node:assert/strict';
import { CLASSICS, CLASSICS_BY_ID, CATEGORIES, searchClassics } from '../dist/classics.js';
import { characters, paginate, MAX_CHARACTERS } from '../dist/layout.js';

test('all selected classics fit manuscript fields and paginate without losing text', () => {
  assert.equal(CLASSICS.length, 24);
  assert.equal(new Set(CLASSICS.map(entry => entry.id)).size, CLASSICS.length);
  for (const entry of CLASSICS) {
    assert.ok(entry.title.length <= 14 && entry.author.length <= 20, entry.id);
    assert.ok(CATEGORIES.includes(entry.category), entry.id);
    assert.ok(entry.count > 0 && entry.count <= MAX_CHARACTERS, entry.id);
    assert.equal(entry.count, characters(entry.body).length);
    for (const composition of ['album', 'free']) {
      const result = paginate(entry.body, { composition, columns: 10, rows: 15 });
      const restored = result.pages.flatMap(page => page.columns.flat()).join('');
      assert.equal(restored, characters(entry.body).join(''), entry.id);
    }
  }
  assert.equal(CLASSICS_BY_ID.lanting.excerpt, true);
  assert.match(CLASSICS_BY_ID.lanting.label, /节选/);
  assert.equal(CLASSICS_BY_ID.jingyesi.count, 20);
});

test('readers can search by author, title or verse and combine a genre', () => {
  assert.ok(searchClassics(' 李 白 ').length >= 3);
  assert.equal(searchClassics('欲穷千里目')[0].id, 'dengguanquelou');
  assert.deepEqual(searchClassics('明月几时有', '词').map(entry => entry.id), ['shuidiaogetou']);
  assert.equal(searchClassics('不存在的篇名').length, 0);
  assert.equal(searchClassics('', '古文').length, 3);
  assert.ok(searchClassics('兰亭')[0].excerpt);
});
