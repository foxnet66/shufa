import test from 'node:test';
import assert from 'node:assert/strict';
import { mountGeometry, MOUNTS } from '../dist/mounting.js';
import { pageGeometry, paginate, signaturePosition } from '../dist/layout.js';

test('mounts add borders outside the entire unchanged artwork', () => {
  for (const composition of ['album', 'free']) for (const mount of Object.keys(MOUNTS)) {
    const settings = { composition, mount }, g = mountGeometry(settings), paper = pageGeometry(settings);
    assert.equal(g.paperWidth, paper.width); assert.equal(g.paperHeight, paper.height);
    assert.equal(g.x * 2 + g.paperWidth, g.width); assert.equal(g.y * 2 + g.paperHeight, g.height);
    assert.ok(g.x >= 0 && g.y >= 0);
    if (mount === 'none') assert.equal(g.width, 1600);
  }
});
test('mount selection cannot change pagination or lose text', () => {
  const text = '春'.repeat(400), base = { composition: 'album', columns: 10, rows: 15 };
  for (const mount of Object.keys(MOUNTS)) assert.deepEqual(paginate(text, { ...base, mount }), paginate(text, base));
  assert.equal(mountGeometry({ mount: 'unknown' }).mount, 'none');
  const settings = { ...base, title: '兰亭集序', author: '王羲之' };
  const position = signaturePosition(paginate(text, settings).pages[0], settings, false);
  assert.ok(position.noteSize > 20, 'single continuation mark should remain readable');
});
