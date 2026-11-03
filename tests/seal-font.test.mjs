import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSealFont } from '../dist/seal-font.js';

test('wallpaper seal uses its own text instead of the manuscript fallback', () => {
  const inherited = { seal: '风', sealFont: 'seal', sealRenderFont: 'kai', sealReady: true };
  const supported = resolveSealFont('清風明月', inherited);
  assert.equal(supported.renderFont, 'seal');
  assert.deepEqual(supported.missing, []);
  const missing = resolveSealFont('风', { ...inherited, seal: '自在', sealRenderFont: 'seal' });
  assert.equal(missing.renderFont, 'kai');
  assert.deepEqual(missing.missing, ['风']);
});

test('wallpaper checks imported seal coverage and loading independently', () => {
  const settings = { sealFont: 'custom', customSealCoverage: new Set(['自'.codePointAt(0)]) };
  assert.equal(resolveSealFont('自', settings).renderFont, 'custom');
  assert.equal(resolveSealFont('自在', settings).renderFont, 'kai');
  assert.equal(resolveSealFont('自在', { sealFont: 'custom' }).renderFont, 'custom');
  assert.equal(resolveSealFont('自在', { sealFont: 'seal', sealReady: false }).renderFont, 'kai');
  const loading = { sealFont: 'seal', sealPending: true };
  assert.equal(resolveSealFont('自在', loading).pending, true);
  assert.equal(resolveSealFont('自在', loading).renderFont, 'kai');
  assert.equal(resolveSealFont('', loading).pending, false);
});
