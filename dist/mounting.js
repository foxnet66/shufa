import { pageGeometry, random } from './layout.js';

export const MOUNTS = {
  none: { name: '纯宣纸', x: 0, y: 0, description: '保留纯纸画心，便于自行装裱。' },
  mat: { name: '留白卡纸', x: 112, y: 144, description: '暖白衬边，细金口；留白衬出笔墨。' },
  silk: { name: '宋锦册页', x: 132, y: 174, description: '青灰织纹配米金隔水，适合古雅册页。' },
  wood: { name: '胡桃木框', x: 180, y: 200, description: '深木窄框与亚麻卡纸，适合成品收藏。' }
};

export function mountGeometry(settings) {
  const paper = pageGeometry(settings), mount = MOUNTS[settings.mount] || MOUNTS.none;
  return { width: paper.width + mount.x * 2, height: paper.height + mount.y * 2, paperWidth: paper.width, paperHeight: paper.height, x: mount.x, y: mount.y, mount: Object.keys(MOUNTS).find(key => MOUNTS[key] === mount) };
}

function textile(ctx, width, height, base, thread, seed, brocade) {
  const rng = random(seed ^ 0x6c8e9cf5);
  ctx.fillStyle = base; ctx.fillRect(0, 0, width, height);
  ctx.lineWidth = .65;
  for (let y = 1; y < height; y += 3.8) {
    ctx.strokeStyle = `rgba(${thread},${.035 + rng() * .04})`;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }
  for (let x = 1; x < width; x += 4.6) {
    ctx.strokeStyle = `rgba(${thread},${.025 + rng() * .035})`;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  if (brocade) {
    ctx.strokeStyle = '#d9cda333'; ctx.lineWidth = 1;
    for (let y = -28; y < height + 80; y += 66) for (let x = -28; x < width + 80; x += 66) {
      const offset = Math.round(y / 66) % 2 ? 33 : 0;
      ctx.beginPath(); ctx.moveTo(x + offset, y); ctx.quadraticCurveTo(x + offset + 30, y + 3, x + offset + 33, y + 33);
      ctx.quadraticCurveTo(x + offset + 3, y + 30, x + offset, y); ctx.stroke();
    }
  }
}

export function paintMount(ctx, g, seed) {
  if (g.mount === 'none') return;
  const { width: w, height: h, x, y, paperWidth: pw, paperHeight: ph } = g;
  if (g.mount === 'silk') {
    textile(ctx, w, h, '#778377', '239,231,204', seed, true);
    ctx.fillStyle = '#d7c8a6'; ctx.fillRect(x - 22, y - 24, pw + 44, ph + 48);
    ctx.strokeStyle = '#a68c5f'; ctx.lineWidth = 2; ctx.strokeRect(x - 24, y - 26, pw + 48, ph + 52);
    ctx.strokeStyle = '#e7dfc6'; ctx.lineWidth = 1; ctx.strokeRect(14, 14, w - 28, h - 28);
  } else {
    textile(ctx, w, h, g.mount === 'mat' ? '#eee9dc' : '#e1d8c3', '119,103,78', seed, false);
    if (g.mount === 'mat') {
      ctx.strokeStyle = '#b6a17b'; ctx.lineWidth = 1.8;
      ctx.strokeRect(x - 12, y - 12, pw + 24, ph + 24);
    } else {
      const frame = 56, rng = random(seed ^ 0x46a3);
      ctx.fillStyle = '#50382a';
      ctx.fillRect(0, 0, w, frame); ctx.fillRect(0, h - frame, w, frame);
      ctx.fillRect(0, 0, frame, h); ctx.fillRect(w - frame, 0, frame, h);
      for (let i = 3; i < frame; i += 2.1) {
        ctx.strokeStyle = `rgba(212,156,99,${.035 + rng() * .09})`; ctx.lineWidth = .8;
        ctx.beginPath(); ctx.moveTo(i, i); ctx.lineTo(w - i, i); ctx.lineTo(w - i, h - i); ctx.lineTo(i, h - i); ctx.closePath(); ctx.stroke();
      }
      ctx.strokeStyle = '#251b14'; ctx.lineWidth = 6; ctx.strokeRect(frame, frame, w - 2 * frame, h - 2 * frame);
      ctx.strokeStyle = '#9f8558'; ctx.lineWidth = 2; ctx.strokeRect(frame + 6, frame + 6, w - 2 * frame - 12, h - 2 * frame - 12);
      // Mitre seams remain quiet rather than resembling a UI border.
      ctx.strokeStyle = '#27180f66'; ctx.lineWidth = 1.5;
      for (const [cx, cy, dx, dy] of [[0,0,1,1],[w,0,-1,1],[0,h,1,-1],[w,h,-1,-1]]) {
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + dx * frame, cy + dy * frame); ctx.stroke();
      }
      ctx.strokeStyle = '#b39b74'; ctx.lineWidth = 2; ctx.strokeRect(x - 10, y - 10, pw + 20, ph + 20);
    }
  }
  // A narrow recessed lip where the mat meets the actual paper.
  ctx.fillStyle = '#53412b30'; ctx.fillRect(x - 3, y - 3, pw + 6, ph + 6);
  ctx.fillStyle = '#fff7e5b3'; ctx.fillRect(x - 2, y + ph + 2, pw + 4, 2);
}
