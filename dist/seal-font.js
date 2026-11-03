import { characters } from './layout.js';
import { sealCoverage } from './fonts/seal-coverage.js';

// Resolve each artwork's own inscription; a manuscript and wallpaper can differ.
export function resolveSealFont(text, settings) {
  const chars = characters(text, true).slice(0, 4);
  const font = settings.sealFont;
  const coverage = font === 'seal' ? sealCoverage : font === 'custom' ? settings.customSealCoverage : null;
  const missing = coverage ? [...new Set(chars.filter(char => !coverage.has(char.codePointAt(0))))] : [];
  const pending = chars.length > 0 && font === 'seal' && !!settings.sealPending;
  const unavailable = font === 'seal' && (settings.sealPending || settings.sealReady === false);
  return { chars, missing, pending, renderFont: missing.length || unavailable ? 'kai' : font };
}
