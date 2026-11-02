import test from 'node:test';
import assert from 'node:assert/strict';
import { CLASSICS, CLASSICS_BY_ID, CATEGORIES, COLLECTIONS, searchClassics } from '../dist/classics.js';
import { characters, paginate, MAX_CHARACTERS, MAX_TITLE_CHARACTERS, titleColumn, pageGeometry } from '../dist/layout.js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

test('all selected classics fit manuscript fields and paginate without losing text', () => {
  assert.equal(CLASSICS.length, 970);
  assert.equal(new Set(CLASSICS.map(entry => entry.id)).size, CLASSICS.length);
  for (const entry of CLASSICS) {
    assert.ok(entry.title.length <= MAX_TITLE_CHARACTERS && entry.author.length <= 20, entry.id);
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
  assert.ok(searchClassics('明月几时有', '词').some(entry => entry.id === 'shuidiaogetou'));
  assert.equal(searchClassics('不存在的篇名').length, 0);
  assert.equal(searchClassics('', '古文').length, 23);
  assert.ok(searchClassics('兰亭')[0].excerpt);
});

test('expanded collections retain text checksums, attribution and distinct manuscripts', () => {
  assert.deepEqual(COLLECTIONS, ['常用选篇', '唐诗选', '宋词选', '诗经', '论语']);
  assert.equal(searchClassics('', '', '诗经').length, 305);
  assert.equal(searchClassics('', '', '论语').length, 20);
  assert.ok(searchClassics('关关雎鸠', '四言', '诗经').some(entry => entry.title === '关雎'));
  assert.ok(searchClassics('学而时习之', '', '论语').some(entry => entry.title.includes('学而')));
  assert.ok(searchClassics('李白', '', '唐诗选').length > 10);
  assert.ok(searchClassics('静夜思', '', '唐诗选').some(entry => entry.id === 'jingyesi'));
  assert.ok(searchClassics('明月几时有', '', '宋词选').some(entry => entry.id === 'shuidiaogetou'));
  assert.ok(searchClassics('长恨歌', '', '唐诗选').some(entry => entry.count > 800));
  assert.ok(searchClassics('长恨歌', '', '唐诗选').some(entry => entry.body.endsWith('此恨绵绵无绝期。')));
  const texts = CLASSICS.map(entry => entry.author.split(' · ').at(-1) + '|' + characters(entry.body).join(''));
  assert.equal(new Set(texts).size, texts.length);
  for (const entry of CLASSICS.filter(entry => entry.bodyHash)) {
    assert.equal(createHash('sha256').update(entry.body).digest('hex'), entry.bodyHash, entry.id);
    assert.ok(entry.source.includes('b8594f81a89752241442f2ce267d6f66f96704ee'));
  }
  const license = readFileSync(new URL('../dist/data/chinese-poetry-LICENSE.txt', import.meta.url), 'utf8');
  assert.ok(license.includes('Copyright (c) 2016 JackeyGao'));
});

test('long original titles are preserved and fit the inscription column', () => {
  const entry = CLASSICS.reduce((longest, entry) => entry.title.length > longest.title.length ? entry : longest);
  assert.ok(entry.title.length > 30);
  for (const composition of ['album', 'free']) {
    const settings = { title: entry.title, composition, rows: 15, columns: 10 };
    const title = titleColumn(settings), bounds = pageGeometry(settings);
    assert.equal(title.chars.join(''), characters(entry.title, true).join(''));
    assert.ok(title.y >= bounds.top && title.lastY < bounds.bottom);
    assert.ok(title.step > 0);
  }
});
