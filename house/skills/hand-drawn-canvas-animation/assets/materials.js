/* oxlint-disable */ // house/: example and engine code kept as shipped in production
"use strict";
// Optional Canvas materials. All boxes are REST-SPACE bounds: keep them fixed as
// tone changes; draw in local coordinates or deform the finished cached layer.
function formHatch(
  c,
  path,
  box,
  {
    seed = 1,
    color = PAL.ink,
    spacing = 9,
    length = 17,
    width = 0.8,
    opacity = 0.3,
    tone = () => 0.5,
    direction = () => 0.9,
  } = {},
) {
  if (!(spacing > 0 && length > 0)) throw new Error("Hatching needs positive spacing and length");
  const [x, y, w, h] = box;
  c.save();
  c.clip(path);
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineCap = "round";
  c.globalAlpha *= opacity;
  c.beginPath();
  // Grid ids, not RNG iteration order, determine whether each persistent stroke exists.
  for (let iy = Math.floor(y / spacing); iy <= Math.ceil((y + h) / spacing); iy++)
    for (let ix = Math.floor(x / spacing); ix <= Math.ceil((x + w) / spacing); ix++) {
      const id = Math.imul(ix, 73856093) ^ Math.imul(iy, 19349663),
        px = (ix + hash(id, seed) * 0.6) * spacing,
        py = (iy + hash(id, seed + 1) * 0.6) * spacing;
      if (hash(id, seed + 2) > clamp(tone(px, py), 0, 1)) continue;
      let xx = px,
        yy = py;
      c.moveTo(xx, yy);
      const len = length * (0.65 + hash(id, seed + 3) * 0.5);
      for (let n = 0; n < 4; n++) {
        const a = direction(xx, yy);
        xx += (Math.cos(a) * len) / 4;
        yy += (Math.sin(a) * len) / 4;
        c.lineTo(xx, yy);
      }
    }
  c.stroke();
  c.restore();
}
function graphite(
  c,
  path,
  box,
  { seed = 1, color = PAL.ink, tone = () => 0.4, direction = () => 0.6, softness = 0.5 } = {},
) {
  formHatch(c, path, box, {
    seed,
    color,
    tone,
    direction,
    spacing: 4.5,
    length: 15,
    width: 0.65 + softness,
    opacity: 0.1 + softness * 0.08,
  });
  formHatch(c, path, box, {
    seed: seed + 9,
    color,
    tone: (x, y) => Math.max(0, tone(x, y) - 0.45),
    direction: (x, y) => direction(x, y) + 0.75,
    spacing: 6,
    length: 12,
    width: 0.55,
    opacity: 0.14,
  });
}
function screenFill(
  c,
  path,
  box,
  { color = PAL.fills[0], paper = PAL.paper, seed = 1, wear = 0.025 } = {},
) {
  c.save();
  c.fillStyle = color;
  c.fill(path);
  c.clip(path);
  const [x, y, w, h] = box,
    r = rng(seed);
  c.fillStyle = paper;
  c.globalAlpha *= 0.45;
  for (let i = 0, n = Math.ceil((w * h * Math.max(0, wear)) / 12); i < n; i++) {
    const xx = x + r() * w,
      yy = y + r() * h,
      a = 0.2 + r() * 0.9;
    c.fillRect(xx, yy, a * 1.5, a);
  }
  c.restore();
}
function pigmentWash(
  c,
  path,
  box,
  {
    color = PAL.fills[0],
    seed = 1,
    opacity = 0.4,
    granulation = 0.18,
    edge = 0.15,
    blend = "multiply",
  } = {},
) {
  c.save();
  c.globalCompositeOperation = blend;
  c.globalAlpha *= opacity;
  c.fillStyle = color;
  c.fill(path);
  c.clip(path);
  const [x, y, w, h] = box,
    r = rng(seed);
  c.globalAlpha *= granulation;
  for (let i = 0, n = Math.min(8000, Math.ceil((w * h) / 25)); i < n; i++) {
    const xx = x + r() * w,
      yy = y + r() * h,
      radius = 0.5 + r() * 2.5;
    c.beginPath();
    c.ellipse(xx, yy, radius * 1.3, radius, r() * TAU, 0, TAU);
    c.fill();
  }
  c.restore();
  if (edge > 0) {
    c.save();
    c.clip(path);
    c.globalCompositeOperation = blend;
    c.globalAlpha *= opacity * edge;
    c.strokeStyle = color;
    c.lineWidth = 3.5;
    c.stroke(path);
    c.restore();
  }
}
