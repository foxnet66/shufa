import { random } from './layout.js';

// A restrained digital study of paper: no photographed or third-party assets.
export const PAPERS = {
  warm: { name: '暖米生宣', description: '温润米白，细长纤维；宜清润小楷。', base: '#f3eddd', fiber: '123,105,71', grain: .024, fiberCount: 1500, length: 25, edge: .024 },
  white: { name: '月白熟宣', description: '中性月白，细密纸纹；宜浓墨与乌丝栏。', base: '#f6f5ee', fiber: '104,111,100', grain: .016, fiberCount: 900, length: 10, edge: .012 },
  aged: { name: '淡茶旧笺', description: '浅茶底色，柔和云纹；旧意点到为止。', base: '#eae0c8', fiber: '116,88,52', grain: .027, fiberCount: 1800, length: 20, edge: .048 }
};

export function paintPaper(ctx, type, seed) {
  const paper = PAPERS[type] || PAPERS.warm;
  const rng = random(seed ^ 0x61c88647);
  ctx.fillStyle = paper.base;
  ctx.fillRect(0, 0, 1600, 2000);
  // Soft variations in pulp density, without a directional yellow wash.
  for (let i = 0; i < 20; i++) {
    const x = rng() * 1600, y = rng() * 2000, radius = 150 + rng() * 380;
    const wash = ctx.createRadialGradient(x, y, 0, x, y, radius);
    wash.addColorStop(0, i % 2 ? 'rgba(255,255,255,.055)' : `rgba(${paper.fiber},.012)`);
    wash.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = wash; ctx.fillRect(0, 0, 1600, 2000);
  }
  for (let i = 0; i < 17000; i++) {
    ctx.fillStyle = `rgba(${paper.fiber},${rng() * paper.grain})`;
    ctx.fillRect(rng() * 1600, rng() * 2000, .35 + rng() * 1.15, .35 + rng() * 1.5);
  }
  ctx.lineCap = 'round';
  for (let i = 0; i < paper.fiberCount; i++) {
    const x = rng() * 1600, y = rng() * 2000, angle = rng() * Math.PI;
    const length = 3 + rng() * paper.length;
    ctx.strokeStyle = `rgba(${paper.fiber},${.018 + rng() * .025})`;
    ctx.lineWidth = .25 + rng() * .4;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(angle) * length * .55 + 1.5, y + Math.sin(angle) * length * .55, x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    ctx.stroke();
  }
  const edge = ctx.createRadialGradient(800, 1000, 450, 800, 1000, 1350);
  edge.addColorStop(0, `rgba(${paper.fiber},0)`);
  edge.addColorStop(.65, `rgba(${paper.fiber},0)`);
  edge.addColorStop(1, `rgba(${paper.fiber},${paper.edge})`);
  ctx.fillStyle = edge; ctx.fillRect(0, 0, 1600, 2000);
}
