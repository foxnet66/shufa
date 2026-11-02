// Public-domain classical texts; see docs/classics-sources.md.
import { characters } from './layout.js';
const originalSamples = {
  shanju: { title: '山居秋暝', author: '唐 · 王维', body: '空山新雨后，天气晚来秋。\n明月松间照，清泉石上流。\n竹喧归浣女，莲动下渔舟。\n随意春芳歇，王孙自可留。' },
  chibi: { title: '赤壁', author: '唐 · 杜牧', body: '折戟沉沙铁未销，自将磨洗认前朝。\n东风不与周郎便，铜雀春深锁二乔。' },
  lanting: { title: '兰亭集序', author: '晋 · 王羲之', body: '永和九年，岁在癸丑，暮春之初，会于会稽山阴之兰亭，修禊事也。群贤毕至，少长咸集。此地有崇山峻岭，茂林修竹，又有清流激湍，映带左右，引以为流觞曲水，列坐其次。虽无丝竹管弦之盛，一觞一咏，亦足以畅叙幽情。\n是日也，天朗气清，惠风和畅。仰观宇宙之大，俯察品类之盛，所以游目骋怀，足以极视听之娱，信可乐也。\n夫人之相与，俯仰一世。或取诸怀抱，悟言一室之内；或因寄所托，放浪形骸之外。虽趣舍万殊，静躁不同，当其欣于所遇，暂得于己，快然自足，不知老之将至。及其所之既倦，情随事迁，感慨系之矣。' }
};

import { entries } from './classics-entries.js';
export const CATEGORIES = ['五言', '七言', '词', '古文'];
const originals = Object.entries(originalSamples).map(([id, sample]) => ({id, ...sample, category: id === 'shanju' ? '五言' : id === 'chibi' ? '七言' : '古文', sourceTitle: id === 'shanju' ? '山居秋暝' : id === 'chibi' ? '赤壁' : '蘭亭集序', excerpt: id === 'lanting', note: id === 'lanting' ? '节选：自「永和九年」至「感慨系之矣」。' : ''}));
export const CLASSICS = Object.freeze([...originals, ...entries].map(entry => Object.freeze({...entry, label: entry.label || entry.title + (entry.excerpt ? ' · 节选' : ''), source: 'https://zh.wikisource.org/wiki/' + encodeURIComponent(entry.sourceTitle), count: characters(entry.body).length})));
export const CLASSICS_BY_ID = Object.freeze(Object.fromEntries(CLASSICS.map(entry => [entry.id, entry])));
const searchText = text => text.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
export function searchClassics(query = '', category = '') {
  const term = searchText(query);
  return CLASSICS.filter(entry => (!category || entry.category === category) && (!term || searchText(entry.title + entry.label + entry.author + entry.body).includes(term)));
}
