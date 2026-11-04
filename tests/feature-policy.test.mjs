import test from 'node:test';
import assert from 'node:assert/strict';
import { BASIC_DEFAULTS, editorFeature, wallpaperFeature, pdfFeature } from '../dist/feature-policy.js';

test('basic creation stays open while advanced composition, mounting and seal choices require an invite', () => {
  for (const [id,value] of Object.entries(BASIC_DEFAULTS)) assert.equal(editorFeature(id,value),null);
  for (const [id,value] of [['composition','free'],['font','longcang'],['paper','aged'],['ink','dense'],['seal','自在']]) assert.equal(editorFeature(id,value),null);
  for (const mount of ['mat','silk','wood']) assert.equal(editorFeature('mount',mount),'mount');
  assert.equal(editorFeature('composition','scroll'),'scroll');
  for (const [id,value] of [['sealStyle','relief'],['sealTexture','worn'],['sealFont','custom']]) assert.equal(editorFeature(id,value),'seal');
});

test('plain wallpaper and single-page PDF stay open; colored paper and multi-page PDF require an invite', () => {
  assert.equal(wallpaperFeature('theme','xuan'),null);
  for (const ink of ['auto','ink']) assert.equal(wallpaperFeature('ink',ink),null);
  for (const ink of ['tea','jade','vermilion','gold']) assert.equal(wallpaperFeature('ink',ink),'colors');
  for (const theme of ['celadon','ink','vermilion','silk']) assert.equal(wallpaperFeature('theme',theme),'colors');
  assert.equal(pdfFeature(0),null); assert.equal(pdfFeature(1),null);
  assert.equal(pdfFeature(2),'pdf'); assert.equal(pdfFeature(100),'pdf');
});
