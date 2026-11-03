import { characters } from './layout.js';

export const WALLPAPER_RATIOS = { phone: { width:1440, height:3120 }, wide:{ width:1440, height:2560 }, card:{ width:1440, height:1920 } };
export const WALLPAPER_THEMES = {
  xuan:{ name:'月白素宣', paper:'white', ink:'#302e27', accent:'#a13f32' },
  celadon:{ name:'青瓷听雨', paper:'white', tint:'#becfcb', ink:'#28443f', accent:'#9c493d' },
  ink:{ name:'黛墨泥金', paper:'white', tint:'#283532', ink:'#e1cda1', accent:'#c18e56' },
  vermilion:{ name:'朱笺寄愿', paper:'warm', tint:'#873c32', ink:'#f2dfb0', accent:'#e6cda0' },
  silk:{ name:'松烟宋锦', paper:'warm', tint:'#c9c5ac', ink:'#384237', accent:'#984c38' }
};

export const WALLPAPER_INKS = {
  auto:{name:'随纸配墨',description:'沿用每种纸色的推荐配色。'},
  ink:{name:'素墨',light:'#262c29',dark:'#f4eee1',description:'浅纸松烟，深纸月白。'},
  tea:{name:'茶褐',light:'#684431',dark:'#f0d1b1',description:'浅纸茶褐，深纸暖杏。'},
  jade:{name:'石青',light:'#254e49',dark:'#b9e4d8',description:'浅纸青墨，深纸浅青。'},
  vermilion:{name:'朱砂',light:'#8c3029',dark:'#ffc6b4',description:'浅纸朱砂，深纸浅赭。'},
  gold:{name:'泥金',light:'#65511f',dark:'#e8d4a0',description:'浅纸古金，深纸浅金。'}
};

export function wallpaperInk(themeId, inkId='auto') {
  const theme=Object.hasOwn(WALLPAPER_THEMES,themeId)?WALLPAPER_THEMES[themeId]:WALLPAPER_THEMES.xuan;
  if(inkId==='auto' || !Object.hasOwn(WALLPAPER_INKS,inkId))return theme.ink;
  return WALLPAPER_INKS[inkId][['ink','vermilion'].includes(themeId)?'dark':'light'];
}

// Explicit bounds keep every grapheme in the composition, including emoji and astral Han.
export function wallpaperLayout({ main='', sub='', layout='paired', ratio='phone', safeTop=.34 } = {}) {
  const heading = characters(main, true), note = characters(sub, true);
  if (heading.length > 24 || note.length > 60) throw new RangeError(layout === 'paired' ? '上句最多 24 字，下句最多 60 字。' : '主句最多 24 字，辅句最多 60 字。');
  const { width, height } = WALLPAPER_RATIOS[ratio] || WALLPAPER_RATIOS.phone;
  const top = height * Math.max(.25, Math.min(.45, Number(safeTop) || .34));
  const bottom = height * .84, available = bottom - top;
  const columns = [];
  const add = (units, x, y, size, step, kind) => { if(units.length) columns.push({units,x,y,size,step,kind}); };
  if (layout === 'paired') {
    const size = Math.min(165, available / Math.max(1, heading.length, note.length) * .75);
    const step = Math.min(size * 1.4, available / Math.max(1, heading.length, note.length));
    add(heading, width * (note.length ? .60 : .5), top, size, step, 'main');
    add(note, width * (heading.length ? .40 : .5), top, size, step, 'sub');
  } else {
    const mainRows = layout === 'single' ? 12 : 8;
    const mainColumns = Math.max(1, Math.ceil(heading.length / mainRows));
    const rows = Math.max(1, Math.min(mainRows, heading.length));
    const size = Math.min(layout === 'single' ? 186 : 210, available * .6 / rows);
    const step = size * 1.18;
    const x = width * (layout === 'single' ? .56 : .65);
    for (let i = 0; i < mainColumns; i++) add(heading.slice(i*mainRows,(i+1)*mainRows), x-i*size*1.2, top, size, step, 'main');
    const noteRows = 20, noteColumns = Math.ceil(note.length / noteRows);
    const noteSize = Math.min(60, available * .78 / Math.max(1, Math.min(noteRows, note.length)));
    const noteX = Math.max(width * .23, x - (mainColumns-.3)*size*1.2);
    for(let i=0;i<noteColumns;i++) add(note.slice(i*noteRows,(i+1)*noteRows), noteX-i*noteSize*1.6, top+available*.14, noteSize, noteSize*1.2, 'sub');
  }
  const leftmost = Math.min(width*.5,...columns.map(c=>c.x-c.size/2));
  // Move very wide short inscriptions back inside the sheet without cropping.
  if(leftmost < width*.1) { const shift=width*.1-leftmost; for(const c of columns)c.x+=shift; }
  const sealX = Math.max(width*.13, Math.min(width*.76, (columns.at(-1)?.x || width*.5)));
  const textBottom = Math.max(top,...columns.map(c=>c.y+Math.max(0,c.units.length-1)*c.step+c.size/2));
  return {width,height,top,bottom,columns,seal:{x:sealX,y:Math.min(height*.90, Math.max(height*.77,textBottom+95)),size:70}};
}
