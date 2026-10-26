// Read Unicode cmap tables in an sfnt TTF/OTF without interpreting glyph outlines.
export function fontCoverage(buffer) {
  const view = new DataView(buffer), u16 = n => view.getUint16(n), u32 = n => view.getUint32(n);
  if (view.byteLength < 12 || ![0x00010000, 0x4f54544f, 0x74727565].includes(u32(0))) return null;
  let cmap;
  for (let i = 0; i < u16(4); i++) {
    const at = 12 + i * 16;
    if (u32(at) === 0x636d6170) cmap = u32(at + 8);
  }
  if (cmap === undefined) return null;
  let best, rank = -1;
  for (let i = 0; i < u16(cmap + 2); i++) {
    const at = cmap + 4 + i * 8, platform = u16(at), encoding = u16(at + 2);
    if (platform !== 0 && !(platform === 3 && [1, 10].includes(encoding))) continue;
    const sub = cmap + u32(at + 4), format = u16(sub);
    const score = format === 12 ? 2 : format === 4 ? 1 : -1;
    if (score > rank) { best = sub; rank = score; }
  }
  if (rank < 0) return null;
  const codes = new Set();
  if (u16(best) === 12) {
    for (let i = 0; i < u32(best + 12); i++) {
      const at = best + 16 + i * 12;
      for (let cp = u32(at); cp <= Math.min(0x10ffff, u32(at + 4)); cp++) {
        if (u32(at + 8) + cp - u32(at)) codes.add(cp);
      }
    }
  } else {
    const n = u16(best + 6) / 2, ends = best + 14, starts = ends + 2 * n + 2, deltas = starts + 2 * n, offsets = deltas + 2 * n;
    for (let i = 0; i < n; i++) {
      const start = u16(starts + 2 * i), end = u16(ends + 2 * i), delta = u16(deltas + 2 * i), range = u16(offsets + 2 * i);
      for (let cp = start; cp <= end && cp < 0xffff; cp++) {
        const at = offsets + 2 * i + range + 2 * (cp - start);
        const raw = range ? u16(at) : cp;
        if (raw && ((raw + delta) & 0xffff)) codes.add(cp);
      }
    }
  }
  return codes;
}
