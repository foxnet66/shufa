import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import OpenCC from 'opencc-js';
import { BASE_CLASSICS } from '../dist/classics-base.js';
import { characters, MAX_CHARACTERS, MAX_TITLE_CHARACTERS } from '../dist/layout.js';

const root = new URL('../', import.meta.url);
const lock = JSON.parse(await readFile(new URL('scripts/classics-source-lock.json', root), 'utf8'));
const cache = new URL('artifacts/corpus-source/', root);
await mkdir(cache, { recursive: true });
const hash = value => createHash('sha256').update(value).digest('hex');
const toSimplified = OpenCC.Converter({ from: 't', to: 'cn' });
// Unambiguous older glyph variants, recorded separately from phrase conversion.
const variants = { 緜:'绵', 牀:'床', 羣:'群', 峯:'峰', 髙:'高', 畵:'画', 淸:'清', 卽:'即', 眞:'真', 兎:'兔' };
const convert = text => toSimplified(text).replace(/[緜牀羣峯髙畵淸卽眞兎]/gu, char => variants[char]);
const plain = value => characters(convert(value)).join('');
const authorName = value => value.split(' · ').at(-1);
const exactKey = entry => authorName(entry.author) + '|' + plain(entry.body);
const baseKeys = new Set(BASE_CLASSICS.map(exactKey));
const baseByOpening = new Map(BASE_CLASSICS.map(entry => [authorName(entry.author) + '|' + plain(entry.body).slice(0, 10) + '|' + entry.count, entry]));
const basePoemsByTitle = new Map(BASE_CLASSICS.filter(entry => entry.category !== '词').map(entry => [authorName(entry.author) + '|' + plain(entry.title), entry]));
const retainedByKey = new Map(BASE_CLASSICS.map(entry => [exactKey(entry), entry]));
const memberships = new Map(BASE_CLASSICS.map(entry => [entry.id, new Set(['常用选篇'])]));
const seen = new Set(baseKeys), corpus = [], skipped = [], sourceStats = [];

function categoryOf(body) {
  const lengths = body.split(/[，。！？；、,.!?;\n]+/u).map(line => characters(line).length).filter(Boolean);
  if (lengths.length && lengths.filter(n => n === 4).length / lengths.length >= .8) return '四言';
  if (lengths.length && lengths.filter(n => n === 5).length / lengths.length >= .8) return '五言';
  if (lengths.length && lengths.filter(n => n === 7).length / lengths.length >= .8) return '七言';
  return '古体';
}

for (const source of lock.sources) {
  const cachedFile = new URL(source.key + (source.key === 'license' ? '.txt' : '.json'), cache);
  let data;
  try { data = await readFile(cachedFile); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const response = await fetch(`https://raw.githubusercontent.com/${lock.repository}/${lock.commit}/${source.path}`, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`${source.path}: HTTP ${response.status}`);
    data = Buffer.from(await response.arrayBuffer());
    if (hash(data) !== source.sha256) throw new Error(`${source.path}: source checksum mismatch`);
    await writeFile(cachedFile, data);
  }
  if (hash(data) !== source.sha256) throw new Error(`${source.path}: cache checksum mismatch`);
  if (source.key === 'license') {
    await mkdir(new URL('dist/data/', root), { recursive: true });
    await writeFile(new URL('dist/data/chinese-poetry-LICENSE.txt', root), data);
    continue;
  }
  const rows = JSON.parse(data.toString('utf8'));
  let added = 0;
  for (const [index, row] of rows.entries()) {
    const rawTitle = row.title || row.rhythmic || row.chapter;
    const title = convert(source.key === 'lunyu' ? '论语 · ' + rawTitle : rawTitle);
    const author = convert(row.author || (source.key === 'lunyu' ? '孔子及弟子' : '佚名'));
    const body = convert((row.paragraphs || row.content).join('\n'));
    const count = characters(body).length;
    if (!body.trim() || count > MAX_CHARACTERS || title.length > MAX_TITLE_CHARACTERS || author.length > 20 || /[□�\uE000-\uF8FF]/u.test(title + body)) {
      throw new Error(`Review required: ${source.key}[${index}] ${title}; no automatic truncation is allowed`);
    }
    const key = exactKey({ author, body });
    const selectedEdition = source.key === 'tang' ? basePoemsByTitle.get(authorName(author) + '|' + plain(title)) : null;
    if (selectedEdition) memberships.get(selectedEdition.id).add(source.collection);
    const baseOpening = authorName(author) + '|' + plain(body).slice(0, 10) + '|' + count;
    if (seen.has(key) || baseByOpening.has(baseOpening)) {
      const retained = retainedByKey.get(key) || baseByOpening.get(baseOpening);
      if (retained) memberships.get(retained.id).add(source.collection);
      skipped.push({ collection: source.collection, index, title, author, retainedId: retained?.id, reason: seen.has(key) ? 'identical-author-and-text' : 'existing-selected-edition' });
      continue;
    }
    seen.add(key);
    let label = title;
    if (selectedEdition) label += ' · 源本异文';
    if (source.key === 'song') label += ' · ' + characters(body).slice(0, 8).join('');
    if (source.key === 'shijing') label += ' · ' + convert(row.section);
    const note = selectedEdition ? '与常用选篇存在异文，此处保留来源文本。' : source.key === 'shijing' ? convert(`${row.chapter} · ${row.section}`) : source.key === 'lunyu' ? '本篇全文；各章保留原有分段。' : '';
    const entry = {
      id: `${source.key}-${hash(author + '|' + title + '|' + body).slice(0, 16)}`,
      title, label, author, body, count, note,
      category: source.key === 'song' ? '词' : source.key === 'lunyu' ? '古文' : categoryOf(body),
      collection: source.collection,
      source: `https://github.com/${lock.repository}/blob/${lock.commit}/${encodeURI(source.path)}`,
      sourceLabel: '文本来源', sourceIndex: index, bodyHash: hash(body)
    };
    corpus.push(entry);
    retainedByKey.set(key, entry);
    memberships.set(entry.id, new Set([source.collection]));
    added++;
  }
  sourceStats.push({ collection: source.collection, path: source.path, sha256: source.sha256, records: rows.length, added });
}

for (const entry of corpus) entry.collections = [...memberships.get(entry.id)];
const baseMemberships = Object.fromEntries(BASE_CLASSICS.map(entry => [entry.id, [...memberships.get(entry.id)].filter(name => name !== '常用选篇')]));
const byCollection = {};
for (const collections of memberships.values()) for (const name of collections) byCollection[name] = (byCollection[name] || 0) + 1;
const metadata = { repository: lock.repository, commit: lock.commit, sources: sourceStats, skipped, byCollection, imported: corpus.length, base: BASE_CLASSICS.length, total: corpus.length + BASE_CLASSICS.length, converter: 'opencc-js 1.4.2, t → cn', variants };
await writeFile(new URL('dist/classics-corpus.js', root), '// Derived from chinese-poetry/chinese-poetry under MIT. See data/chinese-poetry-LICENSE.txt.\nexport const BASE_MEMBERSHIPS = ' + JSON.stringify(baseMemberships) + ';\nexport const CORPUS = [\n' + corpus.map(entry => JSON.stringify(entry)).join(',\n') + '\n];\n');
await writeFile(new URL('docs/classics-import.json', root), JSON.stringify(metadata, null, 2) + '\n');
console.log(JSON.stringify({ total: metadata.total, imported: metadata.imported, collections: sourceStats, skipped: skipped.length }, null, 2));
