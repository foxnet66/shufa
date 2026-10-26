import { random, characters, signaturePosition, pageGeometry, verticalCenters } from './layout.js';
import { paintPaper } from './paper.js';
import { drawSeal } from './seal.js';

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

// Center the visible ink rather than the font's em box (especially 一、川、心).
function opticalGlyph(ctx, char, maxWidth) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const m = ctx.measureText(char);
  const inkWidth = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const scale = inkWidth > maxWidth ? maxWidth / inkWidth : 1;
  ctx.scale(scale, 1);
  ctx.fillText(char, (m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2,
    (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
}

const verticalForms = { '（': '︵', '）': '︶', '《': '︽', '》': '︾', '「': '﹁', '」': '﹂', '『': '﹃', '』': '﹄', '—': '︱', '…': '︙' };

function stamp(ctx, signature, settings) {
  const plate = document.createElement('canvas'); plate.width = plate.height = 600;
  drawSeal(plate, signature.sealChars, settings);
  ctx.save(); ctx.translate(signature.x, signature.sealY); ctx.rotate(-.016);
  ctx.globalAlpha = .92;
  ctx.drawImage(plate, -signature.sealSize / 2, -signature.sealSize / 2, signature.sealSize, signature.sealSize);
  ctx.restore();
}

export function drawPage(canvas, page, settings, pageIndex, pageCount, width = 1600) {
  canvas.width = width;
  const geometry = pageGeometry(settings);
  canvas.height = Math.round(width * geometry.height / 1600);
  const ctx = canvas.getContext('2d');
  ctx.scale(width / 1600, width / 1600);
  const rng = random(settings.seed + pageIndex * 271);
  const cool = settings.paper === 'white';
  paintPaper(ctx, settings.paper, settings.seed + pageIndex * 271, geometry.height);

  const { left, right, top, bottom, album } = geometry;
  const cw = (right - left) / settings.columns;
  const rh = (bottom - top) / settings.rows;
  const font = FONT_FAMILIES[settings.font] || FONT_FAMILIES.kai;
  const size = Math.min(cw * (album ? .68 : .74), rh * (album ? .8 : .78));
  if (settings.style === 'ruled') {
    ctx.strokeStyle = cool ? 'rgba(100,110,99,.29)' : 'rgba(135,104,76,.28)';
    ctx.lineWidth = album ? 1 : 1.3;
    ctx.strokeRect(left - 9, top - 9, right - left + 18, bottom - top + 18);
    ctx.strokeRect(left, top, right - left, bottom - top);
    for (let i = 1; i < settings.columns; i++) {
      ctx.beginPath(); ctx.moveTo(left + i * cw, top); ctx.lineTo(left + i * cw, bottom); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(126,85,57,.07)';
    for (let i = 1; !album && i < settings.rows; i++) {
      ctx.beginPath(); ctx.moveTo(left, top + i * rh); ctx.lineTo(right, top + i * rh); ctx.stroke();
    }
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const titleSize = Math.min(size * .86, 76);
  const title = settings.title || '無題';
  const titleLength = characters(title, true).slice(0, 14).length;
  const titleStep = album ? Math.min(rh * .84, (bottom - top) * .43 / Math.max(1, titleLength)) : Math.min(rh, (bottom - top - rh * 2.5) / Math.max(1, titleLength - 1));
  vertical(ctx, title, right - cw / 2, top + rh * (album ? 2.6 : 1.5), Math.min(titleSize, titleStep * .85), titleStep, font, '#302b24', 14);
  page.columns.forEach((column, i) => {
    const x = right - (i + 1.5) * cw;
    const phase = rng() * Math.PI * 2;
    const baseInk = settings.ink === 'light' ? .7 : settings.ink === 'dense' ? .99 : .91;
    const columnInk = baseInk - (settings.natural ? rng() * .035 : 0);
    ctx.font = `${size}px ${font}`;
    const centers = verticalCenters(column.map(char => {
      const m = ctx.measureText(char); return m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    }), rh, top);
    column.forEach((char, j) => {
      const variation = settings.natural ? 1 : 0;
      const smallMark = /^[，。、；：！？,.!?;:]$/u.test(char);
      ctx.save();
      ctx.translate(x + (rng() - .5) * size * .026 * variation + (smallMark ? cw * .21 : 0), (album && settings.natural ? centers[j] : top + (j + .5) * rh) + (rng() - .5) * size * .02 * variation - (smallMark ? rh * .2 : 0));
      ctx.rotate((rng() - .5) * .022 * variation);
      ctx.fillStyle = `rgba(35,32,27,${columnInk + Math.sin(phase + j * .55) * .025 * variation})`;
      ctx.font = `${size * (smallMark ? .52 : 1) * (1 + Math.sin(phase + j * .7) * .012 * variation + (rng() - .5) * .014 * variation)}px ${font}`;
      if (settings.natural) { ctx.shadowColor = 'rgba(35,32,27,.10)'; ctx.shadowBlur = .65; }
      opticalGlyph(ctx, verticalForms[char] || char, cw * .88);
      ctx.restore();
    });
  });
  const signature = signaturePosition(page, settings, pageIndex === pageCount - 1);
  vertical(ctx, signature.noteChars.join(''), signature.x, signature.y, signature.noteSize, signature.step, font, '#514438', 20);
  if (signature.sealChars.length) {
    stamp(ctx, signature, settings);
  }
  if (pageCount > 1) {
    ctx.font = `23px ${FONT_FAMILIES.song}`;
    ctx.fillStyle = 'rgba(100,80,55,.45)';
    ctx.fillText(`${pageIndex + 1} / ${pageCount}`, 800, geometry.height - 70);
  }
  return canvas;
}
