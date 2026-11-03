// Ancient poetry and original short messages have different visual relationships.
export const WALLPAPER_CATEGORIES = {poetry:'诗词',blessing:'祝愿',resolve:'自勉',quiet:'闲适'};
export const WALLPAPER_QUOTES = [
  {main:'明月松间照',sub:'清泉石上流',author:'唐 · 王维',category:'poetry'},
  {main:'行到水穷处',sub:'坐看云起时',author:'唐 · 王维',category:'poetry'},
  {main:'海上生明月',sub:'天涯共此时',author:'唐 · 张九龄',category:'poetry'},
  {main:'长风破浪会有时',sub:'直挂云帆济沧海',author:'唐 · 李白',category:'poetry'},
  {main:'采菊东篱下',sub:'悠然见南山',author:'晋 · 陶渊明',category:'poetry'},
  {main:'山重水复疑无路',sub:'柳暗花明又一村',author:'宋 · 陆游',category:'poetry'},
  {main:'心想事成',sub:'愿你所盼，皆有回响',author:'',category:'blessing'},
  {main:'平安喜乐',sub:'把平常日子，过成好光景',author:'',category:'blessing'},
  {main:'好事将至',sub:'心有期待，日子自会明亮',author:'',category:'blessing'},
  {main:'慢慢来',sub:'每一小步，都算向前',author:'',category:'resolve'},
  {main:'笃行',sub:'把心中所想，写进今日所做',author:'',category:'resolve'},
  {main:'有光',sub:'守好心中微光，再走一程',author:'',category:'resolve'},
  {main:'从容',sub:'不急于抵达，自有一路风景',author:'',category:'quiet'},
  {main:'听风',sub:'给心留白，让日子舒展',author:'',category:'quiet'},
  {main:'一盏清茶',sub:'把片刻闲暇，留给自己',author:'',category:'quiet'}
];
export function quoteLayout(quote) {return quote.category==='poetry'?'paired':'staggered';}
export function restoredQuoteLayout(saved, quote) {
  const layout=['paired','staggered','single'].includes(saved?.layout)?saved.layout:'paired';
  return saved?.version!==2 && quote?.category==='poetry' && layout==='staggered' ? 'paired' : layout;
}
