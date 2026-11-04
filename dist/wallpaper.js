import { characters, random, safeFilename } from './layout.js';
import { wallpaperLayout, WALLPAPER_THEMES, WALLPAPER_INKS, wallpaperInk } from './wallpaper-layout.js';
import { FONT_FAMILIES } from './renderer.js';
import { paintPaper, paintPaperTexture } from './paper.js';
import { drawSeal } from './seal.js';
import { resolveSealFont } from './seal-font.js';
import { loadBodyFont, bodyFontState, BODY_FONTS } from './body-fonts.js';
import { WALLPAPER_QUOTES, WALLPAPER_CATEGORIES, quoteLayout, restoredQuoteLayout } from './wallpaper-quotes.js';
import { hasAdvancedAccess, onAccessChange } from './feature-access.js';

export function drawWallpaper(canvas, state, inherited) {
  const g = wallpaperLayout(state), theme = WALLPAPER_THEMES[state.theme] || WALLPAPER_THEMES.xuan;
  const ink=wallpaperInk(state.theme,state.ink);
  canvas.width = g.width; canvas.height = g.height;
  const ctx = canvas.getContext('2d');
  paintPaper(ctx, theme.paper, 1781, g.height, g.width);
  if (theme.tint) {
    ctx.save(); ctx.globalAlpha = ['ink','vermilion'].includes(state.theme) ? .98 : .78;
    ctx.fillStyle = theme.tint; ctx.fillRect(0,0,g.width,g.height); ctx.restore();
    paintPaperTexture(ctx, theme.paper, 1781, g.height, g.width, { dark:['ink','vermilion'].includes(state.theme), weave:state.theme==='silk' });
  }
  const rng = random(1781);
  if (state.theme === 'ink' || state.theme === 'vermilion') {
    for(let i=0;i<500;i++){ctx.fillStyle=`rgba(231,205,151,${rng()*.16})`;ctx.fillRect(rng()*g.width,rng()*g.height,1+rng()*3,1+rng()*4);}
  }
  ctx.strokeStyle = ['ink','vermilion'].includes(state.theme) ? '#e4cfa337' : '#89744e30';
  ctx.lineWidth=2; ctx.strokeRect(54,54,g.width-108,g.height-108);
  const selected = state.font === 'inherit' ? inherited.font : state.font;
  const family = FONT_FAMILIES[BODY_FONTS[selected] && bodyFontState(selected).status !== 'ready' ? 'kai' : selected] || FONT_FAMILIES.kai;
  for(const column of g.columns) {
    ctx.fillStyle=ink; ctx.font=`${column.size}px ${family}`;
    ctx.textAlign='left';ctx.textBaseline='alphabetic';
    for(const [i,char] of column.units.entries()) {
      const m=ctx.measureText(char), w=m.actualBoundingBoxLeft+m.actualBoundingBoxRight;
      ctx.save();ctx.translate(column.x,column.y+i*column.step);ctx.scale(Math.min(1,column.size*1.1/Math.max(1,w)),1);
      ctx.fillText(char,(m.actualBoundingBoxLeft-m.actualBoundingBoxRight)/2,(m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2);ctx.restore();
    }
  }
  const seal = resolveSealFont(state.seal, inherited), stamp = seal.chars;
  if(stamp.length && g.columns.length) {
    const plate=document.createElement('canvas');
    drawSeal(plate,stamp,{...inherited,sealRenderFont:seal.renderFont,seed:1781});
    ctx.drawImage(plate,g.seal.x-g.seal.size/2,g.seal.y-g.seal.size/2,g.seal.size,g.seal.size);
  }
  const author=characters(state.author,true);
  ctx.font=`32px ${FONT_FAMILIES.song}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=ink;
  // Draw each grapheme explicitly; never truncate attribution to fit the footer.
  author.forEach((c,i)=>ctx.fillText(c,g.width/2+(i-(author.length-1)/2)*38,g.height*.94));
  return g;
}

export function initWallpaperStudio({getSettings,notify}) {
  const $=id=>document.getElementById(id), ids=['wpMain','wpSub','wpAuthor','wpSeal','wpFont','wpRatio','wpSafeTop','wpClock','wpInk'];
  const canvas=$('wallpaperCanvas'); let layout='paired',theme='xuan',category='poetry',timer,busy=false,valid=false;
  const matchingQuote=()=>WALLPAPER_QUOTES.find(q=>q.main===$('wpMain').value && q.sub===$('wpSub').value && q.author===$('wpAuthor').value);
  try {
    const saved=JSON.parse(localStorage.getItem('shufa-wallpaper-v1') || 'null');
    if(saved && typeof saved==='object') {
      for(const id of ids) {
        const field=$(id), value=saved[id];
        if(field.type==='checkbox'){if(typeof value==='boolean')field.checked=value;}
        else if(typeof value==='string' && (field.tagName!=='SELECT' || [...field.options].some(x=>x.value===value)))field.value=value.slice(0,field.maxLength>0?field.maxLength:240);
      }
      layout=restoredQuoteLayout(saved,matchingQuote());
      if(Object.hasOwn(WALLPAPER_CATEGORIES,saved.category))category=saved.category;
      if(WALLPAPER_THEMES[saved.theme])theme=saved.theme;
    }
  } catch {}
  const read=()=>({main:$('wpMain').value,sub:$('wpSub').value,author:$('wpAuthor').value,seal:$('wpSeal').value,font:$('wpFont').value,ratio:$('wpRatio').value,safeTop:Number($('wpSafeTop').value),ink:hasAdvancedAccess() || ['auto','ink'].includes($('wpInk').value)?$('wpInk').value:'auto',layout,theme:hasAdvancedAccess()?theme:'xuan'});
  let autoAuthor=!!matchingQuote();
  function showQuotes() {
    document.querySelectorAll('[data-wp-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.wpCategory===category)));
    $('wpQuoteNote').textContent=category==='poetry'?'诗词默认等大对读；选句后仍可自选章法。':'以下为本站拟写的日常寄语，不署古人名；选用后可自由改写。';
    $('wpQuoteList').replaceChildren(...WALLPAPER_QUOTES.filter(q=>q.category===category).map(quote=>{
      const button=document.createElement('button');button.type='button';button.textContent=quote.main;
      button.title=quote.main+' · '+quote.sub;
      button.addEventListener('click',()=>{
        $('wpMain').value=quote.main;$('wpSub').value=quote.sub;$('wpAuthor').value=quote.author;
        layout=quoteLayout(quote);autoAuthor=true;update();
      });return button;
    }));
  }
  const fontId=()=>read().font==='inherit'?getSettings().font:read().font;
  function update() {
    clearTimeout(timer); const state=read(), inherited=getSettings();
    $('wpClockOverlay').hidden=!$('wpClock').checked;
    $('wpPhone').dataset.theme=state.theme;
    document.querySelectorAll('[data-wp-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.wpTheme===state.theme)));
    document.querySelectorAll('[data-wp-layout]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.wpLayout===layout)));
    document.querySelectorAll('[data-wp-ink]').forEach(b=>{
      b.setAttribute('aria-pressed',String(b.dataset.wpInk===state.ink));
      b.style.setProperty('--wp-ink',wallpaperInk(state.theme,b.dataset.wpInk));
    });
    $('wpInkNote').textContent=(WALLPAPER_INKS[state.ink] || WALLPAPER_INKS.auto).description+' 正文与落款共用此色，印泥独立。';
    $('wpMainLabel').textContent=layout==='paired'?'上句':'主句';
    $('wpSubLabel').textContent=layout==='paired'?'下句':'辅句';
    try {
      const g=drawWallpaper(canvas,state,inherited);valid=g.columns.length>0;
      $('wpDimensions').textContent=`${g.width} × ${g.height} PNG`;
      $('wpStatus').textContent=valid?(layout==='paired'?'上句最多 24 字，下句最多 60 字。':'主句最多 24 字，辅句最多 60 字。')+'壁纸草稿独立保存。':'填入一句喜欢的话，即可生成壁纸。';
      $('wpStatus').classList.remove('wp-error');
      if($('wpDialog').open)drawWallpaper($('wpLarge'),state,inherited);
      const id=fontId(), status=bodyFontState(id).status;
      if(BODY_FONTS[id] && status==='idle')loadBodyFont(id).then(update).catch(update);
      const waiting=BODY_FONTS[id] && status!=='ready';
      const seal=resolveSealFont(state.seal,inherited), waitingSeal=seal.pending;
      $('wpDownload').disabled=!valid||busy||waiting||waitingSeal;
      $('wpInspect').disabled=!valid;
      if(waiting)$('wpStatus').textContent=status==='error'?'字体未能加载，请换一种字体后保存。':'正在准备字体，就绪后即可保存。';
      else if(waitingSeal)$('wpStatus').textContent='正在准备印章字体，就绪后即可保存。';
      else if (BODY_FONTS[id]) {
        const coverage=bodyFontState(id).coverage;
        const missing=[...new Set(characters(state.main+state.sub,true))].filter(c=>coverage && !coverage.has(c.codePointAt(0)));
        if(missing.length)$('wpStatus').textContent+=`「${missing.slice(0,6).join('、')}」等 ${missing.length} 字将使用设备后备字体。`;
      }
      if(seal.chars.length && !waitingSeal) {
        if(inherited.sealFont==='seal' && inherited.sealReady===false)$('wpStatus').textContent+=' 篆书加载失败，印章整方暂用楷体。';
        else if(seal.missing.length)$('wpStatus').textContent+=` 印章字体缺「${seal.missing.join('、')}」，整方暂用楷体。`;
      }
      try {localStorage.setItem('shufa-wallpaper-v1',JSON.stringify({...Object.fromEntries(ids.map(id=>[id,$(id).type==='checkbox'?$(id).checked:$(id).value])),layout,theme,category,version:2}));}catch{$('wpStatus').textContent+=' 本机存储不可用。';}
    } catch(error) {
      valid=false;canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
      $('wpDownload').disabled=$('wpInspect').disabled=true;
      $('wpStatus').textContent=error.message; $('wpStatus').classList.add('wp-error');
    }
  }
  ids.forEach(id=>$(id).addEventListener('input',()=>{
    if((id==='wpMain'||id==='wpSub') && autoAuthor){$('wpAuthor').value='';autoAuthor=false;}
    if(id==='wpAuthor')autoAuthor=false;
    clearTimeout(timer);timer=setTimeout(update,120);
  }));
  document.querySelectorAll('[data-wp-layout]').forEach(b=>b.addEventListener('click',()=>{layout=b.dataset.wpLayout;update();}));
  document.querySelectorAll('[data-wp-theme]').forEach(b=>b.addEventListener('click',()=>{theme=b.dataset.wpTheme;update();}));
  document.querySelectorAll('[data-wp-ink]').forEach(b=>b.addEventListener('click',()=>{$('wpInk').value=b.dataset.wpInk;update();}));
  document.querySelectorAll('[data-wp-category]').forEach(b=>b.addEventListener('click',()=>{
    category=b.dataset.wpCategory;showQuotes();update();
  }));
  $('wpFromPoem').addEventListener('click',()=>{
    const original=getSettings(),clauses=original.body.split(/[，。！？；,.!?;\n]+/u).map(x=>x.trim()).filter(Boolean);
    if(!clauses.length){notify('请先在册页中录入诗文。',true);return;}
    if(characters(clauses[0],true).length>24 || characters(clauses[1]||'',true).length>60){notify('这一段较长，请自行选句填写；原文未作截取。',true);return;}
    $('wpMain').value=clauses[0];$('wpSub').value=clauses[1]||'';$('wpAuthor').value=original.author;
    layout='paired';category='poetry';showQuotes();autoAuthor=true;update();
  });
  $('wpInspect').addEventListener('click',()=>{update();if(!valid)return;drawWallpaper($('wpLarge'),read(),getSettings());$('wpDialog').showModal();document.body.classList.add('viewing-art');});
  $('wpClose').addEventListener('click',()=>$('wpDialog').close());
  $('wpDialog').addEventListener('close',()=>{document.body.classList.remove('viewing-art');$('wpInspect').focus();});
  $('wpDownload').addEventListener('click',async()=>{
    update();if(!valid||busy||$('wpDownload').disabled)return;
    busy=true;$('wpDownload').disabled=true;
    try {
      const state=read(), inherited={...getSettings()};await loadBodyFont(fontId());await document.fonts.ready;
      const output=document.createElement('canvas');drawWallpaper(output,state,inherited);
      const blob=await new Promise(resolve=>output.toBlob(resolve,'image/png'));if(!blob)throw Error('图片生成失败');
      const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${safeFilename(state.main||state.sub)}_诗笺壁纸.png`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);notify('壁纸已生成，时钟参考不随图导出。');
    } catch(error){notify(`壁纸保存失败：${error.message}`,true);} finally{busy=false;update();}
  });
  document.fonts.addEventListener('loadingdone',update);
  // Refresh inherited fonts and seal settings after the main editor changes.
  document.querySelector('.editor').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(update,250);});
  onAccessChange(update);
  showQuotes();update();return {update};
}
