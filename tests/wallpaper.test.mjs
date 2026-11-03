import test from 'node:test';
import assert from 'node:assert/strict';
import { wallpaperLayout, WALLPAPER_RATIOS } from '../dist/wallpaper-layout.js';
import { characters } from '../dist/layout.js';

test('wallpaper layouts preserve all graphemes within clock and crop safe areas',()=>{
  for(const layout of ['staggered','paired','single'])for(const ratio of Object.keys(WALLPAPER_RATIOS))for(const safeTop of [.28,.34,.42]){
    const main='明月𠮷'.repeat(8),sub='清泉石上流'.repeat(12);
    const g=wallpaperLayout({main,sub,layout,ratio,safeTop});
    assert.equal(g.columns.filter(c=>c.kind==='main').flatMap(c=>c.units).join(''),main);
    assert.equal(g.columns.filter(c=>c.kind==='sub').flatMap(c=>c.units).join(''),sub);
    for(const c of g.columns){
      assert.ok(c.x-c.size/2>=g.width*.05);
      assert.ok(c.x+c.size/2<=g.width*.95);
      assert.ok(c.y-c.size/2>g.height*.20);
      assert.ok(c.y+(c.units.length-1)*c.step+c.size/2<=g.height*.88);
    }
    assert.ok(g.seal.y+g.seal.size/2<g.height*.93);
  }
});

test('wallpaper rejects excess input instead of silently truncating it',()=>{
  assert.throws(()=>wallpaperLayout({main:'春'.repeat(25)}),/24/);
  assert.throws(()=>wallpaperLayout({sub:'春'.repeat(61)}),/60/);
  assert.equal(wallpaperLayout({main:'𠮷'}).columns[0].units.length,1);
  assert.equal(wallpaperLayout({main:'',sub:''}).columns.length,0);
  const result=wallpaperLayout({main:'明月，清泉。'});
  assert.deepEqual(result.columns.flatMap(c=>c.units),characters('明月，清泉。',true));
});
