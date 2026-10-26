import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BODY_FONTS } from '../dist/body-fonts.js';
import { FONT_FAMILIES } from '../dist/renderer.js';
import { fontCoverage } from '../dist/font-coverage.js';

test('bundled handwriting fonts render the sample poems and retain OFL licenses', () => {
  for (const [id, meta] of Object.entries(BODY_FONTS)) {
    const data = readFileSync(new URL(`../dist/fonts/${meta.file}`, import.meta.url));
    const coverage = fontCoverage(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
    for (const c of '山居秋暝空山新雨后天气晚来秋明月松间照清泉石上流自在小楷') assert.ok(coverage.has(c.codePointAt(0)), `${meta.name} missing ${c}`);
    assert.ok(FONT_FAMILIES[id].includes(meta.family));
    const license = readFileSync(new URL(`../dist/fonts/${id === 'mashan' ? 'MaShanZheng' : 'LongCang'}-OFL.txt`, import.meta.url), 'utf8');
    assert.ok(license.includes('SIL OPEN FONT LICENSE Version 1.1'));
    assert.ok(license.includes('Copyright 2018'));
  }
});
