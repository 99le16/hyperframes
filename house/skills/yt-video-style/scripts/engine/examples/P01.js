L.scene({ bg: "aurora" });
L.pipHole();
const C = L.chartWin({ t: 0.0, grow: 1.4, candles: L.walk(70, 21, 100, 1.1, 0.05) });
const ox = 38,
  oy = 131 + 54,
  Y = L.Y;
L.tw({
  x: 90,
  y: 58,
  size: 50,
  lines: [
    [
      { t: "Parte ", at: 0.1 },
      { hl: "DIGITAL", at: 0.4 },
    ],
  ],
});
const tp = L.at("patrones");
[
  [12, 20],
  [44, 52],
].forEach(([a, b], k) => {
  const ys = C.c.slice(a, b + 1),
    hi = Math.max(...ys.map((c) => c.h)),
    lo = Math.min(...ys.map((c) => c.l));
  L.drawLine(
    C.g,
    [
      [C.X(a) - 14, C.Y(hi) - 14],
      [C.X(b) + 14, C.Y(hi) - 14],
      [C.X(b) + 14, C.Y(lo) + 14],
      [C.X(a) - 14, C.Y(lo) + 14],
      [C.X(a) - 14, C.Y(hi) - 14],
    ],
    tp + 0.2 + k * 0.5,
    0.6,
    { color: Y, width: 5 },
  );
  L.pill({
    x: ox + C.X(a) - 10,
    y: oy + C.Y(hi) - 72,
    text: "Patrón",
    color: Y,
    fg: "#151515",
    t: tp + 0.45 + k * 0.5,
    size: 26,
  });
});
L.tw({
  x: 120,
  y: 958,
  size: 46,
  lines: [
    [
      { t: "que se ", at: L.at("repitan") - 0.4 },
      { hl: "REPITEN", at: L.at("repitan") },
    ],
  ],
  out: L.at("normas"),
});
const ta = L.at("arriesgar");
L.card({
  x: 1010,
  y: 690,
  w: 360,
  h: 210,
  color: "gold",
  glow: "tr",
  t: ta - 0.15,
  strength: 0.6,
  style: "pop",
  html: `<div class="hvs" style="position:absolute;left:28px;top:26px;font-size:30px;color:rgba(255,255,255,.8)">Riesgo por operación</div>
         <div class="hv" style="position:absolute;left:26px;top:78px;font-size:110px;color:${Y}">1 %</div>`,
});
const tl = L.at("perder"),
  sy = C.Y(Math.min(...C.c.slice(55).map((c) => c.l)) - 0.6);
L.drawLine(
  C.g,
  [
    [30, sy],
    [C.X(69) + 20, sy],
  ],
  tl,
  0.5,
  { color: "#ff4d5e", width: 4 },
);
L.pill({
  x: ox + 60,
  y: oy + sy - 56,
  text: "Stop loss",
  color: "#ff4d5e",
  t: tl + 0.25,
  size: 26,
});
const tf = L.at("futuro");
L.tw({
  x: 120,
  y: 958,
  size: 46,
  lines: [
    [
      { t: "el precio ", at: tf - 0.5 },
      { hl: "FUTURO", at: tf },
    ],
  ],
});
// dynamic: punch into the chart on each beat, shake on "perder"
[
  [tp, 1.04],
  [ta, 1.06],
  [tl, 1.07],
  [tf, 1.03],
].forEach(([t, s]) => L.punch(t, s, 735, 540, 0.2));
L.shake(tl + 0.1, 7, 0.3);
L.camera(
  [
    [0, [1.06, 0, 30]],
    [1.2, [1, 0, 0]],
    [L.dur, [1.02, 0, 0]],
  ],
  L.ease.inOutCubic,
);
