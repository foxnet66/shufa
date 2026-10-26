import { random } from './layout.js';

export const SEAL_FONTS = {
  seal: 'CNSSeal, serif',
  kai: 'KaiTi, STKaiti, "Kaiti SC", serif',
  song: 'SimSun, "Songti SC", serif',
  custom: 'ShufaSealCustom, serif'
};

export function sealCells(count) {
  const full = { x: 62, y: 62, width: 476, height: 476 };
  const cell = (x, y, width = 224, height = 224) => ({ x, y, width, height });
  if (count === 1) return [full];
  if (count === 2) return [cell(62, 62, 476, 224), cell(62, 314, 476, 224)];
  if (count === 3) return [cell(314, 62, 224, 476), cell(62, 62), cell(62, 314)];
  if (count === 4) return [cell(314, 62), cell(314, 314), cell(62, 62), cell(62, 314)];
  return [];
}

function fittedGlyph(ctx, char, box, family) {
  ctx.font = `440px ${family}`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const m = ctx.measureText(char);
  const width = Math.max(1, m.actualBoundingBoxLeft + m.actualBoundingBoxRight);
  const height = Math.max(1, m.actualBoundingBoxAscent + m.actualBoundingBoxDescent);
  const scale = Math.min(box.width / width, box.height / height);
  ctx.save(); ctx.translate(box.x + box.width / 2, box.y + box.height / 2);
  ctx.scale(scale, Math.min(box.height / height, scale * 1.12));
  ctx.fillText(char, (m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2, (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
  ctx.restore();
}

export function drawSeal(plate, chars, settings) {
  plate.width = plate.height = 600;
  const ctx = plate.getContext('2d'), rng = random(settings.seed ^ 0x5a71);
  const worn = settings.sealTexture === 'worn';
  const amplitude = worn ? 6 : 2.5;
  ctx.fillStyle = '#a33227'; ctx.strokeStyle = '#a33227';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const corners = [[22, 22], [578, 22], [578, 578], [22, 578]];
  corners.forEach(([x, y], side) => {
    const next = corners[(side + 1) % 4];
    for (let i = 0; i < 24; i++) {
      const t = i / 24, px = x + (next[0] - x) * t + (rng() - .5) * amplitude, py = y + (next[1] - y) * t + (rng() - .5) * amplitude;
      if (!side && !i) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
  });
  ctx.closePath();
  if (settings.sealStyle === 'relief') { ctx.lineWidth = 17; ctx.stroke(); }
  else { ctx.fill(); ctx.globalCompositeOperation = 'destination-out'; }
  const family = SEAL_FONTS[settings.sealRenderFont || settings.sealFont] || SEAL_FONTS.kai;
  sealCells(chars.length).forEach((box, i) => fittedGlyph(ctx, chars[i], box, family));

  // Pressure varies over regions; small dry gaps gather along fibres and edges.
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 5; i++) {
    const x = rng() * 600, y = rng() * 600, radius = 90 + rng() * 150;
    const pressure = ctx.createRadialGradient(x, y, 0, x, y, radius);
    pressure.addColorStop(0, `rgba(0,0,0,${(worn ? .13 : .035) + rng() * .08})`);
    pressure.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = pressure;
    ctx.fillRect(0, 0, 600, 600);
  }
  for (let i = 0; i < (worn ? 95 : 34); i++) {
    const x = rng() * 600, y = rng() * 600;
    for (let j = 0; j < 5; j++) {
      ctx.fillStyle = `rgba(0,0,0,${.2 + rng() * .6})`;
      ctx.beginPath(); ctx.ellipse(x + rng() * 16, y + rng() * 7, .5 + rng() * 1.8, 1 + rng() * 3, .4, 0, Math.PI * 2); ctx.fill();
    }
  }
  for (let i = 0; i < (worn ? 45 : 12); i++) {
    const edge = Math.floor(rng() * 4), along = 25 + rng() * 550;
    ctx.fillStyle = `rgba(0,0,0,${.25 + rng() * .5})`;
    const x = edge % 2 ? along : (edge === 0 ? 14 : 575);
    const y = edge % 2 ? (edge === 1 ? 14 : 575) : along;
    ctx.fillRect(x, y, edge % 2 ? 3 + rng() * 12 : 9, edge % 2 ? 9 : 3 + rng() * 12);
  }
  return plate;
}
