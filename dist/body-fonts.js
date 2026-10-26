import { fontCoverage } from './font-coverage.js';

export const BODY_FONTS = {
  mashan: { name: '马善政楷书', family: 'ShufaMaShanZheng', file: 'MaShanZheng-Regular.ttf', description: '毛笔楷书，笔画饱满，适合诗词册页。' },
  longcang: { name: '龙藏手写体', family: 'ShufaLongCang', file: 'LongCang-Regular.ttf', description: '舒展手写，偏行草；连带笔势更明显。' }
};
const states = new Map();

export function bodyFontState(id) { return states.get(id) || { status: 'idle' }; }

export function loadBodyFont(id, retry = false) {
  const meta = BODY_FONTS[id];
  if (!meta) return Promise.resolve();
  const previous = states.get(id);
  if (previous && !(retry && previous.status === 'error')) return previous.promise;
  const state = { status: 'loading', coverage: null };
  states.set(id, state);
  state.promise = (async () => {
    try {
      const response = await fetch(new URL(`./fonts/${meta.file}`, import.meta.url), { signal: AbortSignal.timeout(45000) });
      if (!response.ok) throw new Error(`字体下载失败 (${response.status})`);
      const buffer = await response.arrayBuffer();
      const face = new FontFace(meta.family, buffer);
      await face.load(); document.fonts.add(face);
      state.coverage = fontCoverage(buffer); state.status = 'ready';
      return state;
    } catch (error) { state.status = 'error'; state.error = error; throw error; }
  })();
  return state.promise;
}
