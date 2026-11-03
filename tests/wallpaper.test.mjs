import test from 'node:test';
import assert from 'node:assert/strict';
import { wallpaperLayout, WALLPAPER_RATIOS, WALLPAPER_THEMES, WALLPAPER_INKS, wallpaperInk } from '../dist/wallpaper-layout.js';
import { PAPERS } from '../dist/paper.js';
import { characters } from '../dist/layout.js';
import { WALLPAPER_QUOTES, quoteLayout, restoredQuoteLayout } from '../dist/wallpaper-quotes.js';

test('every ink scheme stays readable on both light and dark paper bases',()=>{
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const luminance=rgb=>rgb.map(c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  for(const [themeId,theme] of Object.entries(WALLPAPER_THEMES)){
    let base=rgb(PAPERS[theme.paper].base);
    if(theme.tint){const tint=rgb(theme.tint),alpha=['ink','vermilion'].includes(themeId)?.98:.78;base=base.map((v,i)=>v*(1-alpha)+tint[i]*alpha);}
    for(const ink of Object.keys(WALLPAPER_INKS)){
      const a=luminance(base),b=luminance(rgb(wallpaperInk(themeId,ink)));
      assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,`${themeId}/${ink} loses contrast`);
    }
    assert.equal(wallpaperInk(themeId),theme.ink);
  }
  assert.equal(wallpaperInk('unknown','unknown'),WALLPAPER_THEMES.xuan.ink);
  assert.equal(wallpaperInk('ink','constructor'),WALLPAPER_THEMES.ink.ink);
});

test('poetry has equal size, equal spacing and aligned first characters',()=>{
  const g=wallpaperLayout({main:'长风破浪会有时',sub:'直挂云帆济沧海'});
  const [right,left]=g.columns;
  assert.equal(right.size,left.size);
  assert.equal(right.step,left.step);
  assert.equal(right.y,left.y);
  assert.equal(right.units.length,left.units.length);
  assert.ok(right.x>left.x);
  const single=wallpaperLayout({main:'宁静致远'});
  assert.equal(single.columns[0].x,single.width/2);
});

test('poems and original messages select distinct layouts without misattribution',()=>{
  for(const quote of WALLPAPER_QUOTES){
    assert.ok(characters(quote.main,true).length<=24);
    assert.ok(characters(quote.sub,true).length<=60);
    const layout=quoteLayout(quote),g=wallpaperLayout({...quote,layout});
    if(quote.category==='poetry'){
      assert.equal(layout,'paired');assert.ok(quote.author);
      assert.equal(g.columns[0].size,g.columns[1].size);
    } else {
      assert.equal(layout,'staggered');assert.equal(quote.author,'');
      assert.ok(g.columns[0].size>g.columns[1].size);
    }
  }
});

test('legacy preset poetry migrates while custom text and new manual choices keep their layout',()=>{
  const poem=WALLPAPER_QUOTES[3];
  assert.equal(restoredQuoteLayout({layout:'staggered'},poem),'paired');
  assert.equal(restoredQuoteLayout({version:2,layout:'staggered'},poem),'staggered');
  assert.equal(restoredQuoteLayout({layout:'single'},poem),'single');
  assert.equal(restoredQuoteLayout({layout:'staggered'},undefined),'staggered');
  assert.equal(restoredQuoteLayout({layout:'staggered'},WALLPAPER_QUOTES[6]),'staggered');
});

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
