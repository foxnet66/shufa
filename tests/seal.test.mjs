import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sealCells } from '../dist/seal.js';
import { fontCoverage } from '../dist/font-coverage.js';
import { sealCoverage } from '../dist/fonts/seal-coverage.js';

test('one to four character seal cells remain inside the frame without overlap', () => {
  for (let count = 1; count <= 4; count++) {
    const cells = sealCells(count);
    assert.equal(cells.length, count);
    for (const [i, a] of cells.entries()) {
      assert.ok(a.x >= 50 && a.y >= 50 && a.x + a.width <= 550 && a.y + a.height <= 550);
      for (const b of cells.slice(i + 1)) assert.ok(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
    }
  }
});
test('three character layout uses a tall first character on the right', () => {
  const [a, b, c] = sealCells(3);
  assert.ok(a.x > b.x && a.height > b.height);
  assert.equal(b.x, c.x); assert.ok(b.y < c.y);
  const four = sealCells(4);
  assert.ok(four[0].x > four[2].x && four[0].y < four[1].y);
});
test('bundled seal font coverage is reproducible and reports missing simplified characters', () => {
  const data = readFileSync(new URL('../dist/fonts/CNS-ShuoWen.ttf', import.meta.url));
  const coverage = fontCoverage(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
  assert.deepEqual(coverage, sealCoverage);
  for (const char of '自在清風明月') assert.ok(coverage.has(char.codePointAt(0)));
  assert.equal(coverage.has('风'.codePointAt(0)), false);
});
