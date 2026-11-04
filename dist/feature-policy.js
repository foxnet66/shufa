export const FEATURES = Object.freeze({ scroll:'横向手卷', mount:'作品装裱', seal:'印章进阶', colors:'壁纸高级配色', pdf:'整篇多页 PDF' });
export const BASIC_DEFAULTS = Object.freeze({ composition:'album', mount:'none', sealStyle:'intaglio', sealFont:'seal', sealTexture:'fresh' });
export function editorFeature(id, value) {
  if (id === 'composition' && value === 'scroll') return 'scroll';
  if (id === 'mount' && value !== 'none') return 'mount';
  if ((id === 'sealStyle' && value !== 'intaglio') || (id === 'sealFont' && value !== 'seal') || (id === 'sealTexture' && value !== 'fresh')) return 'seal';
  return null;
}
export function wallpaperFeature(kind, value) {
  return (kind === 'theme' && value !== 'xuan') || (kind === 'ink' && !['auto','ink'].includes(value)) ? 'colors' : null;
}
export const pdfFeature = pages => pages > 1 ? 'pdf' : null;
