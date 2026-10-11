"use strict";
// Material changes belong to the action. No title cards or isolated style samples.
const starts = [];
TIMELINE.reduce((n, s, i) => ((starts[i] = n), n + s.dur), 0);
const rawShots = TIMELINE.map((s) => s.fn);
const rawLayers = [null, null];
function renderShotLayer(slot, index, time) {
  let cv = rawLayers[slot];
  if (!cv) {
    cv = document.createElement("canvas");
    rawLayers[slot] = cv;
  }
  if (cv.width !== OUT_W || cv.height !== OUT_H) {
    cv.width = OUT_W;
    cv.height = OUT_H;
  }
  const g = cv.getContext("2d");
  g.save();
  try {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    resetT(g);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    g.filter = "none";
    g.shadowBlur = 0;
    g.setLineDash([]);
    rawShots[index](g, clamp(time, 0, TIMELINE[index].dur - 1 / 240));
  } finally {
    g.restore();
  }
  return cv;
}
const seams = [
  { at: 7, before: 0.55, after: 0.65, kind: "ink", from: 0 },
  { at: 14, before: 0.65, after: 0.7, kind: "sand", from: 1 },
  { at: 20, before: 0.55, after: 0.7, kind: "warmth", from: 2 },
  { at: 27, before: 0.38, after: 0.58, kind: "print", from: 3 },
  { at: 42, before: 0.55, after: 0.7, kind: "fire", from: 5 },
  { at: 49, before: 0.45, after: 0.65, kind: "bloom", from: 6 },
];
function mediumMatte(c, kind, p) {
  const path = new Path2D();
  if (kind === "ink") {
    const edge = lerp(H + 120, -140, p),
      points = [[-5, H + 5]];
    for (let x = -20; x <= W + 35; x += 24)
      points.push([x, edge + Math.sin(x * 0.012) * 24 + noise1(x / 140, 71) * 48]);
    points.push([W + 5, H + 5]);
    path.addPath(polyPath(points));
  } else if (kind === "print") {
    const edge = (1 - p) * (W + 450) - 225,
      points = [[W + 5, -5]];
    for (let y = -20; y <= H + 35; y += 24)
      points.push([edge + Math.sin(y * 0.014) * 27 + noise1(y / 110, 71) * 38, y]);
    points.push([W + 5, H + 5]);
    path.addPath(polyPath(points));
  } else if (kind === "sand") {
    const cell = 38;
    for (let y = 0; y < H + cell; y += cell)
      for (let x = 0; x < W + cell; x += cell) {
        const delay = 0.58 * (1 - x / W) + (0.08 * y) / H + hash(x / 38, y / 38 + 555) * 0.15;
        const r = cell * 0.82 * sm(delay, delay + 0.18, p);
        if (r < 0.01) continue;
        path.moveTo(x + r, y);
        path.arc(x, y, r, 0, TAU);
      }
  } else {
    const center = kind === "warmth" ? [1010, 795] : [960, 450],
      r = Math.pow(p, 0.86) * 1750,
      pts = [];
    for (let i = 0; i < 100; i++) {
      const a = (i / 100) * TAU;
      const jag =
        kind === "fire"
          ? 1 + 0.06 * Math.sin(i * 0.62) + 0.027 * Math.sin(i * 2.2)
          : 1 + 0.025 * Math.sin(i * 2.7);
      const radial = r * jag;
      pts.push([center[0] + Math.cos(a) * radial, center[1] + Math.sin(a) * radial]);
    }
    path.addPath(polyPath(pts));
  }
  return path;
}
function continuousShot(index, c, t) {
  const now = starts[index] + t,
    s = seams.find((s) => now >= s.at - s.before && now < s.at + s.after);
  if (!s) {
    rawShots[index](c, t);
    return;
  }
  const p = sm(s.at - s.before, s.at + s.after, now),
    a = renderShotLayer(0, s.from, now - starts[s.from]),
    b = renderShotLayer(1, s.from + 1, now - starts[s.from + 1]);
  resetT(c);
  c.drawImage(a, 0, 0, W, H);
  const matte = mediumMatte(c, s.kind, p);
  c.save();
  c.clip(matte);
  c.drawImage(b, 0, 0, W, H);
  c.restore();
  if (s.kind === "fire") {
    c.save();
    c.globalAlpha = Math.sin(p * Math.PI) * 0.9;
    c.strokeStyle = "#e36b31";
    c.lineWidth = 18;
    c.stroke(matte);
    c.strokeStyle = "#fbc95b";
    c.lineWidth = 7;
    c.stroke(matte);
    c.restore();
  }
  // The dry flecks belong to the passing gust, fixed in space instead of random per frame.
  if (s.kind === "sand")
    for (let i = 0; i < 120; i++) {
      const life = sm(0.06, 0.3, p) * (1 - sm(0.7, 1, p));
      const x = hash(i, 45) * W - (p - 0.5) * 340,
        y = hash(i, 46) * H;
      artLine(
        c,
        [
          [x, y],
          [x + 5 + hash(i, 49) * 8, y - 3],
        ],
        { w: 1.8, col: "#242323", al: life * 0.5, seed: i },
      );
    }
}
TIMELINE.forEach((s, i) => (s.fn = (c, t) => continuousShot(i, c, t)));
defineFilm({
  palette: { ...PALETTES.pencilMinimal, paper: C.paper },
  format: { ar: "16:9", width: 1920 },
  fps: 24,
  timeline: TIMELINE,
  score,
});
