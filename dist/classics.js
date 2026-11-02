// Static offline library; source versions and licenses: docs/classics-sources.md.
import { BASE_CLASSICS } from './classics-base.js';
import { CORPUS, BASE_MEMBERSHIPS } from './classics-corpus.js';
export const CATEGORIES = Object.freeze(['四言', '五言', '七言', '古体', '词', '古文']);
export const CLASSICS = Object.freeze([
  ...BASE_CLASSICS.map(entry => Object.freeze({ ...entry, collections: Object.freeze(['常用选篇', ...(BASE_MEMBERSHIPS[entry.id] || [])]) })),
  ...CORPUS.map(entry => Object.freeze({ ...entry, collections: Object.freeze(entry.collections) }))
]);
export const COLLECTIONS = Object.freeze([...new Set(CLASSICS.map(entry => entry.collection))]);
export const CLASSICS_BY_ID = Object.freeze(Object.fromEntries(CLASSICS.map(entry => [entry.id, entry])));
const searchText = text => text.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
const searchIndex = CLASSICS.map(entry => ({ entry, text: searchText(entry.title + entry.label + entry.author + entry.body) }));
export function searchClassics(query = '', category = '', collection = '') {
  const term = searchText(query);
  return searchIndex.filter(({ entry, text }) => (!category || entry.category === category) && (!collection || entry.collections.includes(collection)) && (!term || text.includes(term))).map(({ entry }) => entry);
}
