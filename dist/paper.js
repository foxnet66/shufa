import { random } from './layout.js';

// A restrained digital study of paper: no photographed or third-party assets.
export const PAPERS = {
  warm: { name: '暖米生宣', description: '温润米白，细长纤维；宜清润小楷。', base: '#ede8d7', fiber: '123,105,71', grain: .024, fiberCount: 1500, length: 25, edge: .024 },
  white: { name: '月白熟宣', description: '中性月白，细密纸纹；宜浓墨与乌丝栏。', base: '#f6f5ee', fiber: '104,111,100', grain: .016, fiberCount: 900, length: 10, edge: .012 },
  aged: { name: '淡茶旧笺', description: '浅茶底色，柔和云纹；旧意点到为止。', base: '#eae0c8', fiber: '116,88,52', grain: .027, fiberCount: 1800, length: 20, edge: .048 }
};

// Multi-scale pulp and fibres remain visible when a full sheet is reduced to a preview.
// Draw on top of the chosen base colour, before any lettering; no external texture files.
export function paintPaperTexture(ctx, type, seed, height = 2000, width = 1600, { dark = false, weave = false } = {}) {
  const paper = PAPERS[type] || PAPERS.warm, rng = random(seed ^ 0x28e4f31b);
  ctx.save();
  const shadow = dark ? [8, 17, 15] : paper.fiber.split(',').map(Number);
  const light = dark ? [216, 205, 172] : [255, 253, 245];
  const layer = (spacing, opacity) => {
    const tile = document.createElement('canvas');
    tile.width = Math.ceil(width / spacing); tile.height = Math.ceil(height / spacing);
    const tc = tile.getContext('2d'), pixels = tc.createImageData(tile.width, tile.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const density = (rng() + rng() + rng()) / 3 - .5, color = density > 0 ? light : shadow;
      pixels.data[i] = color[0]; pixels.data[i + 1] = color[1]; pixels.data[i + 2] = color[2];
      pixels.data[i + 3] = Math.round(Math.abs(density) * opacity);
    }
    tc.putImageData(pixels, 0, 0); ctx.imageSmoothingEnabled = true;
    ctx.drawImage(tile, 0, 0, width, height);
  };
  layer(55, type === 'white' ? 24 : 38);
  layer(7, type === 'white' ? 65 : 95);
  ctx.lineCap = 'round';
  const fibres = Math.min(4200, Math.round(width * height / (type === 'white' ? 2400 : 1000)));
  for (let i = 0; i < fibres; i++) {
    const x = rng() * width, y = rng() * height, angle = rng() * Math.PI;
    const length = (type === 'white' ? 6 : 18) + rng() * (type === 'white' ? 20 : 65);
    const dx = Math.cos(angle) * length, dy = Math.sin(angle) * length;
    ctx.strokeStyle = `rgba(${i % 3 ? shadow.join(',') : light.join(',')},${.045 + rng() * (dark ? .085 : .13)})`;
    ctx.lineWidth = .65 + rng() * 1.25;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + dx * .52 + 2, y + dy * .45, x + dx, y + dy); ctx.stroke();
  }
  if (weave) {
    for (let x = 0; x < width; x += 12) {
      ctx.strokeStyle = 'rgba(61,76,56,.10)'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,250,221,.19)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 2, 0); ctx.lineTo(x + 2, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += 11) {
      ctx.strokeStyle = 'rgba(72,71,46,.075)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
  }
  ctx.restore();
}

export function paintPaper(ctx, type, seed, height = 2000, width = 1600) {
  const paper = PAPERS[type] || PAPERS.warm;
  const rng = random(seed ^ 0x61c88647);
  ctx.fillStyle = paper.base;
  ctx.fillRect(0, 0, width, height);
  // Soft variations in pulp density, without a directional yellow wash.
  for (let i = 0; i < 20; i++) {
    const x = rng() * width, y = rng() * height, radius = 150 + rng() * 380;
    const wash = ctx.createRadialGradient(x, y, 0, x, y, radius);
    wash.addColorStop(0, i % 2 ? 'rgba(255,255,255,.055)' : `rgba(${paper.fiber},.012)`);
    wash.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = wash; ctx.fillRect(0, 0, width, height);
  }
  for (let i = 0; i < 17000; i++) {
    ctx.fillStyle = `rgba(${paper.fiber},${rng() * paper.grain})`;
    ctx.fillRect(rng() * width, rng() * height, .35 + rng() * 1.15, .35 + rng() * 1.5);
  }
  ctx.lineCap = 'round';
  for (let i = 0; i < paper.fiberCount; i++) {
    const x = rng() * width, y = rng() * height, angle = rng() * Math.PI;
    const length = 3 + rng() * paper.length;
    ctx.strokeStyle = `rgba(${paper.fiber},${.018 + rng() * .025})`;
    ctx.lineWidth = .25 + rng() * .4;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(angle) * length * .55 + 1.5, y + Math.sin(angle) * length * .55, x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    ctx.stroke();
  }
  const edge = ctx.createRadialGradient(width / 2, height / 2, 450, width / 2, height / 2, Math.max(width, height) * .75);
  edge.addColorStop(0, `rgba(${paper.fiber},0)`);
  edge.addColorStop(.65, `rgba(${paper.fiber},0)`);
  edge.addColorStop(1, `rgba(${paper.fiber},${paper.edge})`);
  ctx.fillStyle = edge; ctx.fillRect(0, 0, width, height);
  paintPaperTexture(ctx, type, seed, height, width);
}
