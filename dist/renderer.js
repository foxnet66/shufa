import { random, characters } from './layout.js';

export const FONT_FAMILIES = {
  kai: 'KaiTi, STKaiti, "Kaiti SC", "楷体", serif',
  song: 'SimSun, "Songti SC", "Noto Serif CJK SC", serif',
  fang: 'FangSong, STFangsong, "仿宋", serif',
  custom: 'ShufaCustom, KaiTi, serif'
};

function vertical(ctx, text, x, y, size, step, font, color, limit) {
  ctx.font = `${size}px ${font}`;
  ctx.fillStyle = color;
  for (const [i, char] of characters(text, true).slice(0, limit).entries()) ctx.fillText(char, x, y + step * i);
}

export function drawPage(canvas, page, settings, pageIndex, pageCount, width = 1600) {
  canvas.width = width;
  canvas.height = width * 1.25;
  const ctx = canvas.getContext('2d');
  ctx.scale(width / 1600, width / 1600);
  const rng = random(settings.seed + pageIndex * 271);
  const cool = settings.paper === 'white';
  ctx.fillStyle = cool ? '#f8f7f0' : '#f1e7cd';
  ctx.fillRect(0, 0, 1600, 2000);
  const wash = ctx.createLinearGradient(0, 0, 1600, 2000);
  wash.addColorStop(0, 'rgba(255,255,255,.25)');
  wash.addColorStop(.6, 'rgba(158,121,65,.015)');
  wash.addColorStop(1, 'rgba(126,93,42,.055)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, 1600, 2000);
  for (let i = 0; i < 12500; i++) {
    ctx.fillStyle = `rgba(102,76,41,${rng() * .045})`;
    ctx.fillRect(rng() * 1600, rng() * 2000, rng() * 2 + .3, rng() * 4 + .3);
  }

  const left = 132, right = 1468, top = 180, bottom = 1770;
  const cw = (right - left) / settings.columns;
  const rh = (bottom - top) / settings.rows;
  const font = FONT_FAMILIES[settings.font] || FONT_FAMILIES.kai;
  const size = Math.min(cw * .74, rh * .78);
  if (settings.style === 'ruled') {
    ctx.strokeStyle = cool ? 'rgba(91,104,106,.40)' : 'rgba(126,85,57,.40)';
    ctx.lineWidth = 1.3;
    ctx.strokeRect(left - 9, top - 9, right - left + 18, bottom - top + 18);
    ctx.strokeRect(left, top, right - left, bottom - top);
    for (let i = 1; i < settings.columns; i++) {
      ctx.beginPath(); ctx.moveTo(left + i * cw, top); ctx.lineTo(left + i * cw, bottom); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(126,85,57,.11)';
    for (let i = 1; i < settings.rows; i++) {
      ctx.beginPath(); ctx.moveTo(left, top + i * rh); ctx.lineTo(right, top + i * rh); ctx.stroke();
    }
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const titleSize = Math.min(size * .86, 76);
  const title = settings.title || '無題';
  const titleLength = characters(title, true).slice(0, 14).length;
  const titleStep = Math.min(rh, (bottom - top - rh * 2.5) / Math.max(1, titleLength - 1));
  vertical(ctx, title, right - cw / 2, top + rh * 1.5, Math.min(titleSize, titleStep * .85), titleStep, font, '#302b24', 14);
  page.columns.forEach((column, i) => {
    const x = right - (i + 1.5) * cw;
    column.forEach((char, j) => {
      const variation = settings.natural ? 1 : 0;
      ctx.save();
      ctx.translate(x + (rng() - .5) * size * .032 * variation, top + (j + .5) * rh + (rng() - .5) * size * .025 * variation);
      ctx.rotate((rng() - .5) * .022 * variation);
      ctx.fillStyle = `rgba(35,32,27,${settings.natural ? .84 + rng() * .13 : .96})`;
      ctx.font = `${size * (1 + (rng() - .5) * .035 * variation)}px ${font}`;
      ctx.fillText(char, 0, 0, cw * .88);
      ctx.restore();
    });
  });
  const note = pageIndex === pageCount - 1 ? (settings.colophon || settings.author) : '未完待續';
  const noteChars = characters(note, true).slice(0, 20);
  const noteSize = size * .49;
  const noteStep = Math.min(rh * .65, 65);
  const sealY = bottom - 76;
  const noteY = Math.max(top + rh * 1.5, sealY - 80 - noteChars.length * noteStep);
  vertical(ctx, noteChars.join(''), left + cw / 2, noteY, noteSize, noteStep, font, '#514438', 20);
  if (settings.seal) {
    ctx.save();
    const sealSize = Math.min(87, cw * .75), x = left + cw / 2;
    ctx.translate(x, sealY); ctx.rotate(-.022);
    ctx.strokeStyle = '#a43d2e'; ctx.fillStyle = '#a43d2e'; ctx.lineWidth = 4;
    ctx.strokeRect(-sealSize / 2, -sealSize / 2, sealSize, sealSize);
    const chars = characters(settings.seal, true).slice(0, 4);
    const one = chars.length <= 2;
    ctx.font = `${sealSize * (chars.length === 1 ? .59 : .39)}px ${font}`;
    chars.forEach((c, i) => ctx.fillText(c, one ? 0 : (i < 2 ? .23 : -.23) * sealSize, one ? (i - (chars.length - 1) / 2) * sealSize * .53 : (i % 2 ? .23 : -.23) * sealSize));
    ctx.restore();
  }
  ctx.font = `23px ${FONT_FAMILIES.song}`;
  ctx.fillStyle = 'rgba(100,80,55,.55)';
  ctx.fillText(`${pageIndex + 1} / ${pageCount}`, 800, 1878);
  return canvas;
}
